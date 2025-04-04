# vite-plugin-hot-vfs

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Vite plugin for mounting virtual file system with HMR.

Not only for virtual modules, this plugin is also able to mount virtual file system to any path and take over the content. Which would allow you to try code changes without actually writing to the file system, or even start an app from a zip/tarball or even remote urls.

This plugin is also designed to work with multi-layer virtual file systems with fallback mechanism. And would allow you to inert vfs layers or remove them anytime.

> [!WARNING]
> Working in progress

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/vite-plugin-hot-vfs?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/vite-plugin-hot-vfs
[npm-downloads-src]: https://img.shields.io/npm/dm/vite-plugin-hot-vfs?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/vite-plugin-hot-vfs
[bundle-src]: https://img.shields.io/bundlephobia/minzip/vite-plugin-hot-vfs?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=vite-plugin-hot-vfs
[license-src]: https://img.shields.io/github/license/antfu/vite-plugin-hot-vfs.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/vite-plugin-hot-vfs/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/vite-plugin-hot-vfs
