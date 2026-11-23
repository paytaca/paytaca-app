// Loader for the Elite Program unit specs.
//
// `elite-program.js` and `lookup-key.js` import the Vuex store, the Watchtower
// client, axios, and the hub URL at module load. Map those to the small,
// mutable stand-ins in `test/mocks` so the pure logic runs under Node without
// booting the app runtime. The `src/` alias and extensionless relative imports
// are left to the other loaders in `.mocharc.cjs`.

const dataModule = source => (
  `data:text/javascript,${encodeURIComponent(source)}`
)

const MODULE_STUBS = {
  'src/store': new URL('./mocks/store.mjs', import.meta.url).href,
  'capacitor-secure-storage-plugin': new URL('./mocks/secure-storage.mjs', import.meta.url).href,
  'src/wallet/pos': new URL('./mocks/pos.mjs', import.meta.url).href,
  'src/utils/engagementhub-utils/api': new URL('./mocks/engagementhub-api.mjs', import.meta.url).href,
  'src/utils/wallet-storage': new URL('./mocks/wallet-storage.mjs', import.meta.url).href,
  // `elite-program.js` imports the LIFT category from here; the retry spec
  // never reads it, so avoid pulling in watchtower-cash-js. `shared.js` also
  // reads the decimals, so keep both exports for the other specs.
  'src/utils/subscription-utils': dataModule(
    "export const LIFT_TOKEN_CATEGORY = '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'\n" +
    'export const LIFT_TOKEN_DECIMALS = 2'
  ),
  // `display-rates.js` -> `denomination-utils.js` touches these at load.
  'src/boot/i18n': dataModule('export const i18n = {}'),
  'src/wallet/chipnet': dataModule(
    'export function convertToTokenAmountWithDecimals () { return 0 }\n' +
    'export function convertCashAddress (address) { return address }'
  ),
}

export async function resolve (specifier, context, nextResolve) {
  if (MODULE_STUBS[specifier]) {
    return { url: MODULE_STUBS[specifier], shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
