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
  'src/utils/wallet-storage': new URL('./mocks/wallet-storage.mjs', import.meta.url).href,
  // `elite-program.js` imports the LIFT category from here; the retry spec
  // never reads it, so avoid pulling in watchtower-cash-js.
  'src/utils/subscription-utils': dataModule(
    "export const LIFT_TOKEN_CATEGORY = '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'"
  ),
  // `display-rates.js` -> `denomination-utils.js` touches these at load.
  // `phase3-loader.mjs` needs the same two stubs for the hub modules, so both
  // loaders point at one shared file: two different stubs would make the loader
  // order decide which shape a module sees.
  'src/boot/i18n': new URL('./mocks/hub-runtime.mjs', import.meta.url).href,
  'src/wallet/chipnet': new URL('./mocks/hub-runtime.mjs', import.meta.url).href,
}

// The elite specs replace `ELITEPROGRAM_URL` methods on the mock and require
// `elite-program.js` to import that same object. Scope the redirect to the two
// modules that need it instead of every importer: `lift-token.js` and
// `engagementhub-utils.js` import the real axios instances from `api.js`, and a
// global redirect would hide them.
const API_MOCK = new URL('./mocks/engagementhub-api.mjs', import.meta.url).href
const API_MOCK_PARENTS = ['/src/utils/engagementhub-utils/elite-program.js', '/src/wallet/lookup-key.js']

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'src/utils/engagementhub-utils/api') {
    const parent = (context.parentURL || '').replace(/^file:\/\//, '')
    if (API_MOCK_PARENTS.some((path) => parent.endsWith(path))) {
      return { url: API_MOCK, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  }
  if (MODULE_STUBS[specifier]) {
    return { url: MODULE_STUBS[specifier], shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
