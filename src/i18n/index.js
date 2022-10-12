import enUS from './en-us'
import es from './es'

export default {
  'en-us': enUS,
  es
  /*
    NOTE:

    Update the following files when adding a new language:

    1. components/settings/LanguageSelector.vue
      = langs (variable)
      = defaultLocaleOptions (variable)

    2. pages/registration/accounts.vue
      = supportedLangs (variable)
  */
}
