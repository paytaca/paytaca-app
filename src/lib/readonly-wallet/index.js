/**
 * ============================================================================
 * READ-ONLY WALLET - module barrel
 * ============================================================================
 * Exports the ReadOnlyWallet implementation plus helpers for reading the
 * serialized read-only config out of the global vault and for building
 * wallet instances that are compatible with the single-sig wallet interface
 * used by the app (see adapter.js).
 */

import store from 'src/store'
import ReadOnlyWallet from './readonly-wallet'

export {
  default as ReadOnlyWallet,
  ReadOnlyNetwork,
  BCH_DERIVATION_PATH,
  isValidXpub,
  getXpubNetwork,
  getXpubFingerprint,
  toFullDerivationPath,
  derivePublicKeyFromXpub
} from './readonly-wallet'

export {
  ReadOnlyBchWallet,
  buildReadOnlyWallet
} from './adapter'

export {
  parseReadOnlyDescriptor,
  buildReadOnlyBsmsDescriptor,
  descriptorChecksum
} from './bsms'

/**
 * True if the given vault entry is a read-only (xpub) wallet.
 * @param {Object} entry - A vault entry
 * @returns {boolean}
 */
export function isReadOnlyVaultEntry (entry) {
  return Boolean(
    entry &&
    !entry.deleted &&
    (entry.settings?.isReadOnly === true || Boolean(entry.readOnly?.xpub))
  )
}

/**
 * Normalize a wallet name for uniqueness comparison.
 * @param {any} name
 * @returns {string}
 */
function normalizeWalletName (name) {
  return String(name ?? '').trim().toLowerCase()
}

/**
 * True if any non-deleted wallet in the vault already uses this name.
 * @param {string} name
 * @returns {boolean}
 */
export function isWalletNameTaken (name) {
  const normalized = normalizeWalletName(name)
  if (!normalized) return false
  const vault = store().getters['global/getVault'] || []
  return vault.some(entry =>
    !entry?.deleted && entry?.name != null &&
    normalizeWalletName(entry.name) === normalized
  )
}

/**
 * Next free read-only wallet name: "Read-Only Wallet", or
 * "Read-Only Wallet (n)" with the lowest number no other wallet uses.
 * Matches against all non-deleted vault names so the result never collides.
 * @returns {string}
 */
export function nextReadOnlyWalletName () {
  const vault = store().getters['global/getVault'] || []
  const taken = new Set(
    vault
      .filter(entry => entry && !entry.deleted && entry?.name != null)
      .map(entry => normalizeWalletName(entry.name))
  )
  const base = 'read-only wallet'
  if (!taken.has(base)) return 'Read-Only Wallet'
  for (let n = 1; ; n++) {
    const candidate = `${base} (${n})`
    if (!taken.has(candidate)) return `Read-Only Wallet (${n})`
  }
}

/**
 * Get the serialized ReadOnlyWallet config for a vault index, or null.
 * @param {number} index
 * @returns {Object|null} ReadOnlyWallet config (toJSON shape)
 */
export function getVaultReadOnlyConfig (index) {
  const entry = store().getters['global/getVault']?.[index]
  if (!isReadOnlyVaultEntry(entry)) return null

  if (entry.readOnly?.xpub) {
    return JSON.parse(JSON.stringify(entry.readOnly))
  }

  // Fallback: reconstruct from the standard wallet structure
  const bch = entry?.wallet?.bch
  if (bch?.xPubKey) {
    return {
      name: entry.name,
      xpub: bch.xPubKey,
      derivationPath: bch.derivationPath,
      networks: {
        mainnet: {},
        chipnet: {}
      }
    }
  }
  return null
}

/**
 * Instantiate ReadOnlyWallet for a vault index, or null if not read-only.
 * @param {number} index
 * @param {Object} [options]
 * @returns {Promise<ReadOnlyWallet|null>}
 */
export async function loadReadOnlyWallet (index, options = {}) {
  const config = getVaultReadOnlyConfig(index)
  if (!config) return null
  return ReadOnlyWallet.fromObject(config, options)
}

/**
 * Whether the currently selected wallet is read-only.
 * @returns {boolean}
 */
export function isCurrentWalletReadOnly () {
  const index = store().getters['global/getWalletIndex']
  return isReadOnlyVaultEntry(store().getters['global/getVault']?.[index])
}