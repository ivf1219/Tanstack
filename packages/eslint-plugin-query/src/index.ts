import { generateRecommendedConfig } from './configs'
import { rules } from './rules'
import { name as packageName, version as packageVersion } from '../package.json'

type Configs = Record<'recommended' | 'flat/recommended', any>

const plugin = {
  meta: { name: packageName, version: packageVersion },
  configs: {} as Configs,
  rules: rules as Record<string, any>,
}

plugin.configs = {
  recommended: {
    plugins: ['@tanstack/eslint-plugin-query'],
    rules: generateRecommendedConfig(rules),
  },
  'flat/recommended': {
    plugins: { plugin },
    rules: generateRecommendedConfig(rules),
  },
}

export default plugin
