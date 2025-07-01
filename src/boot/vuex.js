import { boot } from 'quasar/wrappers'
import { migrateVuexLocalStorage } from 'src/utils/migrate-localstorage-to-indexdb'
import { hydrateWallet } from 'src/utils/wallet-hydration'
import useStore from 'src/store'

/**
 * Support for vuex in quasar is dropped in @quasar/app-webpack v4.x.x
 * https://quasar.dev/quasar-cli-webpack/upgrade-guide
 *
 * Still usable but manual installation is needed
 * Pinia is now recommended for global state management
 */
export default boot(async (obj) => {
  console.log('[Vuex Boot] Starting Vuex initialization...')
  
  try {
    // Migrate old localStorage to IndexedDB (localforage)
    console.log('[Vuex Boot] Starting migration...')
    await migrateVuexLocalStorage()
    console.log('[Vuex Boot] Migration completed')

    const store = useStore();
    const { app } = obj
    
    console.log('[Vuex Boot] Store created, starting wallet hydration...')
    await hydrateWallet()
    console.log('[Vuex Boot] Wallet hydration completed')

    // Add error handler for store mutations
    store.subscribe((mutation, state) => {
      try {
        // Log any state changes that might be problematic
        if (mutation.type.includes('update') || mutation.type.includes('set')) {
          console.debug('[Vuex Boot] Store mutation:', mutation.type, mutation.payload)
        }
      } catch (err) {
        console.error('[Vuex Boot] Error in store mutation:', err)
      }
    })

    console.log('[Vuex Boot] Adding store to app...')
    app.use(store)
    console.log('[Vuex Boot] Vuex initialization completed successfully')
  } catch (err) {
    console.error('[Vuex Boot] Error initializing Vuex store:', err)
    // Initialize store with default state if hydration fails
    const store = useStore()
    obj.app.use(store)
  }
})
