import Vue from '@vitejs/plugin-vue'
import { createStorage } from 'unstorage'
import driverMemory from 'unstorage/drivers/memory'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VirtualFileSystemHost, VirtualFileSystemLayer, VitePluginHotVirtualFileSystem } from '../../src'

const host = new VirtualFileSystemHost()
const layer = new VirtualFileSystemLayer(
  'hi',
  createStorage({ driver: driverMemory() }),
)
host.addLayer(layer)

export default defineConfig({
  plugins: [
    Vue(),
    VitePluginHotVirtualFileSystem(host),
    Inspect(),
    {
      name: 'a',
      configureServer(server) {
        server.ws.on('code1', (data) => {
          layer.writeFile('src/App.vue', data)
        })
        server.ws.on('code2', (data) => {
          layer.writeFile('src/random.ts', data)
        })
      },
    },
  ],
})
