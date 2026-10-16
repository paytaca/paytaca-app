import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'

import { Store } from 'src/store'
import { backend, authToken } from 'src/wallet/pos'
import { getWalletStorageKey } from 'src/utils/wallet-storage'

export const LOOKUP_KEY_STORAGE_PREFIX = 'wallet-lookup-key'
export const LOOKUP_KEY_LABEL = 'engagement-hub'

export class LookupKeyExistsError extends Error {
  constructor (message) {
    super(message)
    this.name = 'LookupKeyExistsError'
    this.code = 'lookup_key_already_exists'
  }
}

function getLookupKeyStorageKey (walletHash) {
  return getWalletStorageKey(LOOKUP_KEY_STORAGE_PREFIX, walletHash)
}

/**
 * The `wallet-hash` header on pos.js `backend` is read from the store, not from
 * the wallet passed in. A mismatch would bind the key to the store's wallet while
 * we persist it under the passed wallet's hash, so refuse rather than mint wrong.
 *
 * Requires src/wallet's Wallet, not src/services/wallet's — both are named Wallet
 * and both expose a top-level `walletHash`, but only the former has `.BCH`, which
 * is what pos.js reads the private key and hash from.
 * @param {import('src/wallet').Wallet} wallet
 * @returns {string} The wallet hash
 */
function assertIsCurrentWallet (wallet) {
  if (!wallet?.BCH?.walletHash) {
    if (wallet?.walletHash) {
      throw new Error(
        'Lookup keys require a wallet from src/wallet (loadWallet), not src/services/wallet'
      )
    }
    throw new Error('Wallet hash is unavailable')
  }

  const walletHash = wallet.BCH.walletHash
  const currentWalletHash = Store.getters['global/getWallet']?.('bch')?.walletHash

  if (walletHash !== currentWalletHash) {
    throw new Error('Lookup keys can only be minted for the current wallet')
  }

  return walletHash
}

async function getAuthToken (wallet, walletHash) {
  const token = (await authToken.get(walletHash)) || (await authToken.generate(wallet))

  if (!token) {
    throw new Error('Unable to obtain a Watchtower auth token')
  }

  return token
}

/**
 * Send an authorized request, regenerating the auth token once on failure.
 * WalletAuthentication returns 403 rather than 401 for an invalid or expired
 * token, and pos.js has no response interceptor to recover from it.
 * @param {import('src/wallet').Wallet} wallet
 * @param {String} walletHash
 * @param {Function} send
 * @returns {Promise<any>}
 */
async function withAuthRetry (wallet, walletHash, send) {
  const token = await getAuthToken(wallet, walletHash)

  try {
    return await send(token)
  } catch (error) {
    if (error?.response?.status !== 403) {
      throw error
    }

    const refreshed = await authToken.generate(wallet)
    if (!refreshed) {
      throw error
    }

    return await send(refreshed)
  }
}

/**
 * Mint a lookup key for the current wallet so a trusted backend can read its
 * balances. Mainnet only. Returns null on chipnet.
 * @param {import('src/wallet').Wallet} wallet - from `loadWallet` in src/wallet
 * @param {Object} [options]
 * @param {String} [options.label]
 * @returns {Promise<String|null>} The raw lookup key, returned by the backend exactly once
 */
export async function mintLookupKey (wallet, { label = LOOKUP_KEY_LABEL } = {}) {
  if (Store.getters['global/isChipnet']) {
    return null
  }

  const walletHash = assertIsCurrentWallet(wallet)

  let response
  try {
    response = await withAuthRetry(wallet, walletHash, (token) => backend.post(
      'wallet/lookup-keys/',
      { label },
      { headers: { Authorization: `Token ${token}` } }
    ))
  } catch (error) {
    if (error?.response?.status === 409) {
      throw new LookupKeyExistsError(
        'This wallet already has a lookup key. Revoke it before minting a new one.'
      )
    }
    throw error
  }

  await SecureStoragePlugin.set({
    key: getLookupKeyStorageKey(walletHash),
    value: response.data.lookup_key
  })

  return response.data.lookup_key
}

/**
 * Revoke the current wallet's lookup key and clear the local copy.
 * @param {import('src/wallet').Wallet} wallet - from `loadWallet` in src/wallet
 * @returns {Promise<Boolean>} True if a key was revoked, false if none existed
 */
export async function revokeLookupKey (wallet) {
  if (Store.getters['global/isChipnet']) {
    return false
  }

  const walletHash = assertIsCurrentWallet(wallet)

  let revoked = false
  try {
    await withAuthRetry(wallet, walletHash, (token) => backend.delete(
      'wallet/lookup-keys/',
      { headers: { Authorization: `Token ${token}` } }
    ))
    revoked = true
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error
    }
  }

  await SecureStoragePlugin.remove({ key: getLookupKeyStorageKey(walletHash) })

  return revoked
}

/**
 * @param {String} walletHash
 * @returns {Promise<Boolean>}
 */
export async function hasLookupKey (walletHash) {
  return Boolean(await getLookupKey(walletHash))
}

/**
 * Read-only, for confirmation surfaces. Never send this to a backend over an
 * unauthenticated channel.
 * @param {String} walletHash
 * @returns {Promise<String|null>}
 */
export async function getLookupKey (walletHash) {
  try {
    const entry = await SecureStoragePlugin.get({ key: getLookupKeyStorageKey(walletHash) })
    return entry?.value || null
  } catch (error) {
    console.error('Failed to read stored lookup key:', error)
    return null
  }
}