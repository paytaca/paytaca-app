import assert from 'node:assert/strict'
import {
  encodePrivateKeyWif,
  hexToBin,
  secp256k1,
  sha256,
  utf8ToBin
} from 'bitauth-libauth-v3'

import { buildCanonical } from '../src/utils/request-signing.js'
import { NOTIFS_URL } from '../src/utils/engagementhub-utils/api.js'
import {
  buildHubSubscribePayload,
  buildHubUnsubscribePayload,
  buildWatchtowerSubscribePayload,
  diffSubscriptions,
  readSubscriptionSnapshot,
  reconcileHubSubscriptions,
  updateSubscriptionSnapshot,
  writeSubscriptionSnapshot
} from '../src/utils/push-subscription-reconcile.js'

// Throwaway key, never used against a real wallet.
const WIF = encodePrivateKeyWif(hexToBin('22'.repeat(32)), 'mainnet')
const A = 'a'.repeat(64)
const B = 'b'.repeat(64)
const C = 'c'.repeat(64)
const DEVICE = 'device-1'
const OTHER_DEVICE = 'device-2'

const HEADERS = ['public-key', 'signature', 'timestamp', 'nonce', 'wallet-hash']
const quiet = { error: () => {} }

const createStorage = () => {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  }
}

const createRecorder = () => {
  const subscribes = []
  const unsubscribes = []
  return {
    subscribes,
    unsubscribes,
    subscribeOne: async (walletHash) => { subscribes.push(walletHash) },
    unsubscribeOne: async (walletHash) => { unsubscribes.push(walletHash) }
  }
}

describe('push subscription snapshot diff', () => {
  it('reports only additions', () => {
    assert.deepEqual(diffSubscriptions([A, B], []), { added: [A, B], removed: [], unchanged: [] })
  })

  it('reports only removals', () => {
    assert.deepEqual(diffSubscriptions([A], [A, B]), { added: [], removed: [B], unchanged: [A] })
  })

  it('reports no change for an identical set', () => {
    assert.deepEqual(diffSubscriptions([A, B], [B, A]), { added: [], removed: [], unchanged: [A, B] })
  })

  it('reports a mixed set', () => {
    assert.deepEqual(diffSubscriptions([B, C], [A, B]), { added: [C], removed: [A], unchanged: [B] })
  })

  it('deduplicates and ignores junk values', () => {
    assert.deepEqual(
      diffSubscriptions([A, A, '', null, undefined, B], [A]),
      { added: [B], removed: [], unchanged: [A] }
    )
  })
})

describe('push subscription snapshot storage', () => {
  it('scopes the snapshot to the device that wrote it', () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B], storage)

    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B])
    assert.deepEqual(readSubscriptionSnapshot(OTHER_DEVICE, storage), [])
  })

  it('treats corrupt or missing storage as no snapshot', () => {
    const storage = createStorage()
    storage.setItem('eh_push_subscription_snapshot_v1', 'not json')
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [])

    storage.removeItem('eh_push_subscription_snapshot_v1')
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [])
  })

  it('adds and removes one hash at a time', () => {
    const storage = createStorage()
    updateSubscriptionSnapshot(DEVICE, A, true, storage)
    updateSubscriptionSnapshot(DEVICE, B, true, storage)
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B])

    updateSubscriptionSnapshot(DEVICE, A, false, storage)
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [B])
  })
})

describe('hub subscription reconciliation', () => {
  it('subscribes once per added hash and records them', async () => {
    const storage = createStorage()
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [A, B],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [A, B])
    assert.deepEqual(rec.unsubscribes, [])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B])
  })

  it('sends nothing when the set is unchanged', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B], storage)
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [A, B],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [])
    assert.deepEqual(rec.unsubscribes, [])
  })

  it('unsubscribes only the removed hash when the caller declares the full set', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B, C], storage)
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [A, C],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [])
    assert.deepEqual(rec.unsubscribes, [B])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, C])
  })

  it('never unsubscribes on an additive call', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B, C], storage)
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [A],
      pruneUnlisted: false,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [])
    assert.deepEqual(rec.unsubscribes, [])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B, C])
  })

  it('handles a mixed set in one pass', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B], storage)
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [B, C],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [C])
    assert.deepEqual(rec.unsubscribes, [A])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [B, C])
  })

  it('leaves a failed subscribe out of the snapshot so it is retried', async () => {
    const storage = createStorage()
    const rec = createRecorder()
    rec.subscribeOne = async (walletHash) => {
      if (walletHash === A) throw new Error('offline')
      rec.subscribes.push(walletHash)
    }

    await reconcileHubSubscriptions({
      walletHashes: [A, B],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [B])
  })

  it('keeps a failed unsubscribe in the snapshot so it is retried', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B], storage)
    const rec = createRecorder()
    rec.unsubscribeOne = async () => { throw new Error('offline') }

    await reconcileHubSubscriptions({
      walletHashes: [A],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B])
  })

  it('does nothing for an empty wallet list, even with pruning', async () => {
    const storage = createStorage()
    writeSubscriptionSnapshot(DEVICE, [A, B], storage)
    const rec = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...rec
    })

    assert.deepEqual(rec.subscribes, [])
    assert.deepEqual(rec.unsubscribes, [])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B])
  })

  it('covers the acceptance case: a three-wallet vault, then one wallet deleted', async () => {
    const storage = createStorage()
    const first = createRecorder()

    await reconcileHubSubscriptions({
      walletHashes: [A, B, C],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...first
    })
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, B, C])

    const restart = createRecorder()
    await reconcileHubSubscriptions({
      walletHashes: [A, C],
      pruneUnlisted: true,
      deviceId: DEVICE,
      storage,
      log: quiet,
      ...restart
    })
    assert.deepEqual(restart.subscribes, [])
    assert.deepEqual(restart.unsubscribes, [B])
    assert.deepEqual(readSubscriptionSnapshot(DEVICE, storage), [A, C])
  })
})

