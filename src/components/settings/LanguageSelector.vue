<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="locale"
    :options="localeOptions"
    :option-label="getOptionLabel"
    :dark="darkMode"
    @filter="filterLangSelection"
    popup-content-style="color: black;"
    filled
    use-input
    fill-input
    borderless
    hide-selected
    hide-dropdown-icon
    bg-color="white"
    dense
  >
    <template v-slot:prepend>    
      <q-icon size="sm" name="keyboard_arrow_down" class="q-pr-sm"/>
    </template>
    <template v-slot:option="scope">
      <q-item
        v-bind="scope.itemProps"
      >
        <q-item-section>
          <q-item-label :class="{ 'text-black': !darkMode && !scope.selected }">
            {{ scope.opt.label }}
          </q-item-label>
          <q-item-label
            v-if="scope.opt.value"
            caption
            :class="{ 'text-black': !darkMode && !scope.selected }"
          >
            {{ scope.opt.value }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script>
// const localeOptionsLabels = [
//   'English', 'ChineseSimplified', 'ChineseTraditional', 'Dutch',
//   'French', 'German', 'Hausa', 'Indonesian', 'Italian', 'Russian',
//   'Japanese', 'Korean', 'Portuguese', 'BrazilianPortuguese', 'Spanish',
//   'ArgentinianSpanish', 'Tagalog', 'Russian'
// ]
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
  data () {
    return {
      defaultLocaleOptions: [
        { value: 'en-us', label: this.$t('English') },
        { value: 'zh-cn', label: this.$t('ChineseSimplified') },
        { value: 'zh-tw', label: this.$t('ChineseTraditional') },
        { value: 'nl', label: this.$t('Dutch') },
        { value: 'fr', label: this.$t('French') },
        { value: 'de', label: this.$t('German') },
        { value: 'ha', label: this.$t('Hausa') },
        { value: 'id', label: this.$t('Indonesian') },
        { value: 'it', label: this.$t('Italian') },
        { value: 'ja', label: this.$t('Japanese') },
        { value: 'ko', label: this.$t('Korean') },
        { value: 'pt', label: this.$t('Portuguese') },
        { value: 'pt-br', label: this.$t('BrazilianPortuguese') },
        { value: 'es', label: this.$t('Spanish') },
        { value: 'es-ar', label: this.$t('ArgentinianSpanish') },
        { value: 'tl', label: this.$t('Tagalog') },
        { value: 'af', label: this.$t('Afrikaans') },
        { value: 'ru', label: this.$t('Russian') },
        { value: 'ar', label: this.$t('Arabic') }
      ],
      localeOptions: []
    }
  },
  methods: {
    getOptionLabel (opt) {
      const match = this.defaultLocaleOptions.filter(lang => lang.value === opt && opt)
      if (match.length > 0) {
        return match[0].label
      } else {
        return opt
      }
    },
    filterLangSelection (val, update) {
      if (!val) {
        this.localeOptions = this.defaultLocaleOptions
      } else {
        const needle = String(val).toLowerCase()
        this.localeOptions = this.defaultLocaleOptions
          .filter(lang =>
            String(lang && lang.label).toLowerCase().indexOf(needle) >= 0
          )
      }

      update()
    },
    translateOptionsToCurrentLang () {
      const vm = this
      const tempOptions = []

      vm.defaultLocaleOptions.forEach((option, index) => {
        tempOptions.push({
          value: option.value,
          label: vm.$t(translationKeys[option.value])
        })
      })
      vm.defaultLocaleOptions = tempOptions
    }
  },
  computed: {
    locale: {
      get () {
        return this.$store.getters['global/language'] || 'en-us'
      },
      set (lang) {
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

          this.translateOptionsToCurrentLang()
        }
      }
    }
  }
}
</script>
