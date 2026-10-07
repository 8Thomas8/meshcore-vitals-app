// @ts-check
import sonarjs from 'eslint-plugin-sonarjs'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  sonarjs.configs.recommended,
  {
    rules: {
      'sonarjs/no-nested-conditional': 'off',
      'sonarjs/no-nested-template-literals': 'off'
    }
  },
  {
    files: ['test/**'],
    rules: {
      'sonarjs/no-floating-point-equality': 'off'
    }
  }
)
