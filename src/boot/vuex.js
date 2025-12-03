import { boot } from 'quasar/wrappers'
import { migrateVuexStorage } from 'src/utils/indexed-db-rollback/rollback-vuex-storage'
import { populateMissingVaults, recoverWalletsFromStorage } from 'src/utils/indexed-db-rollback/wallet-recovery'
import { updatePreferences } from 'src/utils/indexed-db-rollback/update-preferences'
import { resetWalletsAssetsList } from 'src/utils/indexed-db-rollback/reset-asset-list'
import { getAllWalletNames } from 'src/utils/wallet-name-cache'
import { migrateMnemonicsToWalletHash } from 'src/wallet/mnemonic-migration'
import useStore from 'src/store'

/**
 * Support for vuex in quasar is dropped in @quasar/app-webpack v4.x.x
 * https://quasar.dev/quasar-cli-webpack/upgrade-guide
 *
 * Still usable but manual installation is needed
 * Pinia is now recommended for global state management
 */
export default boot(async (obj) => {
  try {

    await migrateVuexStorage()

    const store = useStore();
    const { app } = obj

    // Hydrate Vuex store from localStorage if available
    // This is a manual hydration step to ensure the store is populated
    const persistedState = localStorage.getItem('vuex')
    if (persistedState) {
      const parsedState = JSON.parse(persistedState)
      
      // Ensure new wallet-specific structure exists after hydration
      // Migrate old structure to new structure if needed
      if (parsedState.ramp && !parsedState.ramp.byWallet) {
        parsedState.ramp.byWallet = {}
        // If there's old state data, we could migrate it here, but for now we'll start fresh
        // to avoid complexity and potential issues
      }
      if (parsedState.paytacapos && !parsedState.paytacapos.byWallet) {
        parsedState.paytacapos.byWallet = {}
      }
      
      store.replaceState(parsedState)
      console.log('[Hydration] Vuex state manually hydrated.')
    }

    // Add error handler for store mutations
    store.subscribe((mutation, state) => {
      try {
        // Log any state changes that might be problematic
        if (mutation.type.includes('update') || mutation.type.includes('set')) {
          console.debug('Store mutation:', mutation.type, mutation.payload)
        }
      } catch (err) {
        console.error('Error in store mutation:', err)
      }
    })

    app.use(store)

    await recoverWalletsFromStorage().catch(error => {
      store.commit('global/setWalletRecoveryMessage', String(error))
    })
    await resetWalletsAssetsList()
    updatePreferences()
    populateMissingVaults()
    
    // Migrate mnemonics to wallet-hash-based keys
    // This should run after wallet recovery but before cleanup
    await migrateMnemonicsToWalletHash().catch(error => {
      console.error('[Boot] Error migrating mnemonics:', error)
    })
    
    // Migrate existing wallets to have wallet-specific settings
    // This applies current global settings to all existing wallets for smooth migration
    store.dispatch('global/migrateWalletSettings')
    
    // Load cached wallet names on startup to populate vault names if empty
    loadCachedWalletNames(store)
    
    // Clean up null and deleted vault entries on startup
    store.dispatch('global/cleanupNullAndDeletedWallets')
    
    // Ensure current wallet index is valid (points to undeleted wallet)
    // This should run after wallets are recovered
    // Note: This is async but we don't await it here to avoid blocking boot
    // The router and App.vue will also call it and await it
    store.dispatch('global/ensureValidWalletIndex').catch(console.error)
  } catch (err) {
    console.error('Error initializing Vuex store:', err)
    // Initialize store with default state if hydration fails
    const store = useStore()
    obj.app.use(store)
  }
})

/**
 * Load cached wallet names and populate vault if names are empty
 * This ensures wallet names are available immediately, even before server sync
 */
function loadCachedWalletNames(store) {
  try {
    const cachedNames = getAllWalletNames()
    const vault = store.getters['global/getVault']
    
    if (!vault || vault.length === 0) return
    
    // Update vault names from cache if they're empty
    vault.forEach((wallet, index) => {
      const walletHash = wallet?.wallet?.bch?.walletHash
      if (walletHash && (!wallet.name || wallet.name === '')) {
        const cachedName = cachedNames[walletHash]
        if (cachedName) {
          store.commit('global/updateWalletName', { index, name: cachedName })
        }
      }
    })
  } catch (error) {
    console.error('Error loading cached wallet names:', error)
  }
}
