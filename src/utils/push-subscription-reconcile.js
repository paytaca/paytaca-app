// Device subscriptions are reconciled per wallet: a signed engagement-hub
// request can prove only one wallet, and the server's `prune_unlisted` would
// unlink every wallet the request does not name. The snapshot records what this
// device last registered successfully, so repeated app starts only send the
// difference and a failed call is retried instead of being assumed done.

export const PUSH_SUBSCRIPTION_SNAPSHOT_KEY = 'eh_push_subscription_snapshot_v1'

function normalizeWalletHashes (walletHashes) {
  const seen = new Set()
  for (const hash of walletHashes || []) {
    if (typeof hash === 'string' && hash) seen.add(hash)
  }
  return [...seen]
}

export function diffSubscriptions (desired, previous) {
  const desiredSet = new Set(normalizeWalletHashes(desired))
  const previousSet = new Set(normalizeWalletHashes(previous))
  return {
    added: [...desiredSet].filter((hash) => !previousSet.has(hash)),
    removed: [...previousSet].filter((hash) => !desiredSet.has(hash)),
    unchanged: [...desiredSet].filter((hash) => previousSet.has(hash))
  }
}

export function readSubscriptionSnapshot (deviceId, storage = globalThis.localStorage) {
  if (!deviceId || !storage) return []
  try {
    const raw = storage.getItem(PUSH_SUBSCRIPTION_SNAPSHOT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed?.device_id !== deviceId) return []
    return normalizeWalletHashes(parsed.wallet_hashes)
  } catch {
    return []
  }
}

export function writeSubscriptionSnapshot (deviceId, walletHashes, storage = globalThis.localStorage) {
  if (!deviceId || !storage) return
  try {
    storage.setItem(PUSH_SUBSCRIPTION_SNAPSHOT_KEY, JSON.stringify({
      device_id: deviceId,
      wallet_hashes: normalizeWalletHashes(walletHashes)
    }))
  } catch {
    // Quota or privacy mode: reconciliation still runs, it just cannot remember
    // what this device already subscribed.
  }
}

export function updateSubscriptionSnapshot (deviceId, walletHash, subscribed, storage = globalThis.localStorage) {
  if (!walletHash) return
  const current = readSubscriptionSnapshot(deviceId, storage)
  const next = subscribed
    ? (current.includes(walletHash) ? current : [...current, walletHash])
    : current.filter((hash) => hash !== walletHash)
  writeSubscriptionSnapshot(deviceId, next, storage)
}

export function buildWatchtowerSubscribePayload (walletHashes, devicePayload, pruneUnlisted) {
  const payload = {
    wallet_hashes: normalizeWalletHashes(walletHashes),
    ...devicePayload
  }
  if (pruneUnlisted && payload.wallet_hashes.length) payload.prune_unlisted = true
  return payload
}

export function buildHubSubscribePayload (walletHash, devicePayload) {
  return { wallet_hashes: [walletHash], ...devicePayload }
}

export function buildHubUnsubscribePayload (walletHash, deviceTarget) {
  return { wallet_hashes: [walletHash], ...deviceTarget }
}

// `pruneUnlisted` means the caller passed this device's complete wallet set, so
// hashes missing from it are unsubscribed. Additive calls (wallet import, the
// debug re-register button) leave every other subscription alone.
export async function reconcileHubSubscriptions ({
  walletHashes,
  pruneUnlisted = false,
  deviceId,
  subscribeOne,
  unsubscribeOne,
  storage = globalThis.localStorage,
  log = console
}) {
  const desired = normalizeWalletHashes(walletHashes)
  if (!desired.length) return { added: [], removed: [], failures: [] }

  const previous = readSubscriptionSnapshot(deviceId, storage)
  const { added, removed } = diffSubscriptions(desired, previous)
  const removals = pruneUnlisted && typeof unsubscribeOne === 'function' ? removed : []
  const current = [...previous]
  const failures = []

  for (const walletHash of added) {
    try {
      await subscribeOne(walletHash)
      if (!current.includes(walletHash)) current.push(walletHash)
      writeSubscriptionSnapshot(deviceId, current, storage)
    } catch (error) {
      failures.push({ walletHash, action: 'subscribe', error })
      log.error('Push subscription failed:', error)
    }
  }

  for (const walletHash of removals) {
    try {
      await unsubscribeOne(walletHash)
      const index = current.indexOf(walletHash)
      if (index >= 0) current.splice(index, 1)
      writeSubscriptionSnapshot(deviceId, current, storage)
    } catch (error) {
      failures.push({ walletHash, action: 'unsubscribe', error })
      log.error('Push unsubscription failed:', error)
    }
  }

  return { added, removed: removals, failures }
}
