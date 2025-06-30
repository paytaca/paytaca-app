import localforage from "localforage";
import useStore from 'src/store';

export async function hydrateWallet() {
    console.log('[Hydration] Starting wallet hydration...')
    const store = useStore()
    
    const persisted = await localforage.getItem('vuex')
    
    console.log('[Hydration] Persisted data found:', !!persisted)
    
    if (!persisted || !persisted.global) {
        console.log('[Hydration] No persisted data found or no global state')
        return
    }
    
    const vault = persisted.global.vault
    const walletIndex = persisted.global.walletIndex
    const isChipnet = persisted.global.isChipnet
    
    console.log('[Hydration] Vault:', vault)
    console.log('[Hydration] Wallet index:', walletIndex)
    console.log('[Hydration] Is chipnet:', isChipnet)
    
    // hydrate walletIndex and vault
    console.log('[Hydration] Updating store with wallet index...')
    store.commit('global/updateWalletIndex', walletIndex)
    
    // Update the store's vault state with persisted data
    if (vault && Array.isArray(vault) && vault.length > 0) {
        console.log('[Hydration] Vault has data, updating store vault...')
        // Update the store's vault state
        store.commit('global/updateVaultFromHydration', vault)
    } else {
        console.log('[Hydration] No valid vault data found')
    }
    
    // Check if we need to sync wallet data from chipnet to mainnet or vice versa
    const chipnetWallet = persisted.global.chipnet__wallets?.bch
    const mainnetWallet = persisted.global.wallets?.bch
    const chipnetSlpWallet = persisted.global.chipnet__wallets?.slp
    const mainnetSlpWallet = persisted.global.wallets?.slp
    
    console.log('[Hydration] Chipnet BCH wallet:', chipnetWallet)
    console.log('[Hydration] Mainnet BCH wallet:', mainnetWallet)
    console.log('[Hydration] Chipnet SLP wallet:', chipnetSlpWallet)
    console.log('[Hydration] Mainnet SLP wallet:', mainnetSlpWallet)
    
    // If we're in mainnet mode but only have chipnet data, copy it over
    if (!isChipnet && chipnetWallet?.walletHash && !mainnetWallet?.walletHash) {
        console.log('hydrateWallet - Copying chipnet wallet data to mainnet')
        store.commit('global/updateWallet', {
            type: 'bch',
            walletHash: chipnetWallet.walletHash,
            derivationPath: chipnetWallet.derivationPath,
            lastAddress: chipnetWallet.lastAddress,
            lastChangeAddress: chipnetWallet.lastChangeAddress,
            lastAddressIndex: chipnetWallet.lastAddressIndex,
            connectedAddress: chipnetWallet.connectedAddress,
            connectedAddressIndex: chipnetWallet.connectedAddressIndex,
            connectedSites: chipnetWallet.connectedSites
        })
        
        if (chipnetWallet.xPubKey) {
            store.commit('global/updateXPubKey', {
                type: 'bch',
                xPubKey: chipnetWallet.xPubKey
            })
        }
    }
    
    // If we're in mainnet mode but only have chipnet SLP data, copy it over
    if (!isChipnet && chipnetSlpWallet?.walletHash && !mainnetSlpWallet?.walletHash) {
        console.log('hydrateWallet - Copying chipnet SLP wallet data to mainnet')
        store.commit('global/updateWallet', {
            type: 'slp',
            walletHash: chipnetSlpWallet.walletHash,
            derivationPath: chipnetSlpWallet.derivationPath,
            lastAddress: chipnetSlpWallet.lastAddress,
            lastChangeAddress: chipnetSlpWallet.lastChangeAddress,
            lastAddressIndex: chipnetSlpWallet.lastAddressIndex,
            connectedAddress: chipnetSlpWallet.connectedAddress,
            connectedAddressIndex: chipnetSlpWallet.connectedAddressIndex,
            connectedSites: chipnetSlpWallet.connectedSites
        })
        
        if (chipnetSlpWallet.xPubKey) {
            store.commit('global/updateXPubKey', {
                type: 'slp',
                xPubKey: chipnetSlpWallet.xPubKey
            })
        }
    }
    
    // If we're in chipnet mode but only have mainnet data, copy it over
    if (isChipnet && mainnetWallet?.walletHash && !chipnetWallet?.walletHash) {
        console.log('hydrateWallet - Copying mainnet wallet data to chipnet')
        store.commit('global/updateWallet', {
            isChipnet: true,
            type: 'bch',
            walletHash: mainnetWallet.walletHash,
            derivationPath: mainnetWallet.derivationPath,
            lastAddress: mainnetWallet.lastAddress,
            lastChangeAddress: mainnetWallet.lastChangeAddress,
            lastAddressIndex: mainnetWallet.lastAddressIndex,
            connectedAddress: mainnetWallet.connectedAddress,
            connectedAddressIndex: mainnetWallet.connectedAddressIndex,
            connectedSites: mainnetWallet.connectedSites
        })
        
        if (mainnetWallet.xPubKey) {
            store.commit('global/updateXPubKey', {
                isChipnet: true,
                type: 'bch',
                xPubKey: mainnetWallet.xPubKey
            })
        }
    }
    
    // If we're in chipnet mode but only have mainnet SLP data, copy it over
    if (isChipnet && mainnetSlpWallet?.walletHash && !chipnetSlpWallet?.walletHash) {
        console.log('hydrateWallet - Copying mainnet SLP wallet data to chipnet')
        store.commit('global/updateWallet', {
            isChipnet: true,
            type: 'slp',
            walletHash: mainnetSlpWallet.walletHash,
            derivationPath: mainnetSlpWallet.derivationPath,
            lastAddress: mainnetSlpWallet.lastAddress,
            lastChangeAddress: mainnetSlpWallet.lastChangeAddress,
            lastAddressIndex: mainnetSlpWallet.lastAddressIndex,
            connectedAddress: mainnetSlpWallet.connectedAddress,
            connectedAddressIndex: mainnetSlpWallet.connectedAddressIndex,
            connectedSites: mainnetSlpWallet.connectedSites
        })
        
        if (mainnetSlpWallet.xPubKey) {
            store.commit('global/updateXPubKey', {
                isChipnet: true,
                type: 'slp',
                xPubKey: mainnetSlpWallet.xPubKey
            })
        }
    }
    
    // Ensure current wallet data is loaded from vault
    if (vault && vault[walletIndex]) {
        console.log('hydrateWallet - Calling updateCurrentWallet with index:', walletIndex)
        store.commit('global/updateCurrentWallet', walletIndex)
    } else {
        console.log('hydrateWallet - No vault data at index:', walletIndex)
    }
}