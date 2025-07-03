import { boot } from 'quasar/wrappers'
import { migrateVuexStorage } from 'src/utils/indexed-db-rollback/rollback-vuex-storage'
import { recoverWalletsFromStorage } from 'src/utils/indexed-db-rollback/wallet-recovery'
import { sanitizeVault } from 'src/utils/indexed-db-rollback/wallet-vault'
import { updatePreferences } from 'src/utils/indexed-db-rollback/update-preferences'
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
      store.replaceState(JSON.parse(persistedState))
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

    sanitizeVault()
    await recoverWalletsFromStorage()
    updatePreferences()
    
  } catch (err) {
    console.error('Error initializing Vuex store:', err)
    // Initialize store with default state if hydration fails
    const store = useStore()
    obj.app.use(store)
  }
})
