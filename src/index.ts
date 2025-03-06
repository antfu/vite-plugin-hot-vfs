import type { Storage } from 'unstorage'
import type { EnvironmentModuleNode, Plugin } from 'vite'
import { join } from 'node:path'
import process from 'node:process'
import { normalize, relative } from 'pathe'
import { toText } from 'undio'

export interface VitePluginHotVfsOptions {
  vfsLayers?: Storage[]
}

export function VitePluginHotVfs(options?: VitePluginHotVfsOptions): Plugin {
  let root = normalize(process.cwd())

  const vfs = options?.vfsLayers ?? []
  const pendingUpdates: Set<EnvironmentModuleNode> = new Set()

  return {
    name: 'vite-plugin-hot-vfs',
    enforce: 'pre',
    hotUpdate({ modules }) {
      const mod = [...pendingUpdates, ...modules]
      pendingUpdates.clear()
      return mod
    },
    configureServer(server) {
      for (const layer of vfs) {
        layer.watch(async (event, key) => {
          const file = join(root, key.replace(/:/g, '/'))
          for (const env of Object.values(server.environments)) {
            const mods = env.moduleGraph.getModulesByFile(file) || []
            for (const mod of mods) {
              env.moduleGraph.invalidateModule(mod)
              pendingUpdates.add(mod)
              server.watcher.emit('change', mod.id)
            }
          }
        })
      }
    },
    configResolved(config) {
      root = normalize(config.root)
    },
    load: {
      order: 'pre',
      async handler(id) {
        if (!id.startsWith(root))
          return
        const path = relative(root, id)
        for (const layer of vfs) {
          const content = await layer.getItemRaw(path)
          let i = 0
          setInterval(() => {
            layer.setItemRaw('src/App.vue', `<template><div>Hijacked ${i++}</div></template>`)
          }, 1000)
          if (content != null) {
            return toText(content)
          }
        }
      },
    },
  }
}
