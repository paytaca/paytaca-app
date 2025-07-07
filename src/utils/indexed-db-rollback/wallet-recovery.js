import { getMnemonic, Wallet } from 'src/wallet'
import { Store } from 'src/store'

import initialAssetState from 'src/store/assets/state'
import { getAllAssets } from 'src/store/assets/getters';

import initialGlobalState from 'src/store/global/state'

const WALLET_RECOVERY2_FLAG_KEY = 'v2-wallet-recovery-done'

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
    // this will autofill of earlier indices since indices might skip due to previously deleted wallets
    // skipped indices give a null element which breaks stuff in the app
    const walletVaults = Store.getters['global/getVault'];
    for (var i = 0; i < walletVaults.length; i++) {
        const mnemonic = await getMnemonic(i)
        if (walletVaults[i] && mnemonic) continue
        console.log(`[Wallet Recovery] Adding empty wallet snapshot for ${i}`)
        const emptyWalletSnapshot = getEmptyWalletSnapshot()
        Store.commit('global/updateWalletSnapshot', {
            index: i,
            name: emptyWalletSnapshot.name,
            walletSnapshot: emptyWalletSnapshot.wallet,
            chipnetSnapshot: emptyWalletSnapshot.chipnet,
            deleted: true,
        })
    }

    const assetVaults = Store.getters['assets/getVault'];
    for(var i = 0; i < assetVaults.length; i++) {
        if (assetVaults[i]) continue
        console.log(`[Wallet Recovery] Adding base assets list for ${i}`)
        Store.commit('assets/updateVault', { index: i, asset: emptyAssetsList() })
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

    // Find mnemonic wallet indices
    const walletIndices = await getWalletIndicesFromStorage()
    console.log('[Wallet Recovery] walletIndices found:', walletIndices);

    // Only recover the last 30 wallet indices
    if (walletIndices.length > 30) {
        walletIndices.splice(0, walletIndices.length - 30)
    }

    const lastWalletIndex = Math.max(...walletIndices)
    const hasRecoverableWallets = vault.length < lastWalletIndex+1 && walletIndices.length > 0
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
    const firstIndex = walletIndices[0]
    await recoverWallet(firstIndex, true)
    Store.commit('global/updateWalletIndex', firstIndex)
    walletIndices.shift()

    // Start the recovery process for remaining wallets in parallel so it wont block boot
    const promises = walletIndices.map(index => recoverWallet(index))
    Promise.all(promises).then(() => {
        Store.commit('global/setWalletsRecovered', true)
        localStorage.setItem(WALLET_RECOVERY2_FLAG_KEY, true)
        console.log('[Wallet Recovery] All wallets recovered successfully.')
    })
}
