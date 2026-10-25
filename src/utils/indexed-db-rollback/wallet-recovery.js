import { Capacitor } from '@capacitor/core'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { getMnemonic, getMnemonicByHash, getMnemonicByIndexLegacy, storeMnemonicByHash, Wallet } from 'src/wallet'
import { Store } from 'src/store'
import { isDeletedWalletHash, pruneDeletedWalletHashes } from 'src/utils/wallet-storage'
import sha256 from 'js-sha256'

import initialAssetState from 'src/store/assets/state'
import { getAllAssets } from 'src/store/assets/getters';

import initialGlobalState from 'src/store/global/state'

const WALLET_RECOVERY2_FLAG_KEY = 'v2-wallet-recovery-done'
const WALLET_RECOVERY_PROCESSED_INDICES_KEY = 'wallet-recovery-processed-indices'

/**
 * Get the set of wallet indices that have already been processed for recovery
 * @returns {Set<number>} Set of processed indices
 */
function getProcessedRecoveryIndices() {
    try {
        const stored = localStorage.getItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY)
        if (!stored) return new Set()
        const indices = JSON.parse(stored)
        // Filter out invalid indices (null, undefined, NaN, or non-numbers) when reading
        const validIndices = Array.isArray(indices) 
            ? indices.filter(index => 
                index !== null && 
                index !== undefined && 
                !isNaN(index) && 
                typeof index === 'number'
            )
            : []
        
        // If we filtered out invalid indices, save the cleaned version back
        if (validIndices.length !== (Array.isArray(indices) ? indices.length : 0)) {
            localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(validIndices))
        }
        
        return new Set(validIndices)
    } catch (error) {
        console.warn('[Wallet Recovery] Error reading processed indices:', error)
        return new Set()
    }
}

/**
 * Mark a wallet index as processed for recovery
 * @param {number} index - Wallet index to mark as processed
 */
function markIndexAsProcessed(index) {
    try {
        // Validate that index is a valid number (not null, undefined, or NaN)
        if (index === null || index === undefined || isNaN(index) || typeof index !== 'number') {
            console.warn('[Wallet Recovery] Attempted to mark invalid index as processed:', index)
            return
        }
        const processed = getProcessedRecoveryIndices()
        processed.add(index)
        localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
    } catch (error) {
        console.warn('[Wallet Recovery] Error marking index as processed:', error)
    }
}

/**
 * Mark multiple wallet indices as processed for recovery
 * @param {number[]} indices - Array of wallet indices to mark as processed
 */
function markIndicesAsProcessed(indices) {
    try {
        // Filter out invalid indices (null, undefined, NaN, or non-numbers)
        const validIndices = indices.filter(index => 
            index !== null && 
            index !== undefined && 
            !isNaN(index) && 
            typeof index === 'number'
        )
        
        if (validIndices.length !== indices.length) {
            const invalidIndices = indices.filter(index => 
                index === null || 
                index === undefined || 
                isNaN(index) || 
                typeof index !== 'number'
            )
            console.warn('[Wallet Recovery] Filtered out invalid indices:', invalidIndices)
        }
        
        const processed = getProcessedRecoveryIndices()
        validIndices.forEach(index => processed.add(index))
        localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
    } catch (error) {
        console.warn('[Wallet Recovery] Error marking indices as processed:', error)
    }
}

/**
 * Clear all processed recovery indices (useful for testing or reset scenarios)
 */
export function clearProcessedRecoveryIndices() {
    try {
        localStorage.removeItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY)
    } catch (error) {
        console.warn('[Wallet Recovery] Error clearing processed indices:', error)
    }
}

/**
 * Compute walletHash from mnemonic and derivation path (same logic as BchWallet.getWalletHash)
 * @param {string} mnemonic - The mnemonic phrase
 * @param {string} derivationPath - The derivation path (default: "m/44'/145'/0'")
 * @returns {string} The computed walletHash
 */
function computeWalletHashFromMnemonic(mnemonic, derivationPath = "m/44'/145'/0'") {
    if (!mnemonic) return null
    const mnemonicHash = sha256(mnemonic)
    const derivationPathHash = sha256(derivationPath)
    const walletHash = sha256(mnemonicHash + derivationPathHash)
    return walletHash
}

/**
 * Verify that a vault entry's walletHash matches the mnemonic at the given index
 * @param {number} index - The wallet index to verify
 * @param {Object} vaultEntry - The vault entry to verify
 * @returns {Promise<boolean>} True if the walletHash matches, false otherwise
 */
