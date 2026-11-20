import assert from 'node:assert/strict'
import {
  BEX_PROVIDER_STATE_KEY,
  MAX_QUEUED,
  MAX_QUEUED_PER_ORIGIN,
  MAX_REQUEST_BYTES,
  admissionError,
  approvalPopupBounds,
  chainIdOf,
  changedAccounts,
  isWebOrigin,
  itemsBefore,
  mergeDappMetadata,
  networkOfChainId,
  normalizePermission,
  normalizeQueue,
  parseRequestAccountsParams,
  permissionKey,
  permissionsFrom,
  storageView,
  toWireJson,
  visibleAccounts,
} from '../src/utils/bex.js'

const ORIGIN = 'https://dapp.example'
const OTHER_ORIGIN = 'https://other.example'
const WALLET = 'mainnet:hash-a'
const OTHER_WALLET = 'mainnet:hash-b'

const permission = (overrides = {}) => ({
  accounts: ['bitcoincash:qaccount'],
  walletId: WALLET,
  addressIndex: 3,
  connectedAt: 1,
  ...overrides,
})

const state = (walletId = WALLET) => ({ chainId: 'bch:bitcoincash', network: 'mainnet', walletId })

const request = (method, id = 1, params = {}) => ({ jsonrpc: '2.0', id, method, params })

const queued = (internalRequestId, origin, method = 'bch_signMessage') => ({
  internalRequestId,
  origin,
  message: request(method, internalRequestId),
  createdAt: 1,
})

describe('bex origins and chains', () => {
  it('accepts only bare http(s) origins', () => {
    assert.equal(isWebOrigin('https://dapp.example'), true)
    assert.equal(isWebOrigin('http://localhost:8080'), true)
    assert.equal(isWebOrigin('https://dapp.example/path'), false)
    assert.equal(isWebOrigin('chrome-extension://abc'), false)
    assert.equal(isWebOrigin('null'), false)
    assert.equal(isWebOrigin(undefined), false)
  })

  it('maps networks to WalletConnect chain ids and back', () => {
    assert.equal(chainIdOf('mainnet'), 'bch:bitcoincash')
    assert.equal(chainIdOf('chipnet'), 'bch:bchtest')
    assert.equal(networkOfChainId('bch:bitcoincash'), 'mainnet')
    assert.equal(networkOfChainId('bch:bchtest'), 'chipnet')
    assert.equal(networkOfChainId('eip155:1'), undefined)
  })
})

describe('bex permissions', () => {
  it('keeps a well-formed permission and drops foreign fields', () => {
    const normalized = normalizePermission({ ...permission(), extra: 'x', metadata: { name: ' Dapp ', url: 'https://evil', icons: ['https://dapp.example/icon.png'] } })
    assert.deepEqual(normalized, {
      ...permission(),
      metadata: { name: 'Dapp', icons: ['https://dapp.example/icon.png'] },
    })
  })

  it('rejects a permission without a wallet, accounts or a valid address index', () => {
    assert.equal(normalizePermission(permission({ walletId: '' })), undefined)
    assert.equal(normalizePermission(permission({ accounts: [] })), undefined)
    assert.equal(normalizePermission(permission({ addressIndex: undefined })), undefined)
    assert.equal(normalizePermission(permission({ addressIndex: -1 })), undefined)
    assert.equal(normalizePermission(permission({ addressIndex: 2 ** 31 })), undefined)
    assert.equal(normalizePermission(permission({ addressIndex: 1.5 })), undefined)
  })

  it('reads only permission keys of web origins', () => {
    const items = {
      [permissionKey(ORIGIN)]: permission(),
      [permissionKey('chrome-extension://abc')]: permission(),
      [permissionKey(OTHER_ORIGIN)]: { accounts: [] },
      unrelated: permission(),
    }
    assert.deepEqual(Object.keys(permissionsFrom(items)), [ORIGIN])
  })

  it('shows a site its accounts only while their wallet is open', () => {
    assert.deepEqual(visibleAccounts(permission(), state()), ['bitcoincash:qaccount'])
    assert.deepEqual(visibleAccounts(permission(), state(OTHER_WALLET)), [])
    assert.deepEqual(visibleAccounts(permission(), undefined), [])
    assert.deepEqual(visibleAccounts(undefined, state()), [])
  })

  it('reports the sites whose visible accounts changed', () => {
    const after = {
      [BEX_PROVIDER_STATE_KEY]: state(),
      [permissionKey(ORIGIN)]: permission(),
      [permissionKey(OTHER_ORIGIN)]: permission({ walletId: OTHER_WALLET }),
    }
    const changes = { [permissionKey(ORIGIN)]: { newValue: permission() } }
    const before = itemsBefore(after, changes)
    assert.equal(before[permissionKey(ORIGIN)], undefined)
    assert.deepEqual(changedAccounts(storageView(before), storageView(after)), [
      { origin: ORIGIN, accounts: ['bitcoincash:qaccount'] },
    ])
  })

  it('disconnects every site of a wallet when another wallet opens', () => {
    const before = storageView({
      [BEX_PROVIDER_STATE_KEY]: state(),
      [permissionKey(ORIGIN)]: permission(),
      [permissionKey(OTHER_ORIGIN)]: permission({ walletId: OTHER_WALLET }),
    })
    const after = storageView({
      [BEX_PROVIDER_STATE_KEY]: state(OTHER_WALLET),
      [permissionKey(ORIGIN)]: permission(),
      [permissionKey(OTHER_ORIGIN)]: permission({ walletId: OTHER_WALLET }),
    })
    assert.deepEqual(changedAccounts(before, after), [
      { origin: ORIGIN, accounts: [] },
      { origin: OTHER_ORIGIN, accounts: ['bitcoincash:qaccount'] },
    ])
  })
})

