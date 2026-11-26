// Loader for the Phase 3 signing specs.
//
// `engagementhub-utils.js` and `lift-token.js` are imported by real Vue call
// sites, so exercising their real functions (rather than a restatement of the
// interceptor) is what proves the call sites are signed. Both pull in code that
// only exists inside the app runtime — i18n boot, the Capacitor bridge, the
// LIFT contract artifact, and the Electrum provider behind `cashscript`. Map
// those to the smallest stand-ins that let the request-building code run under
// Node.
//
// The `src/` alias and extensionless relative imports are handled by the other
// loaders in `.mocharc.cjs`.

const dataModule = source => (
  `data:text/javascript,${encodeURIComponent(source)}`
)

const STUBS = {
  // `engagementhub-utils.js` reads `$t` at module scope and the notification
  // specs never assert on a label, so identity strings are enough.
  // `elite-loader.mjs` redirects `src/boot/i18n` and `src/wallet/chipnet` too;
  // both point at this one file so the loader order cannot change their shape.
  'src/boot/i18n': new URL('./mocks/hub-runtime.mjs', import.meta.url).href,
  '@capacitor/core': new URL('./mocks/capacitor-core.mjs', import.meta.url).href,

  // lift-token.js imports the artifact only to build a vesting contract; the
  // request-building paths under test never reach it.
  'src/cashscripts/lift-token/VestingContractv3.json': dataModule('export default {}'),

  // Contract/provider stack: construction only, never invoked by the specs.
  cashscript: dataModule(`
    export class Contract { constructor () { this.address = 'contract-address' } }
    export class ElectrumNetworkProvider { constructor () {} }
  `),
  '@generalprotocols/price-oracle': dataModule(`
    export const OracleData = { parseOracleMessage: async () => ({}) }
  `),
  watchtower: dataModule(`
    export default class Watchtower {
      constructor () {
        this.BCH = { _api: { get: async () => ({ data: { utxos: [] } }), post: async () => ({ data: {} }) } }
      }
    }
  `),
  'src/wallet/chipnet': new URL('./mocks/hub-runtime.mjs', import.meta.url).href,
  'src/utils/send-page-utils': dataModule(`
    export async function getChangeAddress () { return 'bitcoincash:change' }
  `),
  'src/utils/engagementhub-utils/token-genesis': dataModule(`
    export async function sendNftGenesis () { return { txid: 'txid' } }
  `),
  // lift-token.js re-exports purchase helpers that read the LIFT category from
  // the subscription module, which boots watchtower.
  'src/utils/subscription-utils': dataModule(`
    export const LIFT_TOKEN_CATEGORY = '5932b2fd4915d6a75d3ec53282cd49118149a2176ee67ed68b1111ff0786f7fc'
    export const LIFT_TOKEN_DECIMALS = 0
  `)
}

// `api.js` reaches for the signing key through a lazy import. Redirect only that
// one importer, so no other spec can accidentally run against this stub instead
// of the real key module. The specs set `globalThis.__signingKey` to drive the
// "no key" and "has key" paths without touching the derivation stack.
const WALLET_STUB = dataModule(`
  export async function getPrivateKeyForWallet (walletHash) {
    const source = globalThis.__signingKey
    return typeof source === 'function' ? source(walletHash) : null
  }
`)

export async function resolve (specifier, context, nextResolve) {
  if (specifier === 'watchtower-cash-js') {
    return { url: STUBS.watchtower, shortCircuit: true }
  }
  if (specifier === 'src/utils/wallet') {
    const parent = (context.parentURL || '').replace(/^file:\/\//, '')
    if (parent.endsWith('/src/utils/engagementhub-utils/api.js')) {
      return { url: WALLET_STUB, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  }
  if (STUBS[specifier]) {
    return { url: STUBS[specifier], shortCircuit: true }
  }
  return nextResolve(specifier, context)
}
