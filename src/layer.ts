import type { Emitter } from 'nanoevents'
import type { Storage, StorageMeta } from 'unstorage'
import { createNanoEvents } from 'nanoevents'
import { toText } from 'undio'

export type VirtualFileSystemFileEvent = 'mount' | 'update' | 'remove'

export interface VirtualFileSystemFileEventContext {
  layer: VirtualFileSystemLayer
  file: string
  content?: string
  event: VirtualFileSystemFileEvent
}

export interface VirtualFileSystemLayerEvents {
  'file:update': (context: VirtualFileSystemFileEventContext) => void
}

function storageKeyToPath(key: string): string {
  return key.replace(/:/g, '/')
}

export class VirtualFileSystemLayer {
  events: Emitter<VirtualFileSystemLayerEvents> = createNanoEvents()
  private _disposables: (() => void)[] = []

  constructor(
    public name: string,
    public storage: Storage,
  ) {
    storage.watch((event, key) => {
      // ignore meta events
      if (key.endsWith('$'))
        return
      this.events.emit('file:update', {
        layer: this,
        file: storageKeyToPath(key),
        event,
      })
    })
      .then(stop => this._disposables.push(stop))
  }

  async exists(path: string): Promise<boolean> {
    return await this.storage.hasItem(path)
  }

  async readFile(path: string): Promise<string | undefined> {
    const buffer = await this.storage.getItemRaw(path)
    if (buffer == null)
      return
    return toText(buffer)
  }

  async listFiles(): Promise<string[]> {
    return (await this.storage.getKeys()).map(storageKeyToPath)
  }

  async readFileMeta(path: string): Promise<StorageMeta | undefined> {
    return await this.storage.getMeta(path)
  }

  async writeFile(path: string, content: string, mtime = new Date()): Promise<void> {
    await this.storage.setItemRaw(path, content)
    await this.storage.setMeta(path, {
      mtime,
    })
    this.events.emit('file:update', {
      layer: this,
      file: path,
      content,
      event: 'update',
    })
  }

  async deleteFile(path: string): Promise<void> {
    await this.storage.removeItem(path, { removeMeta: true })
    this.events.emit('file:update', {
      layer: this,
      file: path,
      event: 'remove',
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
