import { SlpWallet } from './slp'
import { BchWallet } from './bch'
import { LibauthHDWallet } from './bch-libauth'
import aes256 from 'aes256'
import {
 encodeHdPrivateKey,
 deriveHdPublicKey,
 deriveHdPath,
 deriveHdPrivateNodeFromBip39Mnemonic,
 decodeHdPrivateKey,
 decodeHdPublicKey,
 deriveHdPathRelative,
 sha256 as libauthSha256,
 secp256k1,
 ut8ToBin,
 binToHex
} from 'bitauth-libauth-v3'
import sha256 from 'js-sha256' 
import 'capacitor-secure-storage-plugin'
import { Plugins } from '@capacitor/core'
import { getWalletHashFromIndexAsync } from 'src/utils/wallet-storage'

const { SecureStoragePlugin } = Plugins

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
}

export class Wallet {
  constructor (mnemonic, network = 'BCH') {
    this.mnemonic = mnemonic
    if (network === 'BCH') {
      this.loadBCH()
    }
  }

  get BCH() {
    if (!this._BCH) this.loadBCH()
    return this._BCH
  }

  get BCH_CHIP() {
    if (!this._BCH_CHIP) this.loadBCH()
    return this._BCH_CHIP
  }

  get SLP() {
    if (!this._SLP) this.loadBCH()
    return this._SLP
  }

  get SLP_TEST() {
    if (!this._SLP_TEST) this.loadBCH()
    return this._SLP_TEST
  }

  loadBCH() {
    const derivationPaths = {
      bch: "m/44'/145'/0'",
      slp: "m/44'/245'/0'"
    }
    this._BCH = new BchWallet(projectId.mainnet, this.mnemonic, derivationPaths.bch) // Main BCH wallet
    this._BCH_CHIP = new BchWallet(projectId.chipnet, this.mnemonic, derivationPaths.bch, true) // Chip BCH wallet
    this._SLP = new SlpWallet(projectId.mainnet, this.mnemonic, derivationPaths.slp) // SLP wallet
    this._SLP_TEST = new SlpWallet(projectId.chipnet, this.mnemonic, derivationPaths.slp, true) // Test SLP wallet
  }

}

export async function loadWallet(network = 'BCH', index = 0) {
  const mnemonic = await getMnemonic(index)
  return new Wallet(mnemonic, network)
}


/** @type {Wallet[]} */
const _wallets = []
export async function cachedLoadWallet(network='BCH', index = 0) {
  if (!_wallets[index]) {
    _wallets[index] = loadWallet(network, index)
  }
  return _wallets[index]
}

export async function loadLibauthHdWallet(index=0, chipnet=false) {
  const mnemonic = await getMnemonic(index)
  return new LibauthHDWallet(mnemonic, undefined, chipnet ? 'chipnet' : 'mainnet')
}


/**
 * Compute wallet hash from mnemonic and derivation path
 * Same logic as BchWallet.getWalletHash()
 * @param {string} mnemonic - The mnemonic phrase
 * @param {string} derivationPath - The derivation path (default: "m/44'/145'/0'")
 * @returns {string} The computed wallet hash
 */
export function computeWalletHash(mnemonic, derivationPath = "m/44'/145'/0'") {
  const mnemonicHash = sha256(mnemonic)
  const derivationPathHash = sha256(derivationPath)
  const walletHash = sha256(mnemonicHash + derivationPathHash)
  return walletHash
}

/**
 * Store mnemonic using wallet hash as the key
 * @param {string} mnemonic - The mnemonic phrase
 * @param {string} walletHash - The wallet hash
 * @returns {Promise<string>} The stored mnemonic
 */
export async function storeMnemonicByHash(mnemonic, walletHash) {
  const key = `mn_${walletHash}`
  await SecureStoragePlugin.set({ key, value: mnemonic })
  return mnemonic
}

/**
 * Get mnemonic using wallet hash as the key
 * @param {string} walletHash - The wallet hash
 * @returns {Promise<string|null>} The mnemonic or null if not found
 */
export async function getMnemonicByHash(walletHash) {
  const key = `mn_${walletHash}`
  try {
    const mnemonic = await SecureStoragePlugin.get({ key })
    return mnemonic.value
  } catch (err) {
    return null
  }
}

/**
 * Delete mnemonic using wallet hash as the key
 * @param {string} walletHash - The wallet hash
 * @returns {Promise<void>}
 */
export async function deleteMnemonicByHash(walletHash) {
  const key = `mn_${walletHash}`
  await SecureStoragePlugin.remove({ key })
}

