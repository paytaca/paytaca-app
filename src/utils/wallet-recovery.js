import { getMnemonic, Wallet } from 'src/wallet'
import { Store } from 'src/store'

async function getWalletIndicesFromStorage() {
    const lsKeys = Object.keys(localStorage)
    const mnKeys = lsKeys.filter(key => key.startsWith('cap_sec_mn'))
    const walletIndices = mnKeys
        .map(key => key.match(/^cap_sec_mn(\d+)$/))
        .filter(match => match && match[1])
        .map(match => parseInt(match[1], 10));

    if (mnKeys.includes('cap_sec_mn') && !walletIndices.includes(0)) {
        walletIndices.push(0)
    }
    walletIndices.sort((a, b) => a - b)
    return walletIndices
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

        await bchWallet.getNewAddressSet(0).then(function (response) {
            const addresses = response?.addresses || null
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

            if (isChipnet) {
                chipnetWalletsInfo['bch'] = walletTypeInfo
            } else {
                bchWalletsInfo['bch'] = walletTypeInfo
            }
        })

        await bchWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'bch',
                xPubKey: xpub
            }

            if (save) store.commit('global/updateXPubKey', xPubInfo)
        })
    }

    for (const slpWallet of slpWallets) {
        const isChipnet = slpWallets.indexOf(slpWallet) === 1

        await slpWallet.getNewAddressSet(0).then(function (addresses) {
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

            if (isChipnet) {
                chipnetWalletsInfo['slp'] = walletTypeInfo
            } else {
                bchWalletsInfo['slp'] = walletTypeInfo
            }
        })

        await slpWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'slp',
                xPubKey: xpub
            }

            if (save) store.commit('global/updateXPubKey', xPubInfo)
        })
    }

    await wallet.sBCH.subscribeWallet().then(function () {
        const walletTypeInfo = {
            type: 'sbch',
            derivationPath: wallet.sBCH.derivationPath,
            walletHash: wallet.sBCH.walletHash,
            lastAddress: wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        }

        if (save) store.commit('global/updateWallet', walletTypeInfo)
        console.log('[Wallet Recovery] sBCH Wallet:', walletTypeInfo)

        bchWalletsInfo['sbch'] = walletTypeInfo
    })

    const walletHashes = [
        wallet.BCH.walletHash,
        wallet.BCH_CHIP.walletHash,
        wallet.SLP.walletHash,
        wallet.SLP_TEST.walletHash,
        wallet.sBCH.walletHash,
    ]
    // $pushNotifications?.subscribe?.(walletHashes, walletIndex, true)

    let asset = store.getters['assets/getAllAssets']
    asset = JSON.stringify(asset)
    asset = JSON.parse(asset)

    store.commit('assets/updateVault', { index: index, asset: asset })
    store.commit('assets/updatedCurrentAssets', index)

    store.commit('global/updateVault', {
        wallet: bchWalletsInfo,
        chipnet: chipnetWalletsInfo
    })
}

export async function recoverWalletsFromStorage() {
    console.log('[Wallet Recovery] Checking for empty vault and wallet...')
    
    // Check first if vault and wallets are empty
    const isVaultEmpty = Store.getters['global/isVaultEmpty']
    const storedBchWallet = Store.getters['global/getWallet']('bch')
    const storedSlpWallet = Store.getters['global/getWallet']('slp')

    if (!isVaultEmpty || (storedBchWallet?.walletHash !== '' && storedSlpWallet?.walletHash === '')) {
        console.log('[Wallet Recovery] Vault or wallets are not empty, skipping wallet recovery.')
        return 
    }

    // Find mnemonic wallet indices
    const walletIndices = await getWalletIndicesFromStorage()
    console.log('[Wallet Recovery] walletIndices found:', walletIndices);

    // Await the first wallet only
    const firstIndex = walletIndices[0]
    await recoverWallet(firstIndex, true)

    walletIndices.shift()
    for (const index of walletIndices) {
        recoverWallet(index)
    }
}