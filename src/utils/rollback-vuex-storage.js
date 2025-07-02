import localforage from 'localforage'

const ROLLBACK_FLAG = 'vuex-rollback-done'

export async function migrateVuexStorage() {
  // This function rolls back Vuex storage from IndexedDB to localStorage
  // IndexedDB data will not be deleted

  console.log('[Migration] Initializing rollback of Vuex storage to localStorage')

  const alreadyRolledBack = window.localStorage.getItem(ROLLBACK_FLAG)
  if (Boolean(alreadyRolledBack) === true) {
    console.log('[Migration] Already rolled back:', alreadyRolledBack)
    return
  }

  try {
    const key = 'vuex'

    // Check if localStorage already has valid data
    const localState = localStorage.getItem(key)
    if (localState) {
      console.info('[Migration] Found existing Vuex data in localStorage. Skipping rollback to avoid overwrite.')
      return
    }
    
    // Fallback: try to get from IndexedDB
    const indexedDBState = await localforage.getItem(key)

    if (indexedDBState) {
      localStorage.setItem(key, JSON.stringify(indexedDBState))
      console.info('[Migration] Vuex state restored from IndexedDB to localStorage.')
      window.localStorage.setItem(ROLLBACK_FLAG, true) // Mark rollback done
    } else {
      console.info('[Migration] No Vuex IndexedDB data found to roll back.')
    }

  } catch (err) {
    console.error('Error rolling back Vuex state to localStorage:', err)
  }
}