async function verifyWalletHashMatch(index, vaultEntry) {
    try {
        // Get the stored walletHash from vault entry
        const storedWalletHash = vaultEntry?.wallet?.bch?.walletHash || vaultEntry?.wallet?.BCH?.walletHash
        if (!storedWalletHash) {
            return false // No walletHash to verify
        }

        // Get the mnemonic at this index
        const mnemonic = await getMnemonic(index)
        if (!mnemonic) {
            return false // No mnemonic to verify against
        }

        // Compute expected walletHash from mnemonic
        const expectedWalletHash = computeWalletHashFromMnemonic(mnemonic)
        if (!expectedWalletHash) {
            return false
        }

        // Compare walletHashes (normalize to strings and trim)
        const normalizedStored = String(storedWalletHash).trim()
        const normalizedExpected = String(expectedWalletHash).trim()
        
        return normalizedStored === normalizedExpected
    } catch (error) {
        console.warn(`[Wallet Recovery] Error verifying walletHash for index ${index}:`, error)
        return false // On error, treat as mismatch to be safe
    }
}

/**
 * Finds unique wallet indices by scanning localStorage for keys like `cap_sec_mn1`, `cap_sec_mn2`, etc.
 * 
 * If multiple keys have the same mnemonic value, only the first one is kept to avoid recovering the same wallet twice.
 * The final list is sorted ascending.
 * 
 * NOTE: This function returns all indices that have mnemonic keys in localStorage, regardless of vault state.
 * The caller should filter out deleted wallets based on vault entries.
 */
export async function getWalletIndicesFromStorage() {
    // Get all localStorage keys
    const lsKeys = Object.keys(localStorage);

    // This will store the valid wallet indices
    const walletIndices = [];

    // Loop over all keys and find keys matching pattern `cap_sec_mnX`
    for (const key of lsKeys) {
        const match = key.match(/^cap_sec_mn(\d+)$/);
        if (match && match[1]) {
            const index = parseInt(match[1], 10);
            walletIndices.push(index);
        }
    }

    // Special case: check for generic key 'cap_sec_mn'
    if (lsKeys.includes('cap_sec_mn')) {
        // Use index 0 for generic key
        walletIndices.push(0);
    }

    // Sort indices ascending for predictable order
    walletIndices.sort((a, b) => a - b);

    return walletIndices;
}

function getEmptyWalletSnapshot() {
    return {
        name: '',
        wallet: initialGlobalState().wallets,
        chipnet: initialGlobalState().chipnet__wallets,
    }
}

function emptyAssetsList() {
    return getAllAssets(initialAssetState())
}

export async function populateMissingVaults() {
    // Get processed indices to skip already-handled wallets
    const processedIndices = getProcessedRecoveryIndices()
    
    // Only check indices that have mnemonics, not all possible indices
    const walletIndices = await getWalletIndicesFromStorage()
    const walletVaults = Store.getters['global/getVault'];
    
    // Only process indices that have mnemonics and haven't been processed yet
    // This avoids checking every index from 0 to vault.length
    for (const index of walletIndices) {
        // Skip invalid indices (null, undefined, NaN, or non-numbers)
        if (index === null || index === undefined || isNaN(index) || typeof index !== 'number') {
            console.warn('[Wallet Recovery] Skipping invalid wallet index in populateMissingVaults:', index)
            continue
        }
        
        // Skip if already processed (already has valid vault entry) - but verify walletHash matches
        if (processedIndices.has(index)) {
            const vaultEntry = walletVaults[index]
            const hasWalletHash = vaultEntry?.wallet?.bch?.walletHash || vaultEntry?.wallet?.BCH?.walletHash
            if (hasWalletHash) {
                // Verify walletHash matches mnemonic before skipping
                const hashMatches = await verifyWalletHashMatch(index, vaultEntry)
                if (hashMatches) {
                    continue // Already processed and walletHash matches - skip entirely
                } else {
                    // WalletHash doesn't match - remove from processed list and continue to recovery
                    const processed = getProcessedRecoveryIndices()
                    processed.delete(index)
                    localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
                    console.warn(`[Wallet Recovery] Vault entry at index ${index} has mismatched walletHash - will recover`)
                }
            }
        }
        
        // If vault entry already exists, verify it matches the mnemonic
        if (walletVaults[index]) {
            const vaultEntry = walletVaults[index]
            const hasWalletHash = vaultEntry?.wallet?.bch?.walletHash || vaultEntry?.wallet?.BCH?.walletHash
            if (hasWalletHash) {
                // Verify walletHash matches mnemonic
                const hashMatches = await verifyWalletHashMatch(index, vaultEntry)
                if (hashMatches) {
                    continue // Vault entry exists and matches - skip
                } else {
                    // WalletHash doesn't match - this entry is wrong, but don't overwrite here
                    // The recovery process will handle fixing it
                    console.warn(`[Wallet Recovery] Vault entry at index ${index} has mismatched walletHash - will be recovered`)
                    continue // Skip creating empty snapshot, recovery will fix it
                }
            } else {
                // Vault entry exists but no walletHash - skip, recovery will handle it
                continue
            }
        }
        
        // Vault entry is missing - create empty snapshot
        // Note: We don't need to check mnemonic here since we're only iterating indices that have mnemonics
        const emptyWalletSnapshot = getEmptyWalletSnapshot()
        Store.commit('global/updateWalletSnapshot', {
            index: index,
            name: emptyWalletSnapshot.name,
            walletSnapshot: emptyWalletSnapshot.wallet,
            chipnetSnapshot: emptyWalletSnapshot.chipnet,
            deleted: true,
        })
    }

    // For assets, only populate for indices that have mnemonics
    const assetVaults = Store.getters['assets/getVault'];
    for (const index of walletIndices) {
        if (assetVaults[index]) continue
        Store.commit('assets/updateVault', { index: index, asset: emptyAssetsList() })
    }
}


