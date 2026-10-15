/* eslint-env node */
'use strict';

/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['../../.eslintrc.cjs'],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['node_modules', 'dist', 'coverage'],
};