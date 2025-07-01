import localforage from "localforage";
import useStore from 'src/store';

const store = useStore()
const persisted = await localforage.getItem('vuex')

export async function hydrateWallet() {
    const vault = persisted.global.vault
    const walletIndex = persisted.global.walletIndex
    
    // hydrate walletIndex and vault
    store.commit('global/updateWalletIndex', walletIndex)
    store.commit('global/updateVault', vault)
}