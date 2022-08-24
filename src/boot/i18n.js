import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

const i18n = createI18n({
  locale: 'en-us',
  fallbackLocale: 'en-us',
  messages
})

export default boot(({ app }) => {  
  // Set i18n instance on app
  app.i18n = i18n
})

export { i18n }
