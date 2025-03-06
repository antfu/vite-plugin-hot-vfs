import Vue from '@vitejs/plugin-vue'
import { createStorage } from 'unstorage'
import driverMemory from 'unstorage/drivers/memory'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { VitePluginHotVfs } from '../../src/index'

const vfs = createStorage({
  driver: driverMemory(),
})

export default defineConfig({
  plugins: [
    Vue(),
    VitePluginHotVfs({
      vfsLayers: [
        vfs,
      ],
    }),
    Inspect(),
  ],
})
