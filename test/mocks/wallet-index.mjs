/**
 * Lightweight stand-in for `src/wallet/index.js`, used only by the wallet
 * storage guard smoke test.
 *
 * `src/wallet/mnemonic-migration.js` imports `computeWalletHash` and
 * `isSecureStorageDecryptError` from `./index`, but the real module pulls in the
 * whole wallet/bch/store stack (Watchtower, Vuex, ...) which cannot boot under
 * plain Node. The migration logic under test does not depend on any of that.
 */
import { createHash } from 'node:crypto'

const sha256 = (value) => createHash('sha256').update(value, 'utf8').digest('hex')

export function computeWalletHash (mnemonic, derivationPath = "m/44'/145'/0'") {
  if (typeof mnemonic !== 'string' || mnemonic.length === 0) {
    throw new TypeError('[computeWalletHash] mnemonic must be a non-empty string')
  }
  if (typeof derivationPath !== 'string' || derivationPath.length === 0) {
    throw new TypeError('[computeWalletHash] derivationPath must be a non-empty string')
  }
  return sha256(sha256(mnemonic) + sha256(derivationPath))
}

export function isSecureStorageDecryptError (err) {
  return err?.message === 'SECURE_STORAGE_DECRYPT_FAILED' ||
    err?.message === 'SECURE_STORAGE_KEY_MISSING'
}

export default { computeWalletHash, isSecureStorageDecryptError }
