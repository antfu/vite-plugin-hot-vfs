import type { EnvironmentModuleNode, Plugin } from 'vite'
import process from 'node:process'
import { join, normalize, relative } from 'pathe'
import { VirtualFileSystemHost } from './host'

const rawRE = /(?:\?|&)raw(?:&|$)/

export function VitePluginHotVirtualFileSystem(host: VirtualFileSystemHost = new VirtualFileSystemHost()): Plugin[] {
  let root = normalize(process.cwd())

  const pendingUpdates: Set<EnvironmentModuleNode> = new Set()
  const disposables: (() => void)[] = []

  return [
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
        host.events.on('file:update', (event) => {
          const filepath = join(root, event.file)
          for (const env of Object.values(server.environments)) {
            const mods = env.moduleGraph.getModulesByFile(filepath) || []
            for (const mod of mods) {
              env.moduleGraph.invalidateModule(mod)
              pendingUpdates.add(mod)
              server.watcher.emit('change', mod.id)
            }
          }
        })
      },
      buildEnd() {
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
          const path = relative(root, id).replace(/\?.*$/, '')
          const file = await host.readFile(path)
          if (!file)
            return
          const content = file.content
          if (rawRE.test(id))
            return `export default ${JSON.stringify(content)}`
          else
            return content
        },
      },
      api: {
        getHost() {
          return host
        },
      },
    },
  ]
}
