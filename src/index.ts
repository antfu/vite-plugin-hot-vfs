import type { Storage } from 'unstorage'
import type { EnvironmentModuleNode, Plugin } from 'vite'
import { join } from 'node:path'
import process from 'node:process'
import { normalize, relative } from 'pathe'
import { toText } from 'undio'

export interface VitePluginHotVfsOptions {
  vfsLayers?: Storage[]
}

const rawRE = /(?:\?|&)raw(?:&|$)/

export function VitePluginHotVfs(options?: VitePluginHotVfsOptions): Plugin[] {
  let root = normalize(process.cwd())

  const vfs = options?.vfsLayers ?? []
  const pendingUpdates: Set<EnvironmentModuleNode> = new Set()
  const disposables: (() => void)[] = []

  return [
    {
      name: 'a',
      configureServer(server) {
        server.ws.on('hello', (data) => {
          vfs[0].setItemRaw('src/App.vue', data)
        })
      },
    },
    {
      name: 'vite-plugin-hot-vfs-update',
      enforce: 'post',
      hotUpdate({ modules }) {
        const mod = [...pendingUpdates, ...modules]
        pendingUpdates.clear()
        return mod
      },
    },
    {
      name: 'vite-plugin-hot-vfs',
      enforce: 'pre',
      configureServer(server) {
        for (const layer of vfs) {
          const watcher = layer.watch(async (event, key) => {
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

          watcher.then((r) => {
            disposables.push(r)
          })
        }
      },
      buildStart() {
        disposables.forEach(r => r())
        disposables.length = 0
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
            const buffer = await layer.getItemRaw(path)
            if (buffer == null)
              continue

            const text = toText(buffer)
            if (rawRE.test(id))
              return `export default ${JSON.stringify(text)}`
            else
              return text
          }
        },
      },
    },
  ]
}
