import preactFramework from '@adwd/inertia-preact/vite'
import inertia from '@inertiajs/vite'
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  plugins: [
    inertia({
      frameworks: preactFramework,
      ssr: {
        port: 13719,
      },
    }),
    preact({ reactAliasesEnabled: false }),
  ],
})
