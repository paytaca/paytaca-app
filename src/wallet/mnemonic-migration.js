import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { computeWalletHash, isSecureStorageDecryptError } from './index'
import { isWebPlatform } from './secure-storage-migration'
import aes256 from 'aes256'

const MIGRATION_FLAG_KEY = 'mnemonic_migration_completed'

/**
 * Read a secure-storage entry while keeping "absent" distinct from
 * "present but unreadable".
 *
 * Only the errors the patched web plugin throws for undecryptable data are
 * fatal (`SECURE_STORAGE_DECRYPT_FAILED`, `SECURE_STORAGE_KEY_MISSING`). The
 * native keystores reject with their own messages ("Item with given key does
 * not exist", "error"), which stay classified as absent/retry so Android and
 * iOS control flow is unchanged.
 */
async function readSecureValue (key) {
  try {
    const result = await SecureStoragePlugin.get({ key })
    return { value: result?.value ?? null, fatal: false, error: null }
  } catch (err) {
    if (isSecureStorageDecryptError(err)) {
      return { value: null, fatal: true, error: err }
    }
    return { value: null, fatal: false, error: null }
  }
}

/**
 * Read the legacy index-keyed mnemonic (`mn`, `mn<index>`), including the
 * aes256-encrypted layout used before v0.9.1.
 */
async function readLegacyMnemonicAt (index) {
  const oldKey = index === 0 ? 'mn' : `mn${index}`

  const secretKey = await readSecureValue('sk')
  if (secretKey.fatal) return { fatal: true, error: secretKey.error, oldKey }

  const stored = await readSecureValue(oldKey)
  if (stored.fatal) return { fatal: true, error: stored.error, oldKey }
  if (!stored.value) return { mnemonic: null, oldKey }

  if (secretKey.value) {
    try {
      return { mnemonic: aes256.decrypt(secretKey.value, stored.value), oldKey }
    } catch {
      // The value is already plaintext (written after the aes256 layout).
    }
  }
  return { mnemonic: stored.value, oldKey }
}

/**
 * Migrate mnemonics from index-based keys to wallet-hash-based keys.
 *
 * Safe to run on every boot: it is driven by the legacy keys themselves, not by
 * version numbers. It never deletes a legacy key until the hash key has been
 * written and read back, and it never writes the completion flag while any
 * stored value is unreadable.
 *
 * @param {object} options
 * @param {string} [options.platform] - Override Capacitor.getPlatform() (tests)
 * @param {() => Array} [options.getVault] - Vault getter, used to preserve the
 *   0.27.2 no-vault behaviour on native only
 * @returns {Promise<{status: string, migrated?: number}>}
 */
