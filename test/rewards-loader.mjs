// Loader for the rewards unit specs.
//
// `rewards.js` imports the Vuex store, the hub axios instance, the chipnet
// helpers, and — through `shared.js` — the subscription and denomination
// helpers. Map those to the small, mutable stand-ins in `test/mocks` so the
// request wrappers run under Node without booting the app runtime. The `src/`
// alias and extensionless relative imports are left to the other loaders in
// `.mocharc.cjs`.

const dataModule = source => (
  `data:text/javascript,${encodeURIComponent(source)}`
)

const SUBSCRIPTION_STUB = dataModule(
  "export const LIFT_TOKEN_CATEGORY = '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'\n" +
  'export const LIFT_TOKEN_DECIMALS = 2'
)

const MODULE_STUBS = {
  'src/store': new URL('./mocks/store.mjs', import.meta.url).href,
  'src/utils/engagementhub-utils/api': new URL('./mocks/engagementhub-api.mjs', import.meta.url).href,
  'src/wallet/chipnet': dataModule(
    'export function convertToTokenAmountWithDecimals () { return 0 }\n' +
    'export function convertCashAddress (address) { return address }'
  ),
  'src/utils/subscription-utils': SUBSCRIPTION_STUB,
  'src/boot/i18n': dataModule('export const i18n = {}'),
}

export async function resolve (specifier, context, nextResolve) {
  if (MODULE_STUBS[specifier]) {
    return { url: MODULE_STUBS[specifier], shortCircuit: true }
  }
  // `shared.js` imports the subscription module relatively, so the bare
  // specifier map above does not catch it.
  if (
    specifier === '../subscription-utils' &&
    context.parentURL?.includes('/src/utils/engagementhub-utils/')
  ) {
    return { url: SUBSCRIPTION_STUB, shortCircuit: true }
  }
  // The app is authored bundler-style with extensionless relative imports,
  // which Node ESM cannot resolve on its own.
  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    context.parentURL?.includes('/src/')
  ) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}
