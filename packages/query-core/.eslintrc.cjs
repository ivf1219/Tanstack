// @ts-check

/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ['../../.eslintrc.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.eslint.json',
    sourceType: 'module',
  },
}

module.exports = config
