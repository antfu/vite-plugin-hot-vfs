import type { Emitter, EventsMap } from 'nanoevents'
import type { Mock } from 'vitest'
import type { VirtualFileSystemHostEvents } from '../src/host'
import { createStorage } from 'unstorage'
import driverMemory from 'unstorage/drivers/memory'
import { describe, expect, it, vi } from 'vitest'
import { createVfsHost, VirtualFileSystemHost } from '../src/host'
import { VirtualFileSystemLayer } from '../src/layer'

describe('virtualFileSystemHost', () => {
  const HOST_EVENTS = ['file:update', 'layer:add', 'layer:remove', 'layer:file:update'] satisfies (keyof VirtualFileSystemHostEvents)[]

  function registerMockListener<T extends EventsMap>(emitter: Emitter<T>, events: (keyof T)[]) {
    const listeners: Record<keyof T, Mock> = {} as any
    for (const event of events) {
      listeners[event] = vi.fn()
      emitter.on(event, listeners[event] as any)
    }
    function clear() {
      for (const event of events) {
        listeners[event].mockClear()
      }
    }
    function getCalls(key: keyof T) {
      return listeners[key].mock.calls.map((x) => {
        const clone = { ...x[0] } as any
        delete clone.host
        if (clone.layer)
          clone.layer = clone.layer.name
        return clone
      })
    }
    function getAllCalls() {
      return Object.fromEntries(Object.keys(listeners).map(key => [key, getCalls(key)] as const))
    }
    return {
      listeners,
      getCalls,
      getAllCalls,
      clear,
    }
  }

  it('should work', async () => {
    const host = new VirtualFileSystemHost()
    const events = registerMockListener(host.events, HOST_EVENTS)

    const layer = new VirtualFileSystemLayer(
      'hi',
      createStorage({ driver: driverMemory() }),
    )
    host.addLayer(layer)

    expect(events.getAllCalls()).toMatchInlineSnapshot(`
      {
        "file:update": [],
        "layer:add": [
          {
            "index": 0,
            "layer": "hi",
          },
        ],
        "layer:file:update": [],
        "layer:remove": [],
      }
    `)
    events.clear()

    expect(await host.readFile('src/App.vue')).toBeUndefined()

    await layer.writeFile('src/App.vue', 'some content')
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(events.getAllCalls()).toMatchInlineSnapshot(`
      {
        "file:update": [
          {
            "content": "some content",
            "event": "update",
            "id": "src/App.vue",
            "layer": "hi",
          },
        ],
        "layer:add": [],
        "layer:file:update": [
          {
            "content": "some content",
            "event": "update",
            "id": "src/App.vue",
            "layer": "hi",
          },
        ],
        "layer:remove": [],
      }
    `)

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

  it('multiple layers', async () => {
    const host = createVfsHost()
    const events = registerMockListener(host.events, HOST_EVENTS)

    const layer1 = host.createLayer('layer1')
    const layer2 = host.createLayer('layer2')

    expect(events.getAllCalls()).toMatchInlineSnapshot(`
      {
        "file:update": [],
        "layer:add": [
          {
            "index": 0,
            "layer": "layer1",
          },
          {
            "index": 0,
            "layer": "layer2",
          },
        ],
        "layer:file:update": [],
        "layer:remove": [],
      }
    `)
    events.clear()

    // If we write layer2 before layer1, it the second action should not trigger 'file:update' event
    await layer2.writeFile('src/App.vue', 'content layer 2')
    await layer1.writeFile('src/App.vue', 'content layer 1')

    // New file for each layer
    await layer1.writeFile('src/App1.vue', 'content layer 1')
    await layer2.writeFile('src/App2.vue', 'content layer 2')

    expect(
      (await host.listFiles())
        .map(x => ({ id: x.id, layer: x.layer.name })),
    )
      .toMatchInlineSnapshot(`
        [
          {
            "id": "src/App.vue",
            "layer": "layer2",
          },
          {
            "id": "src/App2.vue",
            "layer": "layer2",
          },
          {
            "id": "src/App1.vue",
            "layer": "layer1",
          },
        ]
      `)

    expect(events.getAllCalls()).toMatchInlineSnapshot(`
      {
        "file:update": [
          {
            "content": "content layer 2",
            "event": "update",
            "id": "src/App.vue",
            "layer": "layer2",
          },
          {
            "content": "content layer 1",
            "event": "update",
            "id": "src/App1.vue",
            "layer": "layer1",
          },
          {
            "content": "content layer 2",
            "event": "update",
            "id": "src/App2.vue",
            "layer": "layer2",
          },
        ],
        "layer:add": [],
        "layer:file:update": [
          {
            "content": "content layer 2",
            "event": "update",
            "id": "src/App.vue",
            "layer": "layer2",
          },
          {
            "content": "content layer 1",
            "event": "update",
            "id": "src/App.vue",
            "layer": "layer1",
          },
          {
            "content": "content layer 1",
            "event": "update",
            "id": "src/App1.vue",
            "layer": "layer1",
          },
          {
            "content": "content layer 2",
            "event": "update",
            "id": "src/App2.vue",
            "layer": "layer2",
          },
        ],
        "layer:remove": [],
      }
    `)

    events.clear()

    // Remove layer2 should also trigger 'file:update' event
    await host.removeLayer(layer2)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(events.getAllCalls()).toMatchInlineSnapshot(`
      {
        "file:update": [
          {
            "content": undefined,
            "event": "remove",
            "id": "src/App2.vue",
            "layer": "layer2",
          },
          {
            "content": "content layer 1",
            "event": "update",
            "id": "src/App.vue",
            "layer": "layer1",
          },
        ],
        "layer:add": [],
        "layer:file:update": [
          {
            "content": undefined,
            "event": "remove",
            "id": "src/App.vue",
            "layer": "layer2",
          },
          {
            "content": undefined,
            "event": "remove",
            "id": "src/App2.vue",
            "layer": "layer2",
          },
        ],
        "layer:remove": [
          {
            "layer": "layer2",
          },
        ],
      }
    `)
  })
})
