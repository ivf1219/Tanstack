// @ts-check

import { defineConfig } from 'rollup'
import { buildConfigs } from '../../scripts/getRollupConfig.mjs'

export default defineConfig(
  buildConfigs({
    name: 'vue-query',
    outputFile: 'index',
    entryFile: './src/index.ts',
  }),
)