export function resetAssetsList(index) {
    const store = Store;
    const vault = store.getters['assets/getVault'];

    let asset = emptyAssetsList();
    if (vault[index]) {
        asset = JSON.parse(
            JSON.stringify(vault[index])
        )
    }

    // this will autofill of earlier indices since indices might skip due to previously deleted wallets
    for(var i = vault.length; i <= index; i++) {
        if (vault[i]) continue
        store.commit('assets/updateVault', { index: i, asset: emptyAssetsList() })
    }

    store.commit('assets/updateVault', { index: index, asset: asset })
    if (index === store.getters['global/getWalletIndex']) {
        store.commit('assets/updatedCurrentAssets', index)
    }
}

/**
 * Build the wallet snapshots needed to store a wallet in the vault.
 * Shared by index-based and mnemonic-key-based recovery.
 * @param {string} mnemonic
 * @returns {Promise<{wallet: Object, chipnet: Object, snapshots: Object[]}>}
 */
async function buildWalletSnapshots (mnemonic) {
    const wallet = new Wallet(mnemonic)
    const walletTypes = [
        { instance: wallet.BCH, isChipnet: false, type: 'bch' },
        { instance: wallet.BCH_CHIP, isChipnet: true, type: 'bch' },
        { instance: wallet.SLP, isChipnet: false, type: 'slp' },
        { instance: wallet.SLP_TEST, isChipnet: true, type: 'slp' }
    ]

    const bchWalletsInfo = {}
    const chipnetWalletsInfo = {}
    const snapshots = []

    for (const { instance, isChipnet, type } of walletTypes) {
        const addresses = await instance.getAddressSetAt(0)
        const xPubKey = await instance.getXPubKey()

        const walletTypeInfo = {
            isChipnet,
            type,
            walletHash: instance.walletHash,
            derivationPath: instance.derivationPath,
            lastAddress: addresses !== null ? addresses.receiving : '',
            lastChangeAddress: addresses !== null ? addresses.change : '',
            lastAddressIndex: 0
        }

        const snapshot = {
            walletHash: walletTypeInfo.walletHash,
            derivationPath: walletTypeInfo.derivationPath,
            lastAddress: walletTypeInfo.lastAddress,
            lastChangeAddress: walletTypeInfo.lastChangeAddress,
            lastAddressIndex: walletTypeInfo.lastAddressIndex,
            xPubKey
        }

        if (isChipnet) chipnetWalletsInfo[type] = snapshot
        else bchWalletsInfo[type] = snapshot

        snapshots.push({ walletTypeInfo, xPubKey, isChipnet, type })
    }

    return { wallet: bchWalletsInfo, chipnet: chipnetWalletsInfo, snapshots }
}

/**
 * Snapshot the persisted address bookkeeping of the active wallet.
 *
 * Recovery rebuilds wallet snapshots from the mnemonic, which starts again at
 * address index 0. The persisted snapshot can be further ahead (a spend
 * advances `lastAddressIndex` so spent addresses are not handed out again), so
 * capture it before recovery overwrites `state.wallets` and re-apply it to the
 * rebuilt snapshot.
 *
 * @returns {{walletHash: string|null, mainnet: Object, chipnet: Object}}
 */