/**
 * Delete all wallet-specific data from secure storage
 * This includes mnemonic, PIN code, and all wallet-specific auth tokens
 * @param {string} walletHash - The wallet hash
 * @param {string} mnemonic - Optional mnemonic (needed to delete PIN code)
 * @param {number} index - Optional index (for old scheme cleanup if migration not completed)
 * @returns {Promise<void>}
 */
export async function deleteAllWalletData(walletHash, mnemonic = null, index = null) {
  if (!walletHash) {
    console.warn('[Wallet Cleanup] No wallet hash provided, skipping cleanup')
    return
  }

  // Check migration status
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }

  // Delete mnemonic (new scheme)
  try {
    await deleteMnemonicByHash(walletHash)
  } catch (err) {
    console.warn(`[Wallet Cleanup] Error deleting mnemonic with NEW key:`, err)
  }

  // Delete mnemonic (old scheme) if migration not completed and index provided
  if (!migrationCompleted && index !== null) {
    try {
      const oldKey = index === 0 ? 'mn' : `mn${index}`
      await SecureStoragePlugin.remove({ key: oldKey })
    } catch (err) {
      console.warn(`[Wallet Cleanup] Error deleting mnemonic with OLD key:`, err)
    }
  }

  // Delete PIN code (all possible keys for this wallet)
  // Post-migration, all wallets should use wallet-specific keys, but we delete
  // all possible keys to ensure no traces remain
  if (mnemonic) {
    const pinKeys = [
      `pin-${sha256(mnemonic)}`,  // New wallet-specific format
      `pin ${mnemonic}`,           // Fallback wallet-specific format
      'pin'                        // Old global format (may be shared, but user requested complete cleanup)
    ]

    for (const pinKey of pinKeys) {
      try {
        await SecureStoragePlugin.remove({ key: pinKey })
      } catch (err) {
        // Key might not exist, continue
      }
    }
  }

  // Delete all wallet-specific auth tokens
  const authTokenPrefixes = [
    'ramp-p2p-auth-key',
    'paytacapos-admin-auth-key',
    'memo-auth-key',
    'asset-auth-key',
    'marketplace-arbiter-key',
    'ramp-api-customer-signer-data',
    'marketplace-api-customer-signer-data'
  ]

  for (const prefix of authTokenPrefixes) {
    try {
      const key = `${prefix}-${walletHash}`
      await SecureStoragePlugin.remove({ key })
    } catch (err) {
      // Key might not exist, continue
    }
  }
}

/**
 * Delete duplicate wallet data from secure storage
 * This is a specialized version for duplicate cleanup that does NOT delete:
 * - Mnemonic (wallet-hash-based key) - kept wallet needs it
 * - PIN code - shared with kept wallet if mnemonic is shared
 * 
 * It only deletes:
 * - Old index-based mnemonic (if migration not completed) - index-specific
 * - Wallet-specific auth tokens - these are hash-based but safe to delete for duplicate
 * 
 * @param {string} walletHash - The wallet hash (shared with kept wallet)
 * @param {number} index - The vault index of the duplicate entry
 * @returns {Promise<void>}
 */
export async function deleteDuplicateWalletData(walletHash, index) {
  if (!walletHash) {
    console.warn('[Duplicate Cleanup] No wallet hash provided, skipping cleanup')
    return
  }

  // Check migration status
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }

  // IMPORTANT: Do NOT delete mnemonic (new scheme) - kept wallet needs it!
  // The mnemonic is stored with key `mn_${walletHash}`, which is shared by all
  // wallets with the same hash. Deleting it would make the kept wallet inaccessible.

  // Only delete old index-based mnemonic if migration not completed
  // This is safe because each index has its own key (mn0, mn1, etc.)
  if (!migrationCompleted && index !== null) {
    try {
      const oldKey = index === 0 ? 'mn' : `mn${index}`
      await SecureStoragePlugin.remove({ key: oldKey })
    } catch (err) {
      console.warn(`[Duplicate Cleanup] Error deleting mnemonic with OLD key:`, err)
    }
  }

  // IMPORTANT: Do NOT delete PIN code - it's shared with the kept wallet
  // If wallets share the same mnemonic, they share the same PIN.
  // Deleting it would lock out the kept wallet.

  // IMPORTANT: Do NOT delete wallet-specific auth tokens - they're shared with the kept wallet
  // Auth tokens are stored with keys like `${prefix}-${walletHash}`, so duplicates
  // share the same tokens. Deleting them would remove tokens that the kept wallet needs.
  // The kept wallet can regenerate tokens if needed, but it's safer to preserve them.
}

