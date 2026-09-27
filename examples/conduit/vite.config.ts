import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [preact({ reactAliasesEnabled: false })],
  build: isSsrBuild
    ? // The server, which renders the pages too
      { outDir: 'dist/server', copyPublicDir: false, target: 'node22' }
    : { outDir: 'dist/client', manifest: true, rollupOptions: { input: 'src/client.tsx' } },
}))