function captureActiveWalletAddressBookkeeping () {
    const pick = (snapshot) => {
        if (!snapshot) return null
        return {
            walletHash: snapshot.walletHash ? String(snapshot.walletHash).trim() : null,
            lastAddress: snapshot.lastAddress || '',
            lastChangeAddress: snapshot.lastChangeAddress || '',
            lastAddressIndex: snapshot.lastAddressIndex,
        }
    }
    const wallets = Store.state.global?.wallets || {}
    const chipnetWallets = Store.state.global?.chipnet__wallets || {}
    return {
        walletHash: wallets.bch?.walletHash ? String(wallets.bch.walletHash).trim() : null,
        mainnet: { bch: pick(wallets.bch), slp: pick(wallets.slp) },
        chipnet: { bch: pick(chipnetWallets.bch), slp: pick(chipnetWallets.slp) },
    }
}

/**
 * Re-apply the captured address bookkeeping to a rebuilt wallet snapshot.
 * Same wallet hash only: this never moves another wallet's pointers.
 */
function restoreAddressBookkeeping (bchWalletsInfo, chipnetWalletsInfo, previous) {
    if (!previous) return
    const restore = (rebuilt, saved) => {
        if (!rebuilt || !saved || !saved.walletHash) return
        if (String(rebuilt.walletHash || '').trim() !== saved.walletHash) return
        const savedIndex = Number(saved.lastAddressIndex)
        if (!Number.isFinite(savedIndex)) return
        const rebuiltIndex = Number(rebuilt.lastAddressIndex)
        if (Number.isFinite(rebuiltIndex) && rebuiltIndex >= savedIndex) return
        rebuilt.lastAddress = saved.lastAddress || rebuilt.lastAddress
        rebuilt.lastChangeAddress = saved.lastChangeAddress || rebuilt.lastChangeAddress
        rebuilt.lastAddressIndex = savedIndex
    }
    restore(bchWalletsInfo?.bch, previous.mainnet?.bch)
    restore(bchWalletsInfo?.slp, previous.mainnet?.slp)
    restore(chipnetWalletsInfo?.bch, previous.chipnet?.bch)
    restore(chipnetWalletsInfo?.slp, previous.chipnet?.slp)
}

/**
 * Resolve the mnemonic for a vault index, tolerating a missing vault entry.
 *
 * A wallet whose vault entry was lost (vault cleared by the reset bug) is still
 * recoverable from its mnemonic key. The mnemonic is read from the wallet-hash
 * key first and from the legacy index key as a fallback, because
 * `mnemonic_migration_completed` can be set without the mnemonic ever having
 * been re-keyed.
 *
 * The legacy index key is only trusted when its mnemonic hashes to the expected
 * wallet hash (when one is known); otherwise it could belong to a different
 * wallet that used to live at that index.
 *
 * @param {number} index
 * @param {string|undefined} walletHash
 * @returns {Promise<{mnemonic: string|null, fromLegacyIndexKey: boolean, walletHash: string|null}>}
 */
async function resolveMnemonicForRecovery (index, walletHash) {
    let mnemonic = null
    if (walletHash) {
        mnemonic = await getMnemonicByHash(walletHash).catch(() => null)
    } else {
        mnemonic = await getMnemonic(index).catch(() => null)
    }
    if (mnemonic) return { mnemonic, fromLegacyIndexKey: false, walletHash: walletHash || null }

    let legacyMnemonic = null
    try {
        legacyMnemonic = await getMnemonicByIndexLegacy(index)
    } catch (error) {
        // Keystore failure / undecryptable ciphertext: do not treat it as
        // "no wallet here", surface it so a later boot can retry.
        console.error(`[Wallet Recovery] Could not read the legacy mnemonic at index ${index}:`, error)
    }
    if (!legacyMnemonic) return { mnemonic: null, fromLegacyIndexKey: false, walletHash: walletHash || null }

    const legacyHash = computeWalletHashFromMnemonic(legacyMnemonic)
    if (walletHash && legacyHash !== String(walletHash).trim()) {
        console.warn(`[Wallet Recovery] Legacy mnemonic at index ${index} does not match the expected wallet; skipping.`)
        return { mnemonic: null, fromLegacyIndexKey: false, walletHash: walletHash || null }
    }

    return { mnemonic: legacyMnemonic, fromLegacyIndexKey: true, walletHash: legacyHash }
}

