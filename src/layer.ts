import type { Emitter } from 'nanoevents'
import type { Storage, StorageMeta } from 'unstorage'
import { createNanoEvents } from 'nanoevents'
import { toText } from 'undio'
import { createStorage } from 'unstorage'
import driverMemory from 'unstorage/drivers/memory'

export type VirtualFileSystemFileEvent = 'mount' | 'update' | 'remove'

export interface VirtualFileSystemFileEventContext {
  layer: VirtualFileSystemLayer
  id: string
  content?: string
  event: VirtualFileSystemFileEvent
}

export interface VirtualFileSystemLayerEvents {
  'file:update': (context: VirtualFileSystemFileEventContext) => void
}

function storageKeyToPath(key: string): string {
  return key.replace(/:/g, '/')
}

export function createVfsLayer(
  name: string,
  storage: Storage = createStorage({ driver: driverMemory() }),
): VirtualFileSystemLayer {
  return new VirtualFileSystemLayer(name, storage)
}

export class VirtualFileSystemLayer {
  events: Emitter<VirtualFileSystemLayerEvents> = createNanoEvents()
  private _disposables: (() => void)[] = []

  constructor(
    public name: string,
    public storage: Storage = createStorage({ driver: driverMemory() }),
  ) {
    // storage.watch((event, key) => {
    //   // ignore meta events
    //   if (key.endsWith('$'))
    //     return
    //   this.events.emit('file:update', {
    //     layer: this,
    //     id: storageKeyToPath(key),
    //     event,
    //   })
    // })
    //   .then(stop => this._disposables.push(stop))
  }

  async exists(id: string): Promise<boolean> {
    return await this.storage.hasItem(id)
  }

  async readFile(id: string): Promise<string | undefined> {
    const buffer = await this.storage.getItemRaw(id)
    if (buffer == null)
      return
    return toText(buffer)
  }

  async listFiles(): Promise<string[]> {
    return (await this.storage.getKeys()).map(storageKeyToPath)
  }

  async readFileMeta(id: string): Promise<StorageMeta | undefined> {
    return await this.storage.getMeta(id)
  }

  async writeFile(id: string, content: string, mtime = new Date()): Promise<void> {
    await this.storage.setItemRaw(id, content)
    await this.storage.setMeta(id, {
      mtime,
    })
    this.triggerUpdate(id, 'update', content)
  }

  async deleteFile(id: string): Promise<void> {
    await this.storage.removeItem(id, { removeMeta: true })
    this.triggerUpdate(id, 'remove')
  }

  triggerUpdate(id: string, event: VirtualFileSystemFileEvent, content?: string): void {
    this.events.emit('file:update', {
      layer: this,
      id,
      event,
      content,
    })
  }

  dispose(): void {
    this._disposables.forEach(r => r())
    this._disposables.length = 0
    Object.keys(this.events.events).forEach((key) => {
      this.events.events[key as keyof VirtualFileSystemLayerEvents] = undefined
    })
  }

  [Symbol.dispose](): void {
    this.dispose()
  }
}
