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
      return this.$t(translationKeys[this.currentLanguage])
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
          if (!['zh-tw', 'zh-cn'].includes(lang.value) &&
              denomination !== this.$t('DEEM') &&
              !['BCH', 'mBCH', 'Satoshis'].includes(denomination)
          ) {
            this.$store.commit('global/setDenomination', 'DEEM')
          } else {
            const translatedDenom = this.$t(denomination)
            this.$store.commit('global/setDenomination', translatedDenom)
          }
        }
      })
    }
  }
}
</script>
