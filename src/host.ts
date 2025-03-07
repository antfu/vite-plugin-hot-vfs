import type { Emitter } from 'nanoevents'
import type { VirtualFileSystemFileEventContext, VirtualFileSystemLayer } from './layer'
import { createNanoEvents } from 'nanoevents'

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
  'file:update': (context: VirtualFileSystemFileEventContext & { host: VirtualFileSystemHost }) => void
}

export class VirtualFileSystemHost {
  private _layerUnwatch: WeakMap<VirtualFileSystemLayer, () => void> = new WeakMap()
  public events: Emitter<VirtualFileSystemHostEvents> = createNanoEvents()
  public layers: VirtualFileSystemLayer[] = []

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
    for (const key of await layer.listFiles()) {
      this.events.emit('file:update', {
        host: this,
        file: key,
        event: 'mount',
        layer,
      })
    }
    const unwatch = layer.events.on('file:update', (ctx) => {
      this.events.emit('file:update', { host: this, ...ctx })
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

  removeLayer(layer: VirtualFileSystemLayer): void {
    this._layerUnwatch.get(layer)?.()
    this.layers = this.layers.filter(r => r !== layer)
    this.events.emit('layer:remove', {
      host: this,
      layer,
    })
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
