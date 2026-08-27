import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@clearrights/sdk/privacy', replacement: path.resolve(import.meta.dirname, './packages/clearrights-sdk/src/privacy/index.ts') },
      { find: '@clearrights/sdk/accessibility', replacement: path.resolve(import.meta.dirname, './packages/clearrights-sdk/src/accessibility/index.ts') },
      { find: '@clearrights/sdk/site-guide', replacement: path.resolve(import.meta.dirname, './packages/clearrights-sdk/src/site-guide/index.ts') },
      { find: '@clearrights/sdk', replacement: path.resolve(import.meta.dirname, './packages/clearrights-sdk/src/index.ts') },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