describe('bex request queue', () => {
  it('restores valid entries in id order and drops the rest', () => {
    const restored = normalizeQueue([
      queued(5, ORIGIN),
      queued(2, OTHER_ORIGIN),
      queued(5, ORIGIN),
      { ...queued(7, ORIGIN), origin: 'chrome-extension://abc' },
      { ...queued(8, ORIGIN), message: { id: 8 } },
      { ...queued(9, ORIGIN), tabId: 'x' },
    ])
    assert.deepEqual(restored.map(entry => entry.internalRequestId), [2, 5, 9])
    assert.equal('tabId' in restored[2], false)
    assert.deepEqual(normalizeQueue('nope'), [])
  })

  it('admits one connect request per site at a time', () => {
    const queue = [queued(1, ORIGIN, 'bch_requestAccounts')]
    assert.equal(admissionError(queue, ORIGIN, request('bch_connect')).code, -32002)
    assert.equal(admissionError(queue, OTHER_ORIGIN, request('bch_connect')), undefined)
    assert.equal(admissionError(queue, ORIGIN, request('bch_signMessage')), undefined)
  })

  it('caps the requests of one site and of all sites', () => {
    const perSite = Array.from({ length: MAX_QUEUED_PER_ORIGIN }, (_, index) => queued(index, ORIGIN))
    assert.equal(admissionError(perSite, ORIGIN, request('bch_signMessage')).code, -32005)
    assert.equal(admissionError(perSite, OTHER_ORIGIN, request('bch_signMessage')), undefined)

    const full = Array.from({ length: MAX_QUEUED }, (_, index) => queued(index, `https://site${index}.example`))
    assert.equal(admissionError(full, OTHER_ORIGIN, request('bch_signMessage')).code, -32005)
  })

  it('refuses a request too large to hold', () => {
    const large = request('bch_signTransaction', 1, { transaction: 'ab'.repeat(MAX_REQUEST_BYTES / 2) })
    assert.equal(admissionError([], ORIGIN, large).message, 'Request too large')
  })
})

describe('bex wire form', () => {
  it('encodes Uint8Array and bigint values as libauth extended JSON', () => {
    assert.deepEqual(toWireJson({ data: Uint8Array.from([0, 15, 255]), value: 10n, nested: [{ n: 1n }] }), {
      data: '<Uint8Array: 0x000fff>',
      value: '<bigint: 10n>',
      nested: [{ n: '<bigint: 1n>' }],
    })
  })

  it('passes params already in wire form through unchanged', () => {
    const params = { transaction: '0200', sourceOutputs: [{ valueSatoshis: '<bigint: 5n>' }] }
    assert.deepEqual(toWireJson(params), params)
    assert.equal(toWireJson(undefined), undefined)
  })
})

describe('bex dApp metadata', () => {
  const page = { name: 'Page Title', description: 'Page description', icons: ['https://dapp.example/favicon.ico'] }

  it('prefers what the dApp declares, field by field', () => {
    assert.deepEqual(mergeDappMetadata({ name: 'Dapp', icons: ['https://cdn.example/icon.png'] }, page), {
      name: 'Dapp',
      description: 'Page description',
      icons: ['https://cdn.example/icon.png'],
    })
  })

  it('takes a singular icon and drops icons the wallet cannot load', () => {
    assert.deepEqual(mergeDappMetadata({ icon: 'https://cdn.example/icon.png' }, page).icons, ['https://cdn.example/icon.png'])
    assert.deepEqual(mergeDappMetadata({ icons: ['javascript:alert(1)', 'http://evil.example/icon.png'] }, page).icons, page.icons)
    assert.deepEqual(mergeDappMetadata({ icons: ['http://localhost:3000/icon.png'] }, page).icons, ['http://localhost:3000/icon.png'])
  })

  it('falls back to the page when the dApp declares nothing usable', () => {
    assert.deepEqual(mergeDappMetadata(undefined, page), page)
    assert.deepEqual(mergeDappMetadata({ name: '  ', description: 5 }, page), page)
  })
})

describe('bex account request params', () => {
  it('accepts no params, an array, or an object', () => {
    assert.deepEqual(parseRequestAccountsParams(undefined), {})
    assert.deepEqual(parseRequestAccountsParams([]), {})
    assert.deepEqual(parseRequestAccountsParams({ chainId: 'bch:bchtest' }), { chainId: 'bch:bchtest' })
  })

  it('refuses a chain id that is not a string', () => {
    assert.throws(() => parseRequestAccountsParams({ chainId: 1 }), TypeError)
    assert.throws(() => parseRequestAccountsParams({ chainId: 'x'.repeat(65) }), TypeError)
  })

  it('keeps usable metadata and leaves out the rest', () => {
    assert.deepEqual(parseRequestAccountsParams({
      dappMetadata: { name: 'x'.repeat(70), description: 'About', icons: ['ftp://icon', 'https://a.example/i.png'], url: 'https://evil' },
    }), {
      dappMetadata: { name: 'x'.repeat(64), description: 'About', icons: ['https://a.example/i.png'] },
    })
    assert.deepEqual(parseRequestAccountsParams({ dappMetadata: 'bad' }), {})
  })
})

describe('bex approval popup', () => {
  it('floats at the top right of the browser window', () => {
    assert.deepEqual(approvalPopupBounds({ left: 100, top: 50, width: 1200 }, 420), { left: 864, top: 66 })
  })

  it('leaves placement to the browser without window bounds', () => {
    assert.equal(approvalPopupBounds({ top: 0 }, 420), undefined)
  })
})