describe('device subscription payloads', () => {
  const gcm = { gcm_device: { registration_id: 'token', device_id: '1' } }

  it('puts prune_unlisted only on the watchtower payload', () => {
    const watchtower = buildWatchtowerSubscribePayload([A, B], gcm, true)
    assert.equal(watchtower.prune_unlisted, true)
    assert.deepEqual(watchtower.wallet_hashes, [A, B])

    const hub = buildHubSubscribePayload(A, gcm)
    assert.equal(Object.hasOwn(hub, 'prune_unlisted'), false)
    assert.deepEqual(hub.wallet_hashes, [A])
  })

  it('omits prune_unlisted from the watchtower payload when not declared', () => {
    const watchtower = buildWatchtowerSubscribePayload([A, B], gcm, false)
    assert.equal(Object.hasOwn(watchtower, 'prune_unlisted'), false)
  })

  it('names exactly one wallet per engagement-hub request', () => {
    assert.equal(buildHubSubscribePayload(A, gcm).wallet_hashes.length, 1)
    assert.equal(
      buildHubUnsubscribePayload(B, { gcm_device_id: '1' }).wallet_hashes.length,
      1
    )
  })
})

describe('engagement-hub device requests', () => {
  const originalAdapter = NOTIFS_URL.defaults.adapter
  let sent = []

  const installAdapter = () => {
    sent = []
    NOTIFS_URL.defaults.adapter = async (config) => {
      sent.push(config)
      return { data: {}, status: 201, statusText: 'Created', headers: {}, config }
    }
  }

  const verifySignature = (config, absoluteUrl) => {
    const url = new URL(absoluteUrl)
    const canonical = buildCanonical({
      method: config.method,
      fullPath: url.pathname + url.search,
      timestamp: config.headers.timestamp,
      nonce: config.headers.nonce,
      rawBody: config.data
    })
    return secp256k1.verifySignatureDER(
      hexToBin(config.headers.signature),
      hexToBin(config.headers['public-key']),
      sha256.hash(utf8ToBin(canonical))
    )
  }

  beforeEach(() => {
    installAdapter()
    globalThis.__signingKey = () => WIF
  })

  afterEach(() => {
    globalThis.__signingKey = null
  })

  after(() => {
    NOTIFS_URL.defaults.adapter = originalAdapter
  })

  it('signs each single-wallet subscribe for the wallet it names', async () => {
    await NOTIFS_URL.post(
      'subscribe/',
      buildHubSubscribePayload(B, { gcm_device: { registration_id: 'token', device_id: '1' } }),
      { signWithWallet: B }
    )

    const [config] = sent
    assert.equal(config.headers['wallet-hash'], B)
    for (const name of HEADERS) assert.equal(typeof config.headers[name], 'string')
    assert.equal(Object.hasOwn(JSON.parse(config.data), 'prune_unlisted'), false)
    assert.equal(
      verifySignature(config, 'https://engagementhub.paytaca.com/api/devicenotif/subscribe/'),
      true
    )
  })

  it('signs each single-wallet unsubscribe for the wallet it names', async () => {
    await NOTIFS_URL.post(
      'unsubscribe/',
      buildHubUnsubscribePayload(A, { gcm_device_id: '1' }),
      { signWithWallet: A }
    )

    const [config] = sent
    assert.equal(config.headers['wallet-hash'], A)
    assert.equal(
      verifySignature(config, 'https://engagementhub.paytaca.com/api/devicenotif/unsubscribe/'),
      true
    )
  })

  it('sends a watch-only wallet unsigned, never with another wallet signature', async () => {
    globalThis.__signingKey = () => null

    await NOTIFS_URL.post(
      'subscribe/',
      buildHubSubscribePayload(A, { apns_device: { registration_id: 'token', device_id: 'dev' } }),
      { signWithWallet: A }
    )

    const [config] = sent
    assert.equal(config.headers['wallet-hash'], undefined)
    for (const name of HEADERS) assert.equal(config.headers[name], undefined)
    assert.deepEqual(JSON.parse(config.data).wallet_hashes, [A])
  })
})