async function recoverWallet(index, save=false, previousActiveWallet=null) {
    const store = Store
    const walletVault = store.getters['global/getVault']
    const existingVaultEntry = walletVault?.[index]

    // An entry explicitly marked deleted is a tombstone: never resurrect it.
    // A *missing* entry is recoverable — that is the reset-bug case where the
    // whole vault was wiped while the mnemonic keys survived.
    if (existingVaultEntry?.deleted === true) {
        console.warn(`[Wallet Recovery] Skipping recovery for index ${index}: vault entry deleted`)
        return null
    }

    const walletHash = existingVaultEntry?.wallet?.bch?.walletHash || existingVaultEntry?.wallet?.BCH?.walletHash
    const { mnemonic, fromLegacyIndexKey } = await resolveMnemonicForRecovery(index, walletHash)

    if (!mnemonic) {
        console.warn('[Wallet Recovery] No mnemonic found for index:', index)
        return null
    }

    const { wallet: bchWalletsInfo, chipnet: chipnetWalletsInfo, snapshots } = await buildWalletSnapshots(mnemonic)

    // Rebuilt snapshots start at address index 0; keep the persisted pointers so
    // addresses that were already used (spent) are not reused.
    restoreAddressBookkeeping(bchWalletsInfo, chipnetWalletsInfo, previousActiveWallet)

    // Never resurrect a wallet the user explicitly deleted: deleteWallet records
    // the hash so a leftover mnemonic key cannot bring it back.
    const recoveredWalletHash = bchWalletsInfo?.bch?.walletHash
    if (recoveredWalletHash && isDeletedWalletHash(recoveredWalletHash)) {
        console.warn(`[Wallet Recovery] Skipping index ${index}: wallet was deleted by the user`)
        return null
    }

    // The same mnemonic can be stored under several legacy index keys (wallet
    // import used to write the active mnemonic to every index). Recover one
    // vault entry per wallet hash, not one per key.
    const duplicateIndex = walletVault.findIndex(entry => entry &&
        entry.deleted !== true &&
        getVaultWalletHash(entry) === recoveredWalletHash)
    if (duplicateIndex >= 0 && duplicateIndex !== index) {
        console.warn(`[Wallet Recovery] Index ${index} holds the same wallet as index ${duplicateIndex}; skipping duplicate entry.`)
        await rekeyLegacyMnemonic(index, mnemonic, recoveredWalletHash, fromLegacyIndexKey)
        return recoveredWalletHash
    }

    if (save) {
        for (const { walletTypeInfo, xPubKey, isChipnet, type } of snapshots) {
            store.commit('global/updateWallet', walletTypeInfo)
            if (type === 'bch') {
                try {
                    store.dispatch('global/refetchWalletPreferences')
                } catch(error) { console.error(error) }
            }
            store.commit('global/updateXPubKey', { isChipnet, type, xPubKey })
        }
    }

    // Legacy network-specific support removed: no additional wallet info created for it

    // const walletHashes = [
    //     wallet.BCH.walletHash,
    //     wallet.BCH_CHIP.walletHash,
    //     wallet.SLP.walletHash,
    //     wallet.SLP_TEST.walletHash,
    // ]
    // $pushNotifications?.subscribe?.(walletHashes, walletIndex, true)

    resetAssetsList(index)

    const vaultEntry = {
        wallet: bchWalletsInfo,
        chipnet: chipnetWalletsInfo
    }

    const vault = store.getters['global/getVault'];
    for (var i = vault.length; i <= index; i++) {
        if (vault[i]) continue
        const emptyWalletSnapshot = getEmptyWalletSnapshot()
        store.commit('global/updateWalletSnapshot', {
            index: i,
            name: emptyWalletSnapshot.name,
            walletSnapshot: emptyWalletSnapshot.wallet,
            chipnetSnapshot: emptyWalletSnapshot.chipnet,
            deleted: true,
        })
    }

    store.commit('global/updateWalletSnapshot', {
        index,
        walletSnapshot: vaultEntry.wallet,
        chipnetSnapshot: vaultEntry.chipnet,
    })

    await rekeyLegacyMnemonic(index, mnemonic, recoveredWalletHash, fromLegacyIndexKey)

    return recoveredWalletHash || null
}

/**
 * Move a mnemonic that was only readable through the legacy index key to the
 * wallet-hash key used by the current scheme.
 *
 * `mnemonic_migration_completed` is already set on affected installs, so
 * getMnemonic() would never look at `mn<index>` again: without the hash key the
 * wallet would open but be unable to sign. The legacy key is dropped only after
 * the hash key is written, so a failure leaves a readable copy behind.
 *
 * @param {number} index
 * @param {string} mnemonic
 * @param {string} walletHash
 * @param {boolean} fromLegacyIndexKey
 */
async function rekeyLegacyMnemonic (index, mnemonic, walletHash, fromLegacyIndexKey) {
    if (!fromLegacyIndexKey || !walletHash) return
    try {
        await storeMnemonicByHash(mnemonic, walletHash)
        const legacyKey = index === 0 ? 'mn' : `mn${index}`
        await SecureStoragePlugin.remove({ key: legacyKey }).catch(() => {})
    } catch (error) {
        console.warn(`[Wallet Recovery] Could not re-key mnemonic for index ${index}:`, error)
    }
}

