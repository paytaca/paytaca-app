import { getMnemonic, Wallet } from 'src/wallet'
import { Store } from 'src/store'
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
            console.log('[Wallet Recovery] Cleaned invalid indices from processed list')
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
    console.log('[Wallet Recovery] Populating null vaults')
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
        console.log(`[Wallet Recovery] Adding empty wallet snapshot for ${index}`)
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
        console.log(`[Wallet Recovery] Adding base assets list for ${index}`)
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
        console.log(`[Wallet Recovery] Adding base assets list for ${i} in ${index}`)
        store.commit('assets/updateVault', { index: i, asset: emptyAssetsList() })
    }

    store.commit('assets/updateVault', { index: index, asset: asset })
    if (index === store.getters['global/getWalletIndex']) {
        store.commit('assets/updatedCurrentAssets', index)
    }
}

async function recoverWallet(index, save=false) {
    const store = Store
    const mnemonic = await getMnemonic(index)
    console.log('[Wallet Recovery] Initializing wallet for index:', index)

    if (!mnemonic) {
        console.warn('[Wallet Recovery] No mnemonic found for index:', index)
        return null
    }

    const wallet = new Wallet(mnemonic)
    const bchWallets = [wallet.BCH, wallet.BCH_CHIP]
    const slpWallets = [wallet.SLP, wallet.SLP_TEST]

    const chipnetWalletsInfo = {}
    const bchWalletsInfo = {}
    for (const bchWallet of bchWallets) {
        const isChipnet = bchWallets.indexOf(bchWallet) === 1
        const networkName = isChipnet ? 'chipnet' : 'mainnet'
        console.log(`[Wallet Recovery] Creating ${networkName} BCH wallet info for index ${index}`)

        let walletSnapshot = {}
        await bchWallet.getAddressSetAt(0).then(function (addresses) {
            const walletTypeInfo = {
                isChipnet,
                type: 'bch',
                walletHash: bchWallet.walletHash,
                derivationPath: bchWallet.derivationPath,
                lastAddress: addresses !== null ? addresses.receiving : '',
                lastChangeAddress: addresses !== null ? addresses.change : '',
                lastAddressIndex: 0,
            }

            if (save) {
                store.commit('global/updateWallet', walletTypeInfo)
                try {
                    store.dispatch('global/refetchWalletPreferences')
                } catch(error) { console.error(error) }
            }

            walletSnapshot = {
                walletHash: walletTypeInfo.walletHash,
                derivationPath: walletTypeInfo.derivationPath,
                lastAddress: walletTypeInfo.lastAddress,
                lastChangeAddress: walletTypeInfo.lastChangeAddress,
                lastAddressIndex: walletTypeInfo.lastAddressIndex
            }

        })

        await bchWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'bch',
                xPubKey: xpub
            }

            walletSnapshot.xPubKey = xpub

            if (save) store.commit('global/updateXPubKey', xPubInfo)
        })

        if (isChipnet) {
            chipnetWalletsInfo['bch'] = walletSnapshot
        } else {
            bchWalletsInfo['bch'] = walletSnapshot
        }
    }

    for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        const networkName = isChipnet ? 'chipnet' : 'mainnet'
        console.log(`[Wallet Recovery] Creating ${networkName} SLP wallet info for index ${index}`)

        let walletSnapshot = {}
        await slpWallet.getAddressSetAt(0).then(function (addresses) {
            const walletTypeInfo = {
                isChipnet,
                type: 'slp',
                walletHash: slpWallet.walletHash,
                derivationPath: slpWallet.derivationPath,
                lastAddress: addresses !== null ? addresses.receiving : '',
                lastChangeAddress: addresses !== null ? addresses.change : '',
                lastAddressIndex: 0
            }

            if (save) store.commit('global/updateWallet', walletTypeInfo)

            walletSnapshot = {
                walletHash: walletTypeInfo.walletHash,
                derivationPath: walletTypeInfo.derivationPath,
                lastAddress: walletTypeInfo.lastAddress,
                lastChangeAddress: walletTypeInfo.lastChangeAddress,
                lastAddressIndex: walletTypeInfo.lastAddressIndex
            }
        })

        await slpWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'slp',
                xPubKey: xpub
            }

            walletSnapshot.xPubKey = xpub

            if (save) store.commit('global/updateXPubKey', xPubInfo)
        })

        if (isChipnet) {
            chipnetWalletsInfo['slp'] = walletSnapshot
        } else {
            bchWalletsInfo['slp'] = walletSnapshot
        }
    }

    // sbch wallet info creation, skipped wallet subscription,
    // will assume it's already subscribed if it's being recovered
    await wallet.sBCH.getOrInitWallet();
    const walletTypeInfo = {
        type: 'sbch',
        derivationPath: wallet.sBCH.derivationPath,
        walletHash: wallet.sBCH.walletHash,
        lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
    }
    if (save) store.commit('global/updateWallet', walletTypeInfo)
    const walletSnapshot = {
        walletHash: walletTypeInfo.walletHash,
        derivationPath: walletTypeInfo.derivationPath,
        lastAddress: walletTypeInfo.lastAddress
    }
    bchWalletsInfo['sbch'] = walletSnapshot

    // const walletHashes = [
    //     wallet.BCH.walletHash,
    //     wallet.BCH_CHIP.walletHash,
    //     wallet.SLP.walletHash,
    //     wallet.SLP_TEST.walletHash,
    //     wallet.sBCH.walletHash,
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
        console.log(`[Wallet Recovery] Adding empty wallet snapshot for ${i} in ${index}`)
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
}

