// @ts-check

import { defineConfig } from 'rollup'
import { buildConfigs } from '../../scripts/getRollupConfig.mjs'

export default defineConfig(
  buildConfigs({
    name: 'react-query-persist-client',
    outputFile: 'index',
    entryFile: './src/index.ts',
  }),
)
