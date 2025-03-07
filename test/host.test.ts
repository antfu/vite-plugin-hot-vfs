import { createStorage } from 'unstorage'
import driverMemory from 'unstorage/drivers/memory'
import { describe, expect, it, vi } from 'vitest'
import { VirtualFileSystemHost } from '../src/host'
import { VirtualFileSystemLayer } from '../src/layer'

describe('virtualFileSystemHost', () => {
  it('should work', async () => {
    const host = new VirtualFileSystemHost()
    const layer = new VirtualFileSystemLayer(
      'hi',
      createStorage({ driver: driverMemory() }),
    )
    host.addLayer(layer)

    const listener = vi.fn()
    host.events.on('file:update', listener)

    expect(await host.readFile('src/App.vue')).toBeUndefined()

    await layer.writeFile('src/App.vue', 'some content')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(listener).toHaveBeenCalledWith({
      host,
      event: 'update',
      file: 'src/App.vue',
      content: 'some content',
      layer,
    })

    expect(await host.readFile('src/App.vue')).toMatchObject({
      content: 'some content',
      layer,
    })

    expect(await layer.listFiles())
      .toMatchInlineSnapshot(`
        [
          "src/App.vue",
        ]
      `)
  })
})
