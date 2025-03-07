import type { Emitter } from 'nanoevents'
import type { Storage } from 'unstorage'
import type { VirtualFileSystemFileEvent, VirtualFileSystemFileEventContext, VirtualFileSystemLayer } from './layer'
import { createNanoEvents } from 'nanoevents'
import { createVfsLayer } from './layer'

export interface VirtualFileSystemHostEvents {
  'layer:add': (context: {
    host: VirtualFileSystemHost
    layer: VirtualFileSystemLayer
    index: number
  }) => void
  'layer:remove': (context: {
    host: VirtualFileSystemHost
    layer: VirtualFileSystemLayer
  }) => void
  /**
   * File in a layer has been updated
   */
  'layer:file:update': (context: VirtualFileSystemFileEventContext & { host: VirtualFileSystemHost }) => void
  /**
   * File in the host has been updated (the highest priority layer)
   */
  'file:update': (context: VirtualFileSystemFileEventContext & { host: VirtualFileSystemHost }) => void
}

export function createVfsHost(): VirtualFileSystemHost {
  return new VirtualFileSystemHost()
}

export class VirtualFileSystemHost {
  private _layerUnwatch: WeakMap<VirtualFileSystemLayer, () => void> = new WeakMap()
  public events: Emitter<VirtualFileSystemHostEvents> = createNanoEvents()
  public layers: VirtualFileSystemLayer[] = []

  createLayer(name: string, storage?: Storage, order: 'pre' | 'post' | number = 'pre'): VirtualFileSystemLayer {
    const layer = createVfsLayer(name, storage)
    this.addLayer(layer, order)
    return layer
  }

  async addLayer(
    layer: VirtualFileSystemLayer,
    order: 'pre' | 'post' | number = 'pre',
  ): Promise<() => void> {
    if (typeof order === 'number') {
      order = Math.max(0, Math.min(this.layers.length, order))
      this.layers.splice(order, 0, layer)
    }
    else if (order === 'pre') {
      this.layers.unshift(layer)
    }
    else {
      this.layers.push(layer)
    }
    const index = this.layers.indexOf(layer)
    this.events.emit('layer:add', {
      host: this,
      layer,
      index,
    })
    for (const file of await layer.listFiles()) {
      this.triggerUpdate(file, 'mount', layer)
    }
    const unwatch = layer.events.on('file:update', (ctx) => {
      this.triggerUpdate(ctx.id, ctx.event, ctx.layer, ctx.content)
    })
    this._layerUnwatch.set(layer, unwatch)
    return () => this.removeLayer(layer)
  }

  async readFile(path: string): Promise<{
    content: string
    layer: VirtualFileSystemLayer
    mtime?: Date
  } | undefined> {
    for (const layer of this.layers) {
      const content = await layer.readFile(path)
      if (content != null) {
        const meta = await layer.readFileMeta(path)
        return { content, layer, mtime: meta?.mtime }
      }
    }
    return undefined
  }

  async listFiles(): Promise<{ id: string, layer: VirtualFileSystemLayer }[]> {
    const layerFiles = await Promise.all(
      this.layers.map(async (layer) => {
        return { layer, files: await layer.listFiles() }
      }),
    )
    const allFiles = new Set<string>(layerFiles.flatMap(({ files }) => files))

    return Array.from(allFiles)
      .map(id => ({
        id,
        layer: layerFiles.find(l => l.files.includes(id))!.layer!,
      }))
  }

  async triggerUpdate(
    id: string,
    event: VirtualFileSystemFileEvent,
    layer: VirtualFileSystemLayer,
    content?: string,
  ): Promise<void> {
    this.events.emit('layer:file:update', {
      host: this,
      id,
      event,
      layer,
      content,
    })

    const r = await this.readFile(id)
    // If the changeed file is on the top layer
    let shouldEmit = false
    if (event === 'remove')
      shouldEmit = r?.layer !== layer
    else
      shouldEmit = r?.layer === layer

    if (shouldEmit) {
      this.events.emit('file:update', {
        host: this,
        id,
        event: r ? 'update' : 'remove',
        layer: r?.layer || layer,
        content: r?.content,
      })
    }
  }

  async removeLayer(layer: VirtualFileSystemLayer): Promise<void> {
    const index = this.layers.indexOf(layer)
    if (index === -1)
      return

    this._layerUnwatch.get(layer)?.()
    this._layerUnwatch.delete(layer)

    this.layers.splice(index, 1)
    this.events.emit('layer:remove', {
      host: this,
      layer,
    })

    for (const file of await layer.listFiles()) {
      this.triggerUpdate(file, 'remove', layer)
    }
  }

  dispose(): void {
    this.layers.forEach(r => r.dispose())
    this.layers.length = 0
    Object.keys(this.events.events).forEach((key) => {
      this.events.events[key as keyof VirtualFileSystemHostEvents] = undefined
    })
  }

  [Symbol.dispose](): void {
    this.dispose()
  }
}
