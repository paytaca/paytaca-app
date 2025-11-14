<template>
  <q-btn 
    flat 
    align="left" 
    padding="0px"
    @click="openLanguageDialog"
    class="full-width"
  >
    <span class="pt-label" :class="getDarkModeClass(darkMode)">{{ currentLanguageLabel }}</span>
    <q-icon name="arrow_drop_down"/>
  </q-btn>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import LanguageListDialog from './dialogs/LanguageListDialog.vue'

const translationKeys = {
  'af': 'Afrikaans',
  'en-us': 'English',
  'zh-cn': 'ChineseSimplified',
  'zh-tw': 'ChineseTraditional',
  'nl': 'Dutch',
  'fr': 'French',
  'de': 'German',
  'ha': 'Hausa',
  'id': 'Indonesian',
  'it': 'Italian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'pt': 'Portuguese',
  'pt-br': 'BrazilianPortuguese',
  'es': 'Spanish',
  'es-ar': 'ArgentinianSpanish',
  'tl': 'Tagalog',
  'ru': 'Russian',
  'ar': 'Arabic'
}

export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    currentLanguage () {
      return this.$store.getters['global/language'] || 'en-us'
    },
    currentLanguageLabel () {
      const langCode = this.currentLanguage
      console.log('[LanguageSelector] Current language code:', langCode)
      
      // Normalize to lowercase for lookup
      const normalizedLangCode = langCode ? langCode.toLowerCase() : 'en-us'
      
      // Handle both 'en' and 'en-us' for English
      let lookupCode = normalizedLangCode
      if (normalizedLangCode === 'en') {
        lookupCode = 'en-us'
      }
      
      // Get the translation key for this language code (e.g., "English" for "en-us")
      const translationKey = translationKeys[lookupCode] || translationKeys[normalizedLangCode]
      console.log('[LanguageSelector] Translation key found:', translationKey, 'for code:', lookupCode)
      
      if (!translationKey) {
        // If no translation key found, try to find a reasonable display name
        // For 'en' or other short codes, map to full names
        if (langCode && langCode.length <= 2) {
          // Map common 2-letter codes to full names
          const shortCodeMap = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'pt': 'Portuguese',
            'it': 'Italian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'ar': 'Arabic',
            'ru': 'Russian',
            'nl': 'Dutch',
            'id': 'Indonesian',
            'tl': 'Tagalog',
            'ha': 'Hausa',
            'af': 'Afrikaans'
          }
          const mapped = shortCodeMap[langCode.toLowerCase()]
          if (mapped) {
            console.log('[LanguageSelector] Using short code map:', mapped)
            // Translate the mapped key
            return this.$t(mapped)
          }
          // If no mapping found, return uppercase language code
          console.warn('[LanguageSelector] No mapping found for short code:', langCode)
          return langCode.toUpperCase()
        }
        // If no translation key found, return uppercase language code (but not truncated)
        console.warn('[LanguageSelector] No translation key found for:', langCode)
        return langCode
      }
      
      // Translate the translation key to show the language name in the current language
      // For example, if current language is Spanish and selected language is English,
      // this will show "Inglés" instead of "English"
      console.log('[LanguageSelector] Translating key:', translationKey)
      return this.$t(translationKey)
    }
  },
  methods: {
    getDarkModeClass,
    openLanguageDialog () {
      this.$q.dialog({
        component: LanguageListDialog
      })
      .onOk(lang => {
        if (lang && lang.value) {
          this.$i18n.locale = lang.value
          this.$store.commit('global/setLanguage', lang.value)

          const denomination = this.$store.getters['global/denomination']
          // Only update denomination if it's not a standard one
          if (!['BCH', 'mBCH', 'Satoshis'].includes(denomination)) {
            try {
              const deemValue = this.$t('DEEM')
              if (!['zh-tw', 'zh-cn'].includes(lang.value) && denomination !== deemValue) {
                this.$store.commit('global/setDenomination', 'DEEM')
              } else if (denomination !== deemValue) {
                // Try to translate the denomination, but only if it's not already a standard value
                try {
                  const translatedDenom = this.$t(denomination)
                  if (translatedDenom && translatedDenom !== denomination) {
                    this.$store.commit('global/setDenomination', translatedDenom)
                  }
                } catch (error) {
                  // If translation fails, keep current denomination
                  console.warn('Could not translate denomination:', denomination, error)
                }
              }
            } catch (error) {
              // If DEEM translation fails, just keep current denomination
              console.warn('Could not translate DEEM:', error)
            }
          }
          
          // Persist preferences to backend if wallet hash exists
          this.$store.dispatch('global/saveWalletPreferences').catch(() => {
            // Silently fail if wallet hash doesn't exist yet (e.g., during registration)
          })
        }
      })
    }
  }
}
</script>
