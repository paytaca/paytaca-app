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
          window.localStorage.setItem(key, JSON.stringify(state))
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
    multisig
  },

  // enable strict mode (adds overhead!)
  // for dev mode only
  strict: process.env.DEBUGGING
})

export default function (/* { ssrContext } */) {
  return Store
}
