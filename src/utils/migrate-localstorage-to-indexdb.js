import localforage from 'localforage'

const MIGRATION_FLAG = 'vuex-migration-done'

export function sanitizeForIndexedDB(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    // Remove uncloneable types
    if (
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      typeof value === 'undefined'
    ) {
      return undefined
    }

    // Convert Sets and Maps to arrays
    if (value instanceof Set || value instanceof Map) {
      return Array.from(value)
    }

    // Handle special object types (e.g., Dates, custom classes)
    if (
      typeof value === 'object' &&
      value !== null &&
      value.constructor &&
      value.constructor !== Object &&
      !Array.isArray(value)
    ) {
      return { ...value }
    }

    // Arrays and plain objects are kept as-is, and handled by JSON.stringify recursively
    return value
  }))
}

export async function migrateVuexLocalStorage() {
  console.log('[Migration] Initializing migration of Vuex local storage to indexedDB')

  // Check if migration already done
  const alreadyMigrated = window.localStorage.getItem(MIGRATION_FLAG)
  console.log('[Migration] Migration flag value:', alreadyMigrated, 'Type:', typeof alreadyMigrated)
  if (Boolean(alreadyMigrated) === true) {
    console.log('[Migration] Migration already completed, skipping')
    return
  }

  try {
    const key = 'vuex'
    const state = localStorage.getItem(key)
    console.log('[Migration] localStorage vuex data found:', !!state)
    console.log('[Migration] localStorage vuex data length:', state ? state.length : 0)
    
    if (state) {
      console.log('[Migration] Parsing localStorage data...')
      const migratedState = JSON.parse(state)
      console.log('[Migration] Parsed state keys:', Object.keys(migratedState))
      console.log('[Migration] Global state keys:', migratedState.global ? Object.keys(migratedState.global) : 'No global state')
      
      const sanitizedState = sanitizeForIndexedDB(migratedState)
      console.log('[Migration] Sanitized state keys:', Object.keys(sanitizedState))
      
      console.log('[Migration] Saving to IndexedDB...')
      await localforage.setItem(key, sanitizedState)
      console.info('[Migration] Vuex state migrated to IndexedDB successfully')
      
      console.log('[Migration] Cleaning up localStorage...')
      localStorage.removeItem(key) // optional: cleanup
      window.localStorage.setItem(MIGRATION_FLAG, 'true') // Mark migration done
      console.log('[Migration] Migration completed and flagged')
    } else {
      console.info('[Migration] No Vuex localStorage data to migrate.')
      // Still mark as migrated to avoid repeated checks
      window.localStorage.setItem(MIGRATION_FLAG, 'true')
    }

  } catch (err) {
    console.error('[Migration] Error migrating Vuex state to IndexedDB:', err)
    // Mark as migrated even on error to prevent infinite retries
    window.localStorage.setItem(MIGRATION_FLAG, 'true')
  }
}
