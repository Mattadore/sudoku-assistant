import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      helper: path.resolve(__dirname, 'src/helper.tsx'),
      components: path.resolve(__dirname, 'src/components'),
      external: path.resolve(__dirname, 'src/external'),
      'solver-extensions': path.resolve(__dirname, 'src/solver-extensions'),
    },
  },
})
