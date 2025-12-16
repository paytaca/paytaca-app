import { createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'
// import VuexPersistence from 'vuex-persist'
// import localforage from 'localforage'
// import { sanitizeForIndexedDB } from 'src/utils/migrate-localstorage-to-indexdb'

import anyhedge from './anyhedge'
import global from './global'
import darkmode from './darkmode'
import market from './market'
import marketplace from './marketplace'
import assets from './assets'
import lns from './lns'
import paytacapos from './paytacapos'
import sep20 from './sep20'
import walletconnect from './walletconnect'
import gifts from './gifts'
import notification from './notification'
import ramp from './ramp'
import stablehedge from './stablehedge'
import multisig from './multisig'
import subscription from './subscription'

// const vuexLocal = new VuexPersistence({
//   key: 'vuex',
//   storage: localforage,
//   asyncStorage: true,
//   reducer: (state) => sanitizeForIndexedDB(state)
// })

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

/**
 * Custom serializer that handles circular references and non-serializable objects
 * @param {any} obj - Object to serialize
 * @param {Map} seen - Map of already seen objects to detect circular references
 * @returns {any} Serializable version of the object
 */
function serializeState(obj, seen = new Map()) {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj
  }
  
  // Handle primitives
  if (typeof obj !== 'object') {
    return obj
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    // Check for circular reference
    if (seen.has(obj)) {
      return '[Circular Array]'
    }
    seen.set(obj, true)
    const result = obj.map(item => serializeState(item, seen))
    seen.delete(obj)
    return result
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  // Handle Error objects
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    }
  }
  
  // Skip Proxy objects and other non-serializable objects
  if (obj && typeof obj === 'object') {
    // Check for circular reference
    if (seen.has(obj)) {
      return '[Circular]'
    }
    seen.set(obj, true)
    
    try {
      // Try to serialize, but skip if it fails
      const serialized = {}
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          try {
            const value = obj[key]
            
            // Skip functions and symbols
            if (typeof value === 'function' || typeof value === 'symbol') {
              continue
            }
            
            // Skip wallet instances and other complex objects that might have circular refs
            // Check for common non-serializable patterns
            if (value && typeof value === 'object') {
              // Skip if it looks like a wallet instance (has methods that suggest it's a class instance)
              if (value.constructor && value.constructor.name && 
                  (value.constructor.name.includes('Wallet') || 
                   value.constructor.name.includes('RampWallet'))) {
                // Keep only serializable properties
                if (value.walletHash) {
                  serialized[key] = { walletHash: value.walletHash }
                } else {
                  continue
                }
              } else {
                serialized[key] = serializeState(value, seen)
              }
            } else {
              serialized[key] = value
            }
          } catch (e) {
            // Skip properties that can't be serialized
            continue
          }
        }
      }
      seen.delete(obj)
      return serialized
    } catch (e) {
      seen.delete(obj)
      // If serialization fails, return empty object
      return {}
    }
  }
  
  return obj
}

/**
 * Custom reducer to filter out non-serializable data from state
 * @param {Object} state - Vuex state
 * @returns {Object} Serializable state
 */
function reducer(state) {
  // Create a deep copy without circular references or non-serializable objects
  const serialized = {}
  
  for (const moduleName in state) {
    if (Object.prototype.hasOwnProperty.call(state, moduleName)) {
      try {
        // Special handling for ramp and paytacapos stores with wallet-specific structure
        if (moduleName === 'ramp' || moduleName === 'paytacapos') {
          const moduleState = state[moduleName]
          serialized[moduleName] = {
            byWallet: {},
            // Only include global state (not wallet-specific)
            ...(moduleName === 'ramp' ? {
              itemsPerPage: moduleState.itemsPerPage,
              featureToggles: moduleState.featureToggles
            } : {})
          }
          
          // Serialize wallet-specific state
          if (moduleState.byWallet) {
            for (const walletHash in moduleState.byWallet) {
              if (Object.prototype.hasOwnProperty.call(moduleState.byWallet, walletHash)) {
                const walletState = moduleState.byWallet[walletHash]
                // Remove non-serializable properties (like wallet instances) before serialization
                const cleanWalletState = {}
                for (const key in walletState) {
                  if (Object.prototype.hasOwnProperty.call(walletState, key)) {
                    const value = walletState[key]
                    
                    // Skip wallet instance - it contains circular references and methods
                    if (key === 'wallet' && value && typeof value === 'object') {
                      // Only keep walletHash if available
                      if (value.walletHash) {
                        cleanWalletState.wallet = { walletHash: value.walletHash }
                      }
                      continue
                    }
                    
                    // Skip functions
                    if (typeof value === 'function') {
                      continue
                    }
                    
                    cleanWalletState[key] = value
                  }
                }
                serialized[moduleName].byWallet[walletHash] = serializeState(cleanWalletState, new Map())
              }
            }
          }
        } else {
          // For other modules, serialize normally
          serialized[moduleName] = serializeState(state[moduleName])
        }
      } catch (e) {
        // If serialization fails for a module, skip it
        console.warn(`Failed to serialize ${moduleName} state:`, e)
      }
    }
  }
  
  return serialized
}

export const Store = createStore({
  plugins: [
    // vuexLocal.plugin
    createPersistedState({
      // paths: [
      //   'global.network',
      //   'global.language',
      //   'global.country',
      //   'global.theme',
      //   'global.isChipnet',
      //   'global.enableStablhedge',
      //   'global.enableSmartBCH',
      //   'global.user',
      //   'global.online',
      //   'global.walletIndex',
      //   'global.denomination',
      //   'global.merchantActivity',
      //   'assets.assets',
      //   'assets.ignoredAssets',
      //   'assets.removedAssetIds'
      // ],
      // storage: window.localStorage,
      reducer: reducer,
      getState: (key) => {
        try {
          const value = window.localStorage.getItem(key)
          return value ? JSON.parse(value) : null
        } catch (err) {
          console.error('Error getting persisted state:', err)
          return null
        }
      },
      setState: (key, state) => {
        try {
          // Use custom reducer to serialize state safely
          const serialized = reducer(state)
          window.localStorage.setItem(key, JSON.stringify(serialized))
        } catch (err) {
          console.error('Error setting persisted state:', err)
        }
      }
    })
  ],
  modules: {
    anyhedge,
    global,
    darkmode,
    assets,
    market,
    marketplace,
    lns,
    paytacapos,
    sep20,
    walletconnect,
    gifts,
    notification,
    ramp,
    stablehedge,
    multisig,
    subscription
  },

  // enable strict mode (adds overhead!)
  // for dev mode only
  strict: process.env.DEBUGGING
})

export default function (/* { ssrContext } */) {
  return Store
}
