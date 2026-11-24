import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import pluginQuasar from '@quasar/app-webpack/eslint'

// the following is optional, if you want prettier too:
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    /**
     * Ignore the following files.
     * Please note that pluginQuasar.configs.recommended() already ignores
     * the "node_modules" folder for you (and all other Quasar project
     * relevant folders and files).
     *
     * ESLint requires "ignores" key to be the only one in this object
     */
    ignores: [
      '/dist',
      '/src-bex/www',
      '/src-capacitor',
      '/src-cordova',
      '/.quasar',
      '/node_modules',
      // the only <script lang="ts"> component; linting it needs a TypeScript parser
      'src/pages/sign/transaction.vue',
    ]
  },

  ...pluginQuasar.configs.recommended(),
  js.configs.recommended,

  /**
   * https://eslint.vuejs.org
   *
   * pluginVue.configs.base
   *   -> Settings and rules to enable correct ESLint parsing.
   * pluginVue.configs[ 'flat/essential']
   *   -> base, plus rules to prevent errors or unintended behavior.
   * pluginVue.configs["flat/strongly-recommended"]
   *   -> Above, plus rules to considerably improve code readability and/or dev experience.
   * pluginVue.configs["flat/recommended"]
   *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
   */
  ...pluginVue.configs[ 'flat/essential' ],

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.browser,
        ...globals.node, // SSR, config files
        process: 'readonly', // process.env.*
        ga: 'readonly', // Google Analytics
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly', // BEX related
        browser: 'readonly' // BEX related
      }
    },

    // add your custom rules here
    rules: {
      'prefer-promise-reject-errors': 'off',

      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'no-async-promise-executor': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'off',
      'getter-return': ['error', { allowImplicit: true }],
      'vue/return-in-computed-property': 'warn',
      'no-useless-catch': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-components': 'warn',
      'vue/no-unused-vars': 'warn',
      'vue/no-reserved-keys': 'warn',
      'vue/no-mutating-props': 'warn',
      'vue/no-side-effects-in-computed-properties': 'warn',
      'vue/require-toggle-inside-transition': 'warn',

      // allow debugger during development only
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    }
  },

  {
    files: [ 'src/boot/leaflet.js' ],
    languageOptions: {
      globals: {
        L: 'readonly'
      }
    }
  },

  {
    files: [
      'src/components/card/TerminalList.vue',
      'src/components/card/manageAuthNFTs.vue',
      'src/pages/apps/card/auth-nfts.vue',
    ],
    rules: {
      'no-undef': 'warn'
    }
  },

  {
    files: [ 'src/lib/watchtower/index.js' ],
    rules: {
      'no-dupe-class-members': 'warn'
    }
  },

  {
    files: [ 'test/**/*.spec.{js,mjs}' ],
    languageOptions: {
      globals: {
        ...globals.mocha
      }
    }
  },

  {
    files: [ 'src-pwa/custom-service-worker.js' ],
    languageOptions: {
      globals: {
        ...globals.serviceworker
      }
    }
  },

  prettierSkipFormatting // optional, if you want prettier
]