/**
 * Loader used by the address-generation scan tests.
 *
 * `src/utils/address-generation-utils.js` boots the watchtower client, secure
 * storage, the Vuex store and the libauth key helpers at import time. Map those
 * specifiers to in-memory stubs (only when imported from that module) so
 * `findUnusedAddressIndex` can be exercised under Node without the app runtime.
 *
 * Stub state lives in `globalThis.__addressScanStub`, which the spec resets
 * before every test.
 */
import { readFile } from 'node:fs/promises'

const STUB_PREFIX = 'address-scan-stub:'
const SRC_ROOT = new URL('../src/', import.meta.url).href
const TARGET_MODULE = '/src/utils/address-generation-utils.js'

const STUB_TARGETS = {
  'src/utils/bch-keys': 'bch-keys',
  'bip39': 'bip39',
  'src/lib/watchtower': 'watchtower',
  'js-sha256': 'sha256',
  'axios': 'axios',
  'src/wallet/chipnet': 'chipnet',
  'src/wallet': 'wallet',
  'src/lib/readonly-wallet': 'readonly-wallet',
  'src/store': 'store'
}

const STUBS = {
  'bch-keys': `
export function hdNodeFromSeed (seed) { return { seed } }
export function deriveHdNode (node, path) { return { path: String(path) } }
export function hdNodeToCashAddress (node) {
  return 'bitcoincash:' + node.path.split('/').join('-')
}
export function slpToCashAddress (address) { return address }
`,
  'bip39': `
export async function mnemonicToSeed () { return new Uint8Array(64) }
`,
  'watchtower': `
export default class Watchtower {
  constructor () {}
  async subscribe () { return { success: true } }
}
`,
  'sha256': `
import { createHash } from 'node:crypto'
export default function sha256 (input) {
  return createHash('sha256').update(String(input)).digest('hex')
}
`,
  'axios': `
export default {
  async post (url, body) {
    const stub = globalThis.__addressScanStub
    stub.posts.push({ url, body })

    const chain = Object.keys(body.address_sets[0] || {})
      .find((key) => key !== 'address_index')
    const results = []
    for (const set of body.address_sets) {
      if (stub.omit && stub.omit.chain === chain && stub.omit.index === set.address_index) continue
      results.push({
        address_index: set.address_index,
        [chain]: { has_history: stub.used[chain].includes(set.address_index) }
      })
    }

    return { data: { results } }
  }
}
`,
  'chipnet': `
export function convertCashAddress (address, toTestNet) {
  return toTestNet ? String(address).replace('bitcoincash:', 'bchtest:') : address
}
`,
  'wallet': `
export async function getMnemonic (index) {
  const stub = globalThis.__addressScanStub
  stub.mnemonicCalls.push(index)
  return stub.mnemonic
}
`,
  'readonly-wallet': `
export function isReadOnlyVaultEntry (entry) {
  return Boolean(
    entry &&
    !entry.deleted &&
    (entry.settings?.isReadOnly === true || Boolean(entry.readOnly?.xpub))
  )
}
export async function loadReadOnlyWallet () {
  return globalThis.__addressScanStub.readOnlyWallet
}
`,
  'store': `
export default function store () {
  return { getters: { 'global/getVault': globalThis.__addressScanStub.vault } }
}
`
}

export async function resolve (specifier, context, nextResolve) {
  const parentURL = context.parentURL || ''
  if (parentURL.endsWith(TARGET_MODULE)) {
    const target = STUB_TARGETS[specifier]
    if (target) return { url: STUB_PREFIX + target, shortCircuit: true }
  }
  return nextResolve(specifier, context)
}

export async function load (url, context, nextLoad) {
  if (url.startsWith(STUB_PREFIX)) {
    const source = STUBS[url.slice(STUB_PREFIX.length)]
    if (source) return { format: 'module', source, shortCircuit: true }
  }
  // Project sources are authored as ESM but package.json is not `type: module`.
  if (url.startsWith(SRC_ROOT) && url.endsWith('.js')) {
    return { format: 'module', source: await readFile(new URL(url), 'utf8'), shortCircuit: true }
  }
  return nextLoad(url, context)
}
