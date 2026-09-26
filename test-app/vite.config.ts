import { resolve } from 'path'
import preactFramework from '@adwd/inertia-preact/vite'
import inertia from '@inertiajs/vite'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'
import testTools from './tools/vite'

const isSSR = process.argv.includes('--ssr')

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: !isSSR,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        unified: resolve(__dirname, 'index-unified.html'),
        auto: resolve(__dirname, 'index-auto.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  // No React aliases: neither the app nor the adapter may depend on preact/compat
  plugins: [inertia({ frameworks: preactFramework }), preact({ reactAliasesEnabled: false }), testTools()],
})
