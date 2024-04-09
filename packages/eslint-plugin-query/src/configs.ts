import type { ESLintUtils } from '@typescript-eslint/utils'

export function generateRecommendedConfig(
  allRules: Record<
    string,
    ESLintUtils.RuleModule<
      string,
      ReadonlyArray<unknown>,
      ESLintUtils.RuleListener
    >
  >,
) {
  return Object.entries(allRules).reduce(
    // @ts-expect-error
    (memo, [name, rule]) => {
      const { recommended } = rule.meta.docs || {}

      return {
        ...memo,
        ...(recommended ? { [`@tanstack/query/${name}`]: recommended } : {}),
      }
    },
    {} as Record<string, 'strict' | 'error' | 'warn'>,
  )
}
