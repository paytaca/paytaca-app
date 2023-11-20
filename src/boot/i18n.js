import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'
import { Store } from 'src/store'

const locale = Store.getters['global/language'].value
const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale,
  fallbackLocale: 'en-us',
  messages
})

export default boot(({ app }) => {  
  // Set i18n instance on app
  app.use(i18n)
})

export { i18n }