export async function recoverWalletsFromStorage() {
    // Check first if vault and wallets are empty
    const isVaultEmpty = Store.getters['global/isVaultEmpty']
    const vault = Store.state.global.vault

    // Get processed indices to skip already-processed wallets
    const processedIndices = getProcessedRecoveryIndices()
    console.log('[Wallet Recovery] Processed indices:', Array.from(processedIndices))

    // Find mnemonic wallet indices
    const walletIndices = await getWalletIndicesFromStorage()
    console.log('[Wallet Recovery] walletIndices found:', walletIndices);

    // Filter indices: skip processed ones UNLESS their vault entry is missing/invalid or walletHash doesn't match (allows re-recovery)
    // Note: This needs to be async to verify walletHash matches mnemonic
    const unprocessedIndices = []
    for (const index of walletIndices) {
        // Skip invalid indices (null, undefined, NaN, or non-numbers)
        if (index === null || index === undefined || isNaN(index) || typeof index !== 'number') {
            console.warn('[Wallet Recovery] Skipping invalid wallet index:', index)
            continue
        }
        
        // If not processed, include it
        if (!processedIndices.has(index)) {
            unprocessedIndices.push(index)
            continue
        }
        // If processed, check if vault entry still exists and is valid
        // If vault entry is missing or invalid, allow re-recovery
        const vaultEntry = vault[index]
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
    console.log('[Wallet Recovery] Unprocessed indices (after filtering processed):', unprocessedIndices)

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
        console.log('[Wallet Recovery] Marked', indicesToMarkAsProcessed.length, 'indices as processed (verified walletHash matches mnemonic)')
    }

    console.log('[Wallet Recovery] Recoverable indices (after filtering existing wallets):', recoverableIndices);

    // Only recover the last 30 wallet indices
    if (recoverableIndices.length > 30) {
        recoverableIndices.splice(0, recoverableIndices.length - 30)
    }

    if (recoverableIndices.length === 0) {
        const walletRecoveryV2Done = localStorage.getItem(WALLET_RECOVERY2_FLAG_KEY)
        if (walletRecoveryV2Done) {
            Store.commit('global/setWalletsRecovered', true)
            console.log('[Wallet Recovery] No recoverable wallets found, exiting recovery process.')
            return
        }
    }

    const lastWalletIndex = Math.max(...recoverableIndices, -1)
    const hasRecoverableWallets = recoverableIndices.length > 0
    console.log('[Wallet Recovery] hasRecoverableWallets:', hasRecoverableWallets);

    const walletRecoveryV2Done = localStorage.getItem(WALLET_RECOVERY2_FLAG_KEY)
    console.log('[Wallet Recovery] walletRecoveryV2Done:', walletRecoveryV2Done)
    if (!hasRecoverableWallets && walletRecoveryV2Done) {
        Store.commit('global/setWalletsRecovered', true)
        console.log('[Wallet Recovery] No recoverable wallets found, exiting recovery process.')
        return 
    }

    Store.commit('global/setWalletsRecovered', false)

    // Await the first wallet only
    const firstIndex = recoverableIndices[0]
    await recoverWallet(firstIndex, true).catch(error => {
        Store.commit('global/setWalletRecoveryMessage', String(error))
        return Promise.reject(error)
    })
    // Mark first index as processed after successful recovery
    markIndexAsProcessed(firstIndex)
    Store.commit('global/updateWalletIndex', firstIndex)
    recoverableIndices.shift()

    // Start the recovery process for remaining wallets in parallel so it wont block boot
    const promises = recoverableIndices.map(index => recoverWallet(index))
    Promise.all(promises).then(() => {
        // Mark all recovered indices as processed
        markIndicesAsProcessed(recoverableIndices)
        Store.commit('global/setWalletsRecovered', true)
        localStorage.setItem(WALLET_RECOVERY2_FLAG_KEY, true)
        console.log('[Wallet Recovery] All wallets recovered successfully.')
    }).catch(error => {
        Store.commit('global/setWalletRecoveryMessage', String(error))
    })
}
