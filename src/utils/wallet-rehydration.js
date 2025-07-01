import { getMnemonic, Wallet } from 'src/wallet'
import { Store } from 'src/store'
import { tr } from 'date-fns/locale';

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

async function initWallet(index, save=false) {
    const store = Store
    const mnemonic = await getMnemonic(index)
    console.log('[WalletRehydration] Initializing wallet for index:', index)
    console.log('[WalletRehydration] mnemonic:', mnemonic)

    if (!mnemonic) {
        console.warn('[WalletRehydration] No mnemonic found for index:', index)
        return null
    }

    const wallet = new Wallet(mnemonic)
    console.log('[WalletRehydration] Loaded wallet:', wallet)
    const bchWallets = [wallet.BCH, wallet.BCH_CHIP]
    const slpWallets = [wallet.SLP, wallet.SLP_TEST]

    console.log('[WalletRehydration] bchWallets:', bchWallets)
    console.log('[WalletRehydration] slpWallets:', slpWallets)

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

            console.log('[WalletRehydration] bchWallet:', walletTypeInfo)
        })

        await bchWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'bch',
                xPubKey: xpub
            }

            if (save) {
                store.commit('global/updateXPubKey', xPubInfo)
            }
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

            if (save) {
                store.commit('global/updateWallet', walletTypeInfo)
            }
            
            console.log('[WalletRehydration] slpWallet:', walletTypeInfo)
        })

        await slpWallet.getXPubKey().then(function (xpub) {
            const xPubInfo = {
                isChipnet,
                type: 'slp',
                xPubKey: xpub
            }

            if (save) {
                store.commit('global/updateXPubKey', xPubInfo)
            }
        })
    }

    const walletHashes = [
        wallet.BCH.walletHash,
        wallet.BCH_CHIP.walletHash,
        wallet.SLP.walletHash,
        wallet.SLP_TEST.walletHash,
        wallet.sBCH.walletHash,
    ]
    // $pushNotifications?.subscribe?.(walletHashes, walletIndex, true)

    // let wallet = .getters.getAllWalletTypes
    // wallet = JSON.stringify(wallet)
    // wallet = JSON.parse(wallet)

    // let chipnet = context.getters.getAllChipnetTypes
    // chipnet = JSON.stringify(chipnet)
    // chipnet = JSON.parse(chipnet)
    // const info = {
    //   wallet: wallet,
    //   chipnet: chipnet
    // }
    // context.commit('updateVault', info)   
}

export async function initWalletsFromStorage() {
    console.log('[WalletRehydration] Initializing wallets from storage...')
    
    // Check first if vault and wallets are empty
    const isVaultEmpty = Store.getters['global/isVaultEmpty']
    const storedBchWallet = Store.getters['global/getWallet']('bch')
    const storedSlpWallet = Store.getters['global/getWallet']('slp')

    if (!isVaultEmpty || (storedBchWallet?.walletHash !== '' && storedSlpWallet?.walletHash === '')) {
        console.log('[WalletRehydration] Vault or wallets are not empty, skipping rehydration.')
        return 
    }

    const walletIndices = await getWalletIndicesFromStorage()
    console.log('[WalletRehydration] walletIndices:', walletIndices);

    // Await the first wallet only
    const firstIndex = walletIndices[0]
    await initWallet(firstIndex, true)

    walletIndices.shift()

    for (const index of walletIndices) {
        initWallet(index)
    }
    console.log('[WalletRehydration] walletTypes====:', Store.getters['global/getAllWalletTypes'])

}