import { boot } from 'quasar/wrappers'
import { migrateVuexLocalStorage } from 'src/utils/migrate-localstorage-to-indexdb'
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
    // Migrate old localStorage to IndexedDB (localforage)
    await migrateVuexLocalStorage()

    const store = useStore();
    const { app } = obj

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
  } catch (err) {
    console.error('Error initializing Vuex store:', err)
    // Initialize store with default state if hydration fails
    const store = useStore()
    obj.app.use(store)
  }
})