export async function recoverWalletsFromStorage() {
    const vault = Store.state.global.vault

    // Capture the persisted active wallet before recovery overwrites
    // `state.wallets` (this also preserves the receive/change pointers).
    const previousActiveWallet = captureActiveWalletAddressBookkeeping()

    // Get processed indices to skip already-processed wallets
    const processedIndices = getProcessedRecoveryIndices()

    // Find mnemonic wallet indices
    const walletIndices = await getWalletIndicesFromStorage()

    // When the vault has been wiped there are no entries left to "recover into",
    // so a missing entry must be treated as a wallet that needs recovering
    // rather than skipped — otherwise a fully cleared vault is unrecoverable
    // even though the mnemonic keys are still present.
    const hasUsableVaultWallet = vault.some(entry => getVaultWalletHash(entry) !== null)

    // Filter indices: skip processed ones UNLESS their vault entry is missing/invalid or walletHash doesn't match (allows re-recovery)
    // Note: This needs to be async to verify walletHash matches mnemonic
    const unprocessedIndices = []
    for (const index of walletIndices) {
        // Skip invalid indices (null, undefined, NaN, or non-numbers)
        if (index === null || index === undefined || isNaN(index) || typeof index !== 'number') {
            console.warn('[Wallet Recovery] Skipping invalid wallet index:', index)
            continue
        }
        
        const vaultEntry = vault[index]

        // Entries explicitly marked deleted are tombstones: never resurrect them.
        if (vaultEntry?.deleted === true) {
            console.warn(`[Wallet Recovery] Skipping index ${index}: vault entry deleted`)
            continue
        }

        // Missing entry: only rebuild it when the vault holds no usable wallet
        // at all. With a healthy vault, a leftover mnemonic key most likely
        // belongs to a wallet that was removed before tombstones existed, and
        // recovering it would add a phantom wallet to the account list.
        if (!vaultEntry) {
            if (hasUsableVaultWallet) {
                console.warn(`[Wallet Recovery] Skipping index ${index}: vault entry missing`)
                continue
            }
            unprocessedIndices.push(index)
            continue
        }
        
        // If not processed, include it
        if (!processedIndices.has(index)) {
            unprocessedIndices.push(index)
            continue
        }
        // If processed, check if vault entry still exists and is valid
        // If vault entry is missing or invalid, allow re-recovery
        // Note: vaultEntry was already declared above, so we reuse it here
        if (!vaultEntry || !vaultEntry.wallet) {
            // Vault entry missing - allow re-recovery and remove from processed list
            const processed = getProcessedRecoveryIndices()
            processed.delete(index)
            localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
            unprocessedIndices.push(index)
            continue
        }
        // Check if wallet has a valid BCH wallet hash
        const hasWalletHash = vaultEntry.wallet?.bch?.walletHash || vaultEntry.wallet?.BCH?.walletHash
        if (!hasWalletHash) {
            // Vault entry exists but invalid - allow re-recovery and remove from processed list
            const processed = getProcessedRecoveryIndices()
            processed.delete(index)
            localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
            unprocessedIndices.push(index)
            continue
        }
        // Verify that the walletHash matches the mnemonic at this index
        const hashMatches = await verifyWalletHashMatch(index, vaultEntry)
        if (!hashMatches) {
            // WalletHash doesn't match - allow re-recovery and remove from processed list
            console.warn(`[Wallet Recovery] Processed index ${index} has vault entry with mismatched walletHash - will re-recover`)
            const processed = getProcessedRecoveryIndices()
            processed.delete(index)
            localStorage.setItem(WALLET_RECOVERY_PROCESSED_INDICES_KEY, JSON.stringify(Array.from(processed)))
            unprocessedIndices.push(index)
            continue
        }
        // Processed and has valid vault entry with matching walletHash - skip it
    }

    // Filter out wallets that already exist in the vault with valid wallet hash
    // Also mark indices with valid vault entries as processed (they don't need recovery)
    // IMPORTANT: Verify that the vault entry's walletHash matches the mnemonic at that index
    const recoverableIndices = []
    const indicesToMarkAsProcessed = []
    
    // Use Promise.all to verify all walletHash matches in parallel
    const verificationPromises = unprocessedIndices.map(async (index) => {
        const vaultEntry = vault[index]
        // Check if vault entry exists and has a valid wallet hash
        const hasWalletHash = vaultEntry?.wallet?.bch?.walletHash || vaultEntry?.wallet?.BCH?.walletHash
        
        if (hasWalletHash) {
            // Verify that the walletHash in the vault entry matches the mnemonic at this index
            const hashMatches = await verifyWalletHashMatch(index, vaultEntry)
            if (hashMatches) {
                // WalletHash matches - wallet is correctly stored, mark as processed (no recovery needed)
                indicesToMarkAsProcessed.push(index)
                return { index, needsRecovery: false }
            } else {
                // WalletHash doesn't match - vault entry belongs to different wallet, needs recovery
                console.warn(`[Wallet Recovery] Vault entry at index ${index} has walletHash that doesn't match mnemonic - will recover`)
                return { index, needsRecovery: true }
            }
        } else {
            // Wallet doesn't exist or is invalid - needs recovery
            return { index, needsRecovery: true }
        }
    })
    
    const verificationResults = await Promise.all(verificationPromises)
    
    // Separate indices into recoverable and processed based on verification results
    verificationResults.forEach(({ index, needsRecovery }) => {
        if (needsRecovery) {
            recoverableIndices.push(index)
        }
    })
    
    // Mark all indices with verified matching vault entries as processed (they don't need recovery)
    if (indicesToMarkAsProcessed.length > 0) {
        markIndicesAsProcessed(indicesToMarkAsProcessed)
    }

    // Only recover the last 30 wallet indices
    if (recoverableIndices.length > 30) {
        recoverableIndices.splice(0, recoverableIndices.length - 30)
    }

    const hasRecoverableWallets = recoverableIndices.length > 0

    const walletRecoveryV2Done = localStorage.getItem(WALLET_RECOVERY2_FLAG_KEY)
    if (!hasRecoverableWallets && walletRecoveryV2Done) {
        Store.commit('global/setWalletsRecovered', true)
        return
    }

    Store.commit('global/setWalletsRecovered', false)

    // Await the first wallet only
    const firstIndex = recoverableIndices[0]
    await recoverWallet(firstIndex, true, previousActiveWallet).catch(error => {
        Store.commit('global/setWalletRecoveryMessage', String(error))
        return Promise.reject(error)
    })
    // Mark first index as processed after successful recovery
    markIndexAsProcessed(firstIndex)
    Store.commit('global/updateWalletIndex', firstIndex)
    recoverableIndices.shift()

    // Start the recovery process for remaining wallets in parallel so it wont block boot
    const promises = recoverableIndices.map(index => recoverWallet(index, false, previousActiveWallet))
    Promise.all(promises).then(() => {
        // Mark all recovered indices as processed
        markIndicesAsProcessed(recoverableIndices)
        Store.commit('global/setWalletsRecovered', true)
        localStorage.setItem(WALLET_RECOVERY2_FLAG_KEY, true)
        // Reopen the wallet the user was on before the vault was lost, not just
        // the lowest recovered index.
        selectPreviouslyActiveRecoveredWallet(previousActiveWallet)
    }).catch(error => {
        Store.commit('global/setWalletRecoveryMessage', String(error))
    })
}