export async function generateMnemonic (index = 0) {
  const mnemonic = bchjs.Mnemonic.generate(128)
  
  // Check if migration is completed
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }
  
  // Store using new scheme (wallet hash based)
  const walletHash = computeWalletHash(mnemonic)
  await storeMnemonicByHash(mnemonic, walletHash).catch(() => {
    // Non-critical error, continue
  })
  
  // Only store using old scheme if migration not completed (for backward compatibility during transition)
  if (!migrationCompleted) {
    let key = 'mn'
    if (index !== 0) {
      key = key + index
    }
    try {
      await SecureStoragePlugin.set({ key: key, value: mnemonic })
    } catch (err) {
      // Non-critical error, continue
      console.warn('Failed to store mnemonic using old scheme:', err)
    }
  }
  
  return mnemonic
}

export async function storeMnemonic (mnemonic, walletHashOrIndex = 0) {
  // Check if migration is completed
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }

  let walletHash
  
  // Check if walletHashOrIndex is a wallet hash (string, typically 64 chars hex)
  if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
    walletHash = walletHashOrIndex
  } else {
    // Index provided - compute wallet hash from mnemonic
    walletHash = computeWalletHash(mnemonic)
  }
  
  // Store using new scheme (wallet hash based)
  await storeMnemonicByHash(mnemonic, walletHash)
  
  // Only store using old scheme if migration not completed (for backward compatibility during transition)
  if (!migrationCompleted) {
    const index = typeof walletHashOrIndex === 'number' ? walletHashOrIndex : 0
    let oldKey = 'mn'
    if (index !== 0) {
      oldKey = oldKey + index
    }
    try {
      await SecureStoragePlugin.set({ key: oldKey, value: mnemonic })
    } catch (err) {
      // Non-critical error, continue
      console.warn('Failed to store mnemonic using old scheme:', err)
    }
  }
  
  return mnemonic
}

/**
 * Get mnemonic by wallet hash or index
 * 
 * POST-MIGRATION PATTERN:
 * - Mnemonic storage is wallet-hash-based (keys: mn_${walletHash})
 * - Vault structure is index-based (array: vault[0], vault[1], ...)
 * - This function bridges the gap: accepts either wallet hash or index
 * 
 * When index is provided post-migration:
 *   1. Looks up wallet hash from vault[index]
 *   2. Retrieves mnemonic using wallet hash
 * 
 * When wallet hash is provided:
 *   - Directly retrieves mnemonic using wallet hash
 * 
 * @param {string|number} walletHashOrIndex - Wallet hash (string) or vault index (number)
 * @returns {Promise<string|null>} The mnemonic or null if not found
 */
export async function getMnemonic (walletHashOrIndex = 0) {
  // Check if migration is completed
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }

  // If migration is completed, only use new scheme
  if (migrationCompleted) {
    // If it's a wallet hash (string, typically 64 chars hex)
    if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
      const mnemonic = await getMnemonicByHash(walletHashOrIndex)
      if (mnemonic) {
        return mnemonic
      }
      return null
    }
    
    // If index provided but migration completed, convert to wallet hash using helper
    const index = typeof walletHashOrIndex === 'number' ? walletHashOrIndex : 0
    try {
      const walletHash = await getWalletHashFromIndexAsync(index)
      
      if (walletHash) {
        const mnemonic = await getMnemonicByHash(walletHash)
        if (mnemonic) {
          return mnemonic
        }
        return null
      } else {
        return null
      }
    } catch (err) {
      console.error(`[Mnemonic Retrieval] Error getting wallet hash from vault for index ${index}:`, err)
      return null
    }
  }

  // Migration not completed - use backward compatible logic
  // If it's a wallet hash (string, typically 64 chars hex)
  if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
    const mnemonic = await getMnemonicByHash(walletHashOrIndex)
    if (mnemonic) {
      return mnemonic
    }
    // If not found with new scheme, fall through to try old scheme
  }
  
  // Otherwise treat as index (backward compatibility)
  const index = typeof walletHashOrIndex === 'number' ? walletHashOrIndex : 0
  let mnemonic = null
  let oldKey = 'mn'

  if (index !== 0) {
    oldKey = oldKey + index
  }
  try {
    // For versions up to v0.9.1 that used to have aes256-encrypted mnemonic
    const secretKey = await SecureStoragePlugin.get({ key: 'sk' })
    const encryptedMnemonic = await SecureStoragePlugin.get({ key: oldKey })
    mnemonic = aes256.decrypt(secretKey.value, encryptedMnemonic.value)
  } catch (err) {
    try {
      mnemonic = await SecureStoragePlugin.get({ key: oldKey })
      mnemonic = mnemonic.value
    } catch (err) {
      // Not found
    }
  }
  
  // Attempt lazy migration when old key is accessed
  if (mnemonic) {
    try {
      const walletHash = computeWalletHash(mnemonic)
      await storeMnemonicByHash(mnemonic, walletHash).catch(() => {
        // Non-critical error, continue
      })
    } catch (err) {
      // Non-critical error, continue
    }
  }
  
  return mnemonic
}

