import { boot } from 'quasar/wrappers'
import useStore from 'src/store'

/**
 * Support for vuex in quasar is dropped in @quasar/app-webpack v4.x.x
 * https://quasar.dev/quasar-cli-webpack/upgrade-guide
 * 
 * Still usable but manual installation is needed
 * Pinia is now recommended for global state management
 */
export default boot((obj) => {
  const store = useStore();
  const { app } = obj
  app.use(store)
})