/**
 * Point the app at the recovered wallet that matches the last active wallet
 * snapshot, so a multi-wallet account does not reopen on an arbitrary entry
 * after a vault rebuild. The hash comes from `previousActiveWallet` because
 * recovery has already overwritten `state.wallets` by the time this runs.
 */
function selectPreviouslyActiveRecoveredWallet (previousActiveWallet) {
    try {
        const activeHash = previousActiveWallet?.walletHash
        if (!activeHash) return
        const vault = Store.getters['global/getVault'] || []
        const index = vault.findIndex(entry => getVaultWalletHash(entry) === String(activeHash).trim())
        if (index < 0) return
        Store.commit('global/updateCurrentWallet', index)
        Store.commit('global/updateWalletIndex', index)
    } catch (error) {
        console.warn('[Wallet Recovery] Could not select the previously active wallet:', error)
    }
}

const MNEMONIC_KEY_RECOVERY_FLAG = 'mnemonic-key-recovery-done'
const MNEMONIC_HASH_KEY_PATTERN = /^cap_sec_mn_([a-fA-F0-9]{64})$/

function getVaultWalletHash (entry) {
    if (!entry || entry.deleted === true) return null
    const hash = entry.wallet?.bch?.walletHash || entry.wallet?.BCH?.walletHash
    return hash ? String(hash).trim() : null
}

/**
 * Rebuild vault entries from mnemonic keys stored as `mn_<walletHash>`.
 *
 * A previous bug could clear the vault (localStorage `vuex`) while leaving the
 * encrypted mnemonic keys in place. The wallet hash is part of the key, so the
 * mnemonic can be read back and its hash verified, which is enough to rebuild
 * the vault entry and restore access to the user's funds.
 *
 * Additive only: never overwrites an existing entry. No-op on native, where
 * secure storage is not enumerable and the vault is not affected by that bug.
 */
