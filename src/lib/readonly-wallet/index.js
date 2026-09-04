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
  getXpubFingerprint,
  toFullDerivationPath,
  derivePublicKeyFromXpub
} from './readonly-wallet'

export {
  ReadOnlyBchWallet,
  ReadOnlySlpWallet,
  buildReadOnlyWallet
} from './adapter'

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
 * Get the serialized ReadOnlyWallet config for a vault index, or null.
 * @param {number} index
 * @returns {Object|null} ReadOnlyWallet config (toJSON shape)
 */
export function getVaultReadOnlyConfig (index) {
  const entry = store.getters['global/getVault']?.[index]
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
  const index = store.getters['global/getWalletIndex']
  return isReadOnlyVaultEntry(store.getters['global/getVault']?.[index])
}