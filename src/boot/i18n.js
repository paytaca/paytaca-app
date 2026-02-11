import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'
// Import useStore function (not Store instance) to avoid circular dependency
// The function itself doesn't access Store until called
import useStore from 'src/store'

// Create i18n instance with default locale first (to avoid circular dependency)
// The locale will be updated in the boot function once the store is available
const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en-us', // Default locale, will be updated in boot function
  fallbackLocale: 'en-us',
  messages
})

export default boot(({ app }) => {
  // vuex boot runs before i18n boot, so the store should be available
  try {
    const store = useStore()
    
    if (store && store.getters && store.getters['global/language']) {
      const locale = store.getters['global/language']
      if (locale && locale !== i18n.global.locale.value) {
        i18n.global.locale.value = locale
      }
    }
  } catch (error) {
    console.warn('[i18n boot] Could not read locale from store:', error)
    // Continue with default locale
  }
  
  // Set i18n instance on app
  app.use(i18n)
})

export { i18n }
