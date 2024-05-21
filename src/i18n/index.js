import enUS from './en-us'
import es from './es'
import esAR from './es-ar'
import zhCN from './zh-cn'
import zhTW from './zh-tw'
import de from './de'
import ha from './ha'
import pt from './pt'
import ptBR from './pt-br'


export const supportedLangs = {
  'en-us': 'English',
  'es': 'Spanish',
  'es-ar': 'ArgentinianSpanish',
  'zh-tw': 'ChineseTraditional',
  'zh-cn': 'ChineseSimplified',
  'de': 'German',
  'ha': 'Hausa',
  'pt': 'Portuguese',
  'pt-br': 'BrazilianPortuguese',
}

/*
  NOTE:

  Update the following files when adding a new language:

  1. this file (see code above) 

  2. components/settings/LanguageSelector.vue
    = defaultLocaleOptions (variable)

  3. pages/registration/accounts.vue
    = supportedLangs (variable)
  
  4. i18n/translate.js
    = supportedLangs (variable)

  5. Add language name to group of texts on i18n/translate.js (words variable)
    = words or phrases variable
    e.g. Chinese: "Chinese"
*/

export default {
  'en-us': enUS,
  'zh-cn': zhCN,
  'zh-tw': zhTW,
  'es-ar': esAR,
  'pt-br': ptBR,
  es,
  de,
  ha,
  pt,
}
