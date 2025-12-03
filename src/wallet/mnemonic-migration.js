import { Plugins } from '@capacitor/core'
import { computeWalletHash } from './index'
import useStore from 'src/store'
import aes256 from 'aes256'

const { SecureStoragePlugin } = Plugins

const MIGRATION_FLAG_KEY = 'mnemonic_migration_completed'

/**
 * Migrate mnemonics from index-based keys to wallet-hash-based keys
 * This should run once on app startup after wallets are loaded
 */
export async function migrateMnemonicsToWalletHash() {
  // Check if migration already completed
  let migrationFlagExists = false
  try {
    const completed = await SecureStoragePlugin.get({ key: MIGRATION_FLAG_KEY })
    migrationFlagExists = true
    if (completed?.value === 'true') {
      // Verify that migration actually worked by checking if any mnemonics exist with new keys
      
      // Check if we can find any mnemonics with old keys that aren't migrated
      let foundUnmigrated = false
      let checkedCount = 0
      for (let checkIndex = 0; checkIndex < 100; checkIndex++) {
        const oldKey = checkIndex === 0 ? 'mn' : `mn${checkIndex}`
        try {
          // Try to get mnemonic with old key
          let mnemonic = null
          try {
            const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
            const encryptedMnemonic = await SecureStoragePlugin.get({ key: oldKey })
            mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
          } catch (err) {
            try {
              const mnemonicData = await SecureStoragePlugin.get({ key: oldKey })
              mnemonic = mnemonicData.value
            } catch (err) {
              // No mnemonic at this index
              continue
            }
          }
          
          if (mnemonic) {
            checkedCount++
            // Check if it exists with new key
            const walletHash = computeWalletHash(mnemonic)
            const newKey = `mn_${walletHash}`
            try {
              const newMnemonicData = await SecureStoragePlugin.get({ key: newKey })
              if (newMnemonicData && newMnemonicData.value) {
                // Migrated
              } else {
                foundUnmigrated = true
                break
              }
            } catch (err) {
              // Not found with new key - migration didn't complete properly
              foundUnmigrated = true
              break
            }
          }
        } catch (err) {
          console.error(`[Mnemonic Migration] Verification: Error checking index ${checkIndex}:`, err)
          // Continue checking other indices
        }
      }
      
      if (!foundUnmigrated && checkedCount > 0) {
        return
      } else if (foundUnmigrated) {
        // Clear the flag and proceed with migration
        try {
          await SecureStoragePlugin.remove({ key: MIGRATION_FLAG_KEY })
        } catch (err) {
          console.error('[Mnemonic Migration] Error clearing migration flag:', err)
        }
      } else {
        return
      }
    }
  } catch (err) {
    // Flag doesn't exist, proceed with migration
  }
  
  const store = useStore()
  const vault = store.getters['global/getVault']
  if (!vault || vault.length === 0) {
    // Still mark as completed if no vault exists
    try {
      await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' })
    } catch (err) {
      console.error('[Mnemonic Migration] Error setting migration flag:', err)
    }
    return
  }

  let migratedCount = 0
  let errorCount = 0

  // Try to migrate all possible indices (0-100 should be enough)
  // We check indices because vault might have gaps or deleted entries
  for (let index = 0; index < 100; index++) {
    try {
      // Try to get mnemonic directly from old scheme to avoid triggering lazy migration
      const oldKey = index === 0 ? 'mn' : `mn${index}`
      let mnemonic = null
      
      // Try to get mnemonic directly from secure storage (old scheme)
      try {
        // For versions up to v0.9.1 that used to have aes256-encrypted mnemonic
        const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
        const encryptedMnemonic = await SecureStoragePlugin.get({ key: oldKey })
        mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
      } catch (err) {
        try {
          const mnemonicData = await SecureStoragePlugin.get({ key: oldKey })
          mnemonic = mnemonicData.value
        } catch (err) {
          // No mnemonic at this index, continue
          continue
        }
      }
      
      if (!mnemonic) {
        // No mnemonic at this index, continue
        continue
      }

      // Compute wallet hash from mnemonic
      const walletHash = computeWalletHash(mnemonic)
      const newKey = `mn_${walletHash}`
      
      // Check if already migrated (new key exists)
      let alreadyMigrated = false
      try {
        const existingMnemonic = await SecureStoragePlugin.get({ key: newKey })
        if (existingMnemonic && existingMnemonic.value) {
          alreadyMigrated = true
        }
      } catch (err) {
        // Not found, not migrated yet
        alreadyMigrated = false
      }
      
      if (alreadyMigrated) {
        continue
      }

      // Store mnemonic using new scheme
      try {
        await SecureStoragePlugin.set({ key: newKey, value: mnemonic })
        
        // Verify it was stored correctly
        try {
          const verifyMnemonic = await SecureStoragePlugin.get({ key: newKey })
          if (verifyMnemonic && verifyMnemonic.value === mnemonic) {
            migratedCount++
          } else {
            console.error(`[Mnemonic Migration] Verification failed: Stored mnemonic doesn't match for index ${index}`)
            errorCount++
          }
        } catch (verifyErr) {
          console.error(`[Mnemonic Migration] Verification failed: Could not retrieve stored mnemonic for index ${index}:`, verifyErr)
          errorCount++
        }
      } catch (storeErr) {
        console.error(`[Mnemonic Migration] Error storing mnemonic with NEW key ${newKey}:`, storeErr)
        errorCount++
      }
    } catch (error) {
      console.error(`[Mnemonic Migration] Error migrating index ${index}:`, error)
      errorCount++
    }
  }

  // Mark migration as completed
  try {
    await SecureStoragePlugin.set({ key: MIGRATION_FLAG_KEY, value: 'true' })
    if (migratedCount === 0 && errorCount === 0) {
      console.warn(`[Mnemonic Migration] WARNING: No mnemonics were found to migrate!`)
    }
  } catch (error) {
    console.error('[Mnemonic Migration] Error setting migration flag:', error)
  }
}

/**
 * Force re-migration by clearing the migration flag and running migration immediately
 * Useful for debugging or if migration needs to be re-run
 */
export async function forceRemigration() {
  try {
    await SecureStoragePlugin.remove({ key: MIGRATION_FLAG_KEY })
    // Run migration immediately
    await migrateMnemonicsToWalletHash()
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
  } catch (err) {
    return false
  }
}

// Make forceRemigration available globally for debugging
if (typeof window !== 'undefined') {
  window.forceMnemonicMigration = forceRemigration
  window.checkMnemonicMigrationStatus = checkMigrationStatus
}