export async function recoverWalletsFromMnemonicKeys () {
    if (Capacitor.getPlatform() !== 'web') return
    if (typeof localStorage === 'undefined') return

    const vault = Store.getters['global/getVault'] || []
    // Include deleted entries so an intentionally deleted wallet is never
    // resurrected from a leftover key.
    const knownHashes = new Set(
        vault
            .map(entry => {
                const hash = entry?.wallet?.bch?.walletHash || entry?.wallet?.BCH?.walletHash
                return hash ? String(hash).trim() : null
            })
            .filter(Boolean)
    )

    // A wallet that is back in the vault was legitimately re-added (e.g. the
    // same seed restored), so its tombstone must not block a future recovery.
    pruneDeletedWalletHashes(knownHashes)

    const hadUsableWallet = vault.some(entry => getVaultWalletHash(entry) !== null)

    // The "done" flag only means "nothing was left to recover at the time it
    // ran". It must not outlive the vault: the vault can be cleared later by a
    // wallet reset, which is exactly when recovery is needed most.
    if (hadUsableWallet && localStorage.getItem(MNEMONIC_KEY_RECOVERY_FLAG) === 'true') return

    const orphanHashes = Object.keys(localStorage)
        .map(key => key.match(MNEMONIC_HASH_KEY_PATTERN))
        .filter(match => match && !knownHashes.has(match[1]))
        .map(match => match[1])
        // Never resurrect a wallet the user explicitly deleted, even if its
        // mnemonic key survived a failed cleanup.
        .filter(walletHash => !isDeletedWalletHash(walletHash))

    if (orphanHashes.length === 0) {
        // Only record completion against a vault that actually holds a wallet;
        // otherwise leave the flag unset so a later boot retries.
        if (hadUsableWallet) localStorage.setItem(MNEMONIC_KEY_RECOVERY_FLAG, 'true')
        return
    }

    let recovered = 0
    let unreadable = 0
    let firstRecoveredIndex = null
    const previousActiveWallet = captureActiveWalletAddressBookkeeping()

    for (const walletHash of orphanHashes) {
        let mnemonic = null
        try {
            mnemonic = await getMnemonicByHash(walletHash)
        } catch (error) {
            // Key lost or ciphertext undecryptable; retry on next boot in case
            // the failure is transient.
            unreadable++
            console.warn(`[Wallet Recovery] Stored mnemonic for ${walletHash} is unreadable:`, error)
            continue
        }
        if (!mnemonic) continue

        const computedHash = computeWalletHashFromMnemonic(mnemonic)
        if (!computedHash || computedHash.toLowerCase() !== walletHash.toLowerCase()) {
            console.warn(`[Wallet Recovery] Mnemonic key ${walletHash} does not match its contents; skipping.`)
            continue
        }

        try {
            const { wallet, chipnet } = await buildWalletSnapshots(mnemonic)
            restoreAddressBookkeeping(wallet, chipnet, previousActiveWallet)
            const isFirstUsableWallet = !hadUsableWallet && firstRecoveredIndex === null
            Store.commit('global/updateVault', { wallet, chipnet })
            const index = Store.getters['global/getVault'].length - 1
            resetAssetsList(index)
            if (isFirstUsableWallet) {
                // Mirror ensureValidWalletIndex: make the recovered wallet the
                // current one so the app can render without a manual switch.
                Store.commit('global/updateCurrentWallet', index)
            }
            if (firstRecoveredIndex === null) firstRecoveredIndex = index
            recovered++
            console.warn(`[Wallet Recovery] Rebuilt vault entry at index ${index} from stored mnemonic.`)
        } catch (error) {
            console.warn(`[Wallet Recovery] Failed to rebuild wallet for ${walletHash}:`, error)
        }
    }

    if (recovered > 0) {
        const label = recovered === 1 ? 'wallet' : 'wallets'
        Store.commit('global/setWalletRecoveryMessage', `Recovered ${recovered} ${label} from secure storage.`)
        if (!hadUsableWallet && firstRecoveredIndex !== null) {
            Store.commit('global/updateWalletIndex', firstRecoveredIndex)
        }
        // Reopen the wallet the user was on before the vault was lost.
        selectPreviouslyActiveRecoveredWallet(previousActiveWallet)
    }

    // Only mark done once every remaining key was read. Unreadable keys are
    // retried on the next boot, and so is a run that left the vault without a
    // usable wallet.
    if (unreadable === 0 && (hadUsableWallet || recovered > 0)) {
        localStorage.setItem(MNEMONIC_KEY_RECOVERY_FLAG, 'true')
    }
}
