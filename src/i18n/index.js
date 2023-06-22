import enUS from './en-us'
import es from './es'
import zhCN from './zh-cn'
import zhTW from './zh-tw'

export default {
  'en-us': enUS,
  'zh-cn': zhCN,
  'zh-tw': zhTW,
  es,
  /*
    NOTE:

    Update the following files when adding a new language:

    1. this file (see code above) 

    2. components/settings/LanguageSelector.vue
      = langs (variable)
      = defaultLocaleOptions (variable)

    3. pages/registration/accounts.vue
      = supportedLangs (variable)
    
    4. i18n/translate.js
      = supportedLangs (variable)

    5. Add language name to group of texts on i18n/translate.js
      = words or phrases variable
  */
}
