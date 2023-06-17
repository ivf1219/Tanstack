// @ts-check

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['cjs', 'esm'],
  target: ['es2020', 'node16'],
  outDir: 'build/lib',
  bundle: false,
  splitting: false,
  sourcemap: true,
  clean: true,
})
