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
  if (Boolean(alreadyMigrated) === true) {
    console.log('[Migration] alreadyMigrated:', alreadyMigrated)
    return
  }

  try {
    const key = 'vuex'
    const state = localStorage.getItem(key)
    if (state) {
      const migratedState = JSON.parse(state)
      const sanitizedState = sanitizeForIndexedDB(migratedState)
      await localforage.setItem(key, sanitizedState)
      console.info('[Migration] Vuex state migrated to IndexedDB.')
      localStorage.removeItem(key) // optional: cleanup
      window.localStorage.setItem(MIGRATION_FLAG, true) // Mark migration done
    } else {
      console.info('[Migration] No Vuex localStorage data to migrate.')
    }

  } catch (err) {
    console.error('Error migrating Vuex state to IndexedDB:', err)
  }
}