export async function migrateMnemonicsToWalletHash (options = {}) {
  const platform = options.platform || Capacitor.getPlatform()
  const getVault = options.getVault

  // Check if migration already completed
  const flag = await readSecureValue(MIGRATION_FLAG_KEY)
  if (flag.fatal) {
    console.error('[Mnemonic Migration] Stored secrets are unreadable; leaving storage untouched:', flag.error)
    return { status: 'unreadable' }
  }

  if (flag.value === 'true') {
    let foundUnmigrated = false
    let checkedCount = 0

    for (let checkIndex = 0; checkIndex < 100; checkIndex++) {
      const read = await readLegacyMnemonicAt(checkIndex)
      if (read.fatal) {
        console.error('[Mnemonic Migration] Stored secrets are unreadable; leaving storage untouched:', read.error)
        return { status: 'unreadable' }
      }
      if (!read.mnemonic) continue

      checkedCount++
      const walletHash = computeWalletHash(read.mnemonic)
      const newMnemonicData = await readSecureValue(`mn_${walletHash}`)
      if (newMnemonicData.fatal) {
        console.error('[Mnemonic Migration] Stored secrets are unreadable; leaving storage untouched:', newMnemonicData.error)
        return { status: 'unreadable' }
      }
      if (!newMnemonicData.value) {
        foundUnmigrated = true
        break
      }
    }

    if (!foundUnmigrated && checkedCount > 0) {
      return { status: 'already-migrated' }
    }
    if (!foundUnmigrated) {
      // Nothing readable to migrate; keep the flag as-is.
      return { status: 'nothing-to-migrate' }
    }

    try {
      await SecureStoragePlugin.remove({ key: MIGRATION_FLAG_KEY })
    } catch (err) {
      console.error('[Mnemonic Migration] Error clearing migration flag:', err)
    }
  }

  // Preserve v0.27.2 native behaviour exactly: without a vault, mark the
  // migration complete instead of scanning (and writing) secure storage.
  if (!isWebPlatform(platform)) {
    const vault = typeof getVault === 'function' ? getVault() : null
    if (!vault || vault.length === 0) {
      try {
        await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' })
      } catch (err) {
        console.error('[Mnemonic Migration] Error setting migration flag:', err)
      }
      return { status: 'no-vault' }
    }
  }

  let migratedCount = 0
  let errorCount = 0

  // Try to migrate all possible indices (0-100 should be enough)
  // We check indices because vault might have gaps or deleted entries
  for (let index = 0; index < 100; index++) {
    const read = await readLegacyMnemonicAt(index)
    if (read.fatal) {
      console.error('[Mnemonic Migration] Stored secrets are unreadable; aborting without writing the flag:', read.error)
      return { status: 'unreadable' }
    }
    if (!read.mnemonic) continue

    const { mnemonic, oldKey } = read
    const walletHash = computeWalletHash(mnemonic)
    const newKey = `mn_${walletHash}`

    // Check if already migrated (new key exists)
    const existingMnemonic = await readSecureValue(newKey)
    if (existingMnemonic.fatal) {
      console.error('[Mnemonic Migration] Stored secrets are unreadable; aborting without writing the flag:', existingMnemonic.error)
      return { status: 'unreadable' }
    }
    if (existingMnemonic.value) continue

    // Store mnemonic using new scheme
    try {
      await SecureStoragePlugin.set({ key: newKey, value: mnemonic })
    } catch (storeErr) {
      console.error(`[Mnemonic Migration] Error storing mnemonic with NEW key ${newKey}:`, storeErr)
      errorCount++
      continue
    }

    // Verify before dropping the legacy copy.
    const verified = await readSecureValue(newKey)
    if (verified.fatal) {
      console.error('[Mnemonic Migration] Stored secrets are unreadable; aborting without writing the flag:', verified.error)
      return { status: 'unreadable' }
    }
    if (verified.value !== mnemonic) {
      console.error(`[Mnemonic Migration] Verification failed: Stored mnemonic doesn't match for index ${index}`)
      errorCount++
      continue
    }

    migratedCount++
    // Verified under the new scheme; remove the legacy key so only one
    // copy of the mnemonic remains (dedupe).
    await SecureStoragePlugin.remove({ key: oldKey }).catch(() => {})
  }

  // Mark migration as completed ONLY if every migration attempt succeeded.
  // If any error occurred, leave the flag unset so the legacy index-based keys
  // remain valid and getMnemonic() can still fall back to them. Setting the flag
  // despite errors makes those wallets look like they have no mnemonic.
  if (errorCount > 0) {
    console.error(`[Mnemonic Migration] ${errorCount} error(s) during migration; not marking migration complete.`)
    return { status: 'partial', migrated: migratedCount }
  }
  try {
    await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' })
    if (migratedCount === 0) {
      console.warn('[Mnemonic Migration] WARNING: No mnemonics were found to migrate!')
    }
  } catch (error) {
    console.error('[Mnemonic Migration] Error setting migration flag:', error)
  }
  return { status: 'ok', migrated: migratedCount }
}

/**
 * Force re-migration by clearing the migration flag and running migration immediately
 * Useful for debugging or if migration needs to be re-run
 */
export async function forceRemigration() {
  try {
    await SecureStoragePlugin.remove({ key: MIGRATION_FLAG_KEY })
    // Native keeps its no-vault short-circuit, so hand it the live vault.
    let getVault
    try {
      const { default: useStore } = await import('src/store')
      const store = useStore()
      getVault = () => store.getters['global/getVault']
    } catch (err) {
      console.warn('[Mnemonic Migration] Could not read the vault:', err)
    }
    // Run migration immediately
    await migrateMnemonicsToWalletHash({ getVault })
    return true
  } catch (err) {
    console.error('[Mnemonic Migration] Error during forced re-migration:', err)
    return false
  }
}

/**
 * Check migration status
 */
export async function checkMigrationStatus() {
  try {
    const completed = await SecureStoragePlugin.get({ key: MIGRATION_FLAG_KEY })
    return completed?.value === 'true'
  } catch {
    return false
  }
}

// Make forceRemigration available globally for debugging (dev builds only)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  window.forceMnemonicMigration = forceRemigration
  window.checkMnemonicMigrationStatus = checkMigrationStatus
}
