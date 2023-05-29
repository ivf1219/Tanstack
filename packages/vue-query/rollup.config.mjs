// @ts-check

import { defineConfig } from 'rollup'
import { buildConfigs } from '../../scripts/getRollupConfig.mjs'

export default defineConfig(
  buildConfigs({
    name: 'vue-query',
    packageDir: '.',
    jsName: 'VueQuery',
    outputFile: 'index',
    entryFile: 'src/index.ts',
    globals: {
      '@tanstack/query-core': 'QueryCore',
      vue: 'Vue',
      'vue-demi': 'Vue',
      '@tanstack/match-sorter-utils': 'MatchSorter',
      '@vue/devtools-api': 'DevtoolsApi',
    },
    bundleUMDGlobals: [
      '@tanstack/query-core',
      '@tanstack/match-sorter-utils',
      '@vue/devtools-api',
    ],
  }),
)
