import { describe, expect, it } from 'vitest'
import plugin from '../'

describe('configs', () => {
  it('should match snapshot', () => {
    expect(plugin.configs.recommended).toMatchInlineSnapshot(`
      {
        "plugins": [
          "@tanstack/eslint-plugin-query",
        ],
        "rules": {
          "@tanstack/query/exhaustive-deps": "error",
          "@tanstack/query/no-rest-destructuring": "warn",
          "@tanstack/query/stable-query-client": "error",
        },
      }
    `)
  })
})