/**
 * Check if PIN exists for a wallet
 * @param {string|number} walletHashOrIndex - Wallet hash (string) or vault index (number)
 * @returns {Promise<boolean>} True if PIN exists, false otherwise
 */
export async function pinExists (walletHashOrIndex = 0) {
  try {
    const mnemonic = await getMnemonic(walletHashOrIndex)
    if (!mnemonic) {
      return false
    }
    
    const pinKey = `pin-${sha256(mnemonic)}`
    
    // Try to get PIN with all possible keys
    try {
      const pin = await SecureStoragePlugin.get({ key: pinKey })
      if (pin?.value && pin.value.length >= 6) {
        return true
      }
    } catch {
      // Try fallback keys
      try {
        const pin = await SecureStoragePlugin.get({ key: `pin ${mnemonic}` })
        if (pin?.value && pin.value.length >= 6) {
          return true
        }
      } catch {
        // Try old global PIN key
        try {
          const pin = await SecureStoragePlugin.get({ key: 'pin' })
          if (pin?.value && pin.value.length >= 6) {
            return true
          }
        } catch {
          // PIN doesn't exist
          return false
        }
      }
    }
    
    return false
  } catch (error) {
    console.error('[pinExists] Error checking PIN existence:', error)
    return false
  }
}


export async function deleteMnemonic (walletHashOrIndex) {
  // Check if migration is completed
  let migrationCompleted = false
  try {
    const migrationFlag = await SecureStoragePlugin.get({ key: 'mnemonic_migration_completed' })
    migrationCompleted = migrationFlag?.value === 'true'
  } catch (err) {
    // Flag doesn't exist, migration not completed
  }

  // If it's a wallet hash (string, typically 64 chars hex)
  if (typeof walletHashOrIndex === 'string' && walletHashOrIndex.length >= 32) {
    // Delete using wallet hash
    await deleteMnemonicByHash(walletHashOrIndex).catch(() => {
      // Non-critical error, continue
    })
    
    // Only delete from old scheme if migration not completed
    if (!migrationCompleted) {
      // Try to find and delete from old scheme by computing hash and checking vault
      // This is complex, so we'll skip it for now since old keys will be cleaned up eventually
    }
    return
  }
  
  // Index provided
  if (migrationCompleted) {
    // Migration completed - cannot delete by index alone, need wallet hash
    // Try to get wallet hash from vault
    try {
      const useStore = (await import('src/store')).default
      const store = useStore()
      const vault = store.getters['global/getVault']
      const index = typeof walletHashOrIndex === 'number' ? walletHashOrIndex : 0
      const wallet = vault && vault[index]
      const walletHash = wallet?.wallet?.bch?.walletHash || wallet?.BCH?.walletHash
      
      if (walletHash) {
        await deleteMnemonicByHash(walletHash).catch(() => {
          // Non-critical error, continue
        })
      }
    } catch (err) {
      console.error(`[Mnemonic Deletion] Error getting wallet hash from vault:`, err)
    }
    return
  }
  
  // Migration not completed - delete from both old and new schemes
  const index = typeof walletHashOrIndex === 'number' ? walletHashOrIndex : 0
  let oldKey = 'mn'
  if (index !== 0) {
    oldKey = oldKey + index
  }
  try {
    await SecureStoragePlugin.remove({ key: oldKey })
  } catch (err) {
    // Non-critical error, continue
  }
}

export async function getHdKeys ({ vaultIndex = 0 }) {
    const mnemonic = await getMnemonic(vaultIndex)
    const { wallet } = await loadWallet('BCH', vaultIndex)
    const node = deriveHdPath(
      deriveHdPrivateNodeFromBip39Mnemonic(
        mnemonic
      ),
      wallet.bch.derivationPath,
    );
    const { hdPrivateKey } = encodeHdPrivateKey({ network: 'mainnet', node })
    const { hdPublicKey } = deriveHdPublicKey(hdPrivateKey);
    return { hdPrivateKey, hdPublicKey }
}

export function signMessageWithHdPrivateKey ({ hdPrivateKey, addressIndex, message, hex = false }) {
 const decodedHdPrivateKey = decodeHdPrivateKey(hdPrivateKey, addressIndex)
 const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, addressIndex)
 const messageHash = libauthSha256.hash(utf8ToBin(message))
 const schnorr = secp256k1.signMessageHashSchnorr(privateKey, messageHash)
 const der = secp256k1.signMessageHashDer(privateKey, messageHash)
 if (hex) {
   return { schnorr: binToHex(schnorr), der: binToHex(der) }
 }
 return { schnorr, der }
}

export { Address } from 'watchtower-cash-js';
