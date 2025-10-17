/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://quasar.dev/quasar-cli/quasar-conf-js
/* eslint-env node */

// Added for Quasar v1 to v2 migration
// const ESLintPlugin = require('eslint-webpack-plugin')

// Updated @quasar/app-webpack from 3.x.x to 4.x.x to support bex manifest v3
// https://quasar.dev/quasar-cli-webpack/upgrade-guide
const { defineConfig } = require('#q-app/wrappers')
const TerserPlugin = require('terser-webpack-plugin');


module.exports = defineConfig((ctx) => {
  return {
    // https://quasar.dev/quasar-cli/supporting-ts
    supportTS: {
      tsCheckerConfig: {
        typescript: {
          memoryLimit: 8000
        }
      },
    },

    // https://quasar.dev/quasar-cli/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://quasar.dev/quasar-cli/boot-files
    boot: [
      'vuex', // import first
      'capacitor',
      'i18n',
      'axios',
      'leaflet',
      'push-notifications',
      'qrcodecomponent',
      'qrcodereader',
      'clipboard',
      'footer',
      'gravatar',
      'websocket',
      'walletconnect',
      'confetti',
      'keyboard',
      'deep-link',
      'directives',
    ],

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: [
      'app.sass',
      'glassmorphic-blue.scss',
      'glassmorphic-red.scss',
      'glassmorphic-green.scss',
      'glassmorphic-gold.scss',
      'payhero.scss',
      'shared.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      'mdi-v5',
      'fontawesome-v5',
      'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
      'material-icons-outlined',
      'material-symbols-outlined'
    ],

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      vueRouterMode: 'hash', // available values: 'hash', 'history'

      devtool: 'eval-cheap-source-map',

      // Read environment variables from .env file
      env: require('dotenv').config().parsed,

      // transpile: false,

      // Add dependencies for transpiling with Babel (Array of string/regex)
      // (from node_modules, which are by default not transpiled).
      // Applies only if "transpile" is set to true.
      // transpileDependencies: [],

      // rtl: false, // https://quasar.dev/options/rtl-support
      preloadChunks: true,
      showProgress: false,
      gzip: true,
      brotli: true,
      // analyze: true,

      // Options below are automatically set depending on the env, set them if you want to override
      // extractCSS: false,

      // Manually added
      // https://quasar.dev/quasar-cli-webpack/upgrade-guide
      typescript: {
        strict: true, // (recommended) enables strict settings for TypeScript
        vueShim: true, // required when using ESLint with type-checked rules, will generate a shim file for `*.vue` files
        extendTsConfig (tsConfig) {
          // You can use this hook to extend tsConfig dynamically
          // For basic use cases, you can still update the usual tsconfig.json file to override some settings
        },
      },

      // https://quasar.dev/quasar-cli/handling-webpack
      extendWebpack (cfg) {
        // cfg.module.rules.push({
        //   enforce: 'pre',
        //   test: /\.(js|vue)$/,
        //   loader: 'eslint-loader',
        //   exclude: /node_modules/
        // })

        if (cfg?.output?.publicPath && !cfg?.output?.publicPath.endsWith('/')) {
          cfg.output.publicPath += '/'
        }

        cfg.module.rules.push({
          test: /\.cash$/, // Adjust the file extension as needed
          use: 'raw-loader'
        })

        // to support optional chaining for older android webviews
        // NOTE: this is only applies for build in capacitor,
        //       dev server in capacitor will not apply this plugin
        if (cfg?.output?.path?.endsWith('src-capacitor/www')) {
          cfg?.module?.rules?.push?.({
            test: /\.(?:js|mjs|cjs|vue)$/,
            enforce: 'post',
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: "defaults", modules: false }]
                ],
                plugins: [
                  '@babel/plugin-transform-optional-chaining',
                  '@babel/plugin-transform-nullish-coalescing-operator',
                  '@vue/babel-plugin-jsx',
                ]
              }
            }
          })
        }

        if (cfg.mode === 'production') {
          if (!cfg.optimization?.minimizer) {
            cfg.optimization.minimizer = []
          }

          const index = cfg.optimization.minimizer.findIndex((plugin) => {
            return plugin instanceof TerserPlugin
          })

          // not setting 'mangle: false' breaks bchjs, HdNode.toXPubKey()
          if (index >= 0) {
            cfg.optimization.minimizer[index].options.minimizer.options.mangle = false
          } else {
            // Add custom TerserPlugin options
            cfg.optimization.minimizer.push(new TerserPlugin({
              terserOptions: {
                compress: {
                  // Disable class renaming
                  keep_classnames: true,
                  keep_fnames: true,
                },
                mangle: false,
              },
            }))
          }
        }

        cfg.experiments = {
          topLevelAwait: true
        }
        // throw new Error(`MODE: ${cfg.mode}`)

        if (ctx?.mode?.bex) {
          cfg.devtool = 'source-map'
        }
      },

      chainWebpack (chain) {
        const nodePolyfillWebpackPlugin = require('node-polyfill-webpack-plugin')
        chain.plugin('node-polyfill').use(nodePolyfillWebpackPlugin)
        chain.resolve.alias.set('fs', require.resolve('browserfs'))

        // mainnet-js
        chain.resolve.alias.set('stream', require.resolve('stream-browserify')) // bip39
        chain.resolve.alias.set('crypto', require.resolve('crypto-browserify')) // bip39
        chain.resolve.alias.set('net', false) // electrum-cash tcp connections
        chain.resolve.alias.set('tls', false) // electrum-cash tcp connections
        chain.resolve.alias.set('fs', false)  // qrcode-svg.save

        // @mainnet-cash/contract
        chain.resolve.alias.set('url', false)   // cashscript/bitcoind-rpc
        chain.resolve.alias.set('https', false) // cashscript/bitcoind-rpc
        chain.resolve.alias.set('http', false)  // cashscript/bitcoind-rpc

        // @mainnet-cash/smartbch
        chain.resolve.alias.set('require-from-string', false)
        chain.resolve.alias.set('module', false)
        chain.resolve.alias.set('path', false)
        chain.resolve.alias.set('child_process', false)

        // Added for Quasar v1 to v2 migration
        // chain
        //   .plugin('eslint-webpack-plugin')
        //   .use(ESLintPlugin, [{ extensions: ['js', 'vue'] }])
      },

      // uglifyOptions: {
      //   compress: false,
      //   mangle: false
      // }
    },

    // Full list of options: https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      // Updated for Quasar v1 to v2 migration
      server: {
        type: 'http', // https | http
      },
      port: 9000,
      open: true // opens browser window automatically
    },

    // https://quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      // iconSet: 'mdi', // Quasar icon set

      // Updated for Quasar v1 to v2 migration. en-us -> en-US
      lang: 'en-US', // Quasar language pack
      config: {
        dark: true
      },

      // Possible values for "importStrategy":
      // * 'auto' - (DEFAULT) Auto-import needed Quasar components & directives
      // * 'all'  - Manually specify what to import
      importStrategy: 'auto',

      // For special cases outside of where "auto" importStrategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: [
        'Loading',
        'LocalStorage',
        'Notify',
        'Dialog'
      ],
      components: [
        'QBanner'
      ],
      cssAddon: true
    },

    // animations: 'all', // --- includes all animations
    // https://quasar.dev/options/animations
    animations: 'all',

    // https://quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {
      pwa: false
    },

    // https://quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {
      workboxPluginMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {}, // only for GenerateSW
      manifest: {
        name: 'Paytaca',
        short_name: 'Paytaca',
        description: 'Secure and convenient Bitcoin Cash wallet app',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
      backButtonExit: '/'
    },

    // Manually added: https://quasar.dev/quasar-cli-webpack/upgrade-guide#the-quasar-config-file
    bex: {
      extraScripts: [],
    },

    // Full list of options: https://quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      bundler: 'packager', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'paytaca'
      },

      // More info: https://quasar.dev/quasar-cli/developing-electron-apps/node-integration
      nodeIntegration: true,

      extendWebpack (/* cfg */) {
        // do something with Electron main process Webpack cfg
        // chainWebpack also available besides this extendWebpack
      }
    },

    // Manually added: https://quasar.dev/quasar-cli-webpack/upgrade-guide#the-quasar-config-file
    sourceFiles: {
      bexManifestFile: 'src-bex/manifest.json',
    }
  }
})
