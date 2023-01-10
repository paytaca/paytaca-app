import { createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'

import anyhedge from './anyhedge'
import global from './global'
import darkmode from './darkmode'
import market from './market'
import assets from './assets'
import lns from './lns'
import paytacapos from './paytacapos'
import sep20 from './sep20'
import walletconnect from './walletconnect'
import gifts from './gifts'
import chat from './chat'

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Store instance.
 */

export default function (/* { ssrContext } */) {
  const Store = createStore({
    plugins: [createPersistedState()],
    modules: {
      anyhedge,
      global,
      darkmode,
      assets,
      market,
      lns,
      paytacapos,
      sep20,
      walletconnect,
      gifts,
      chat
    },

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: process.env.DEBUGGING
  })

  return Store
}
