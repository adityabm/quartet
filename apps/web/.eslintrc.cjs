module.exports = {
  root: true,
  extends: ['../../.eslintrc.cjs'],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  ignorePatterns: ['node_modules', 'dist'],
};