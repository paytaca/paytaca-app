<template>
  <q-select
    :style="{ width: this.$q.platform.is.mobile ? '75%' : '100%' }"
    v-model="locale"
    :options="localeOptions"
    :dark="darkMode"
    @filter="filterLangSelection"
    popup-content-style="color: black;"
    dense
    use-input
    fill-input
    borderless
    hide-selected
  >
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
import { supportedLangs } from '../../i18n'

export default {
  props: {
    darkMode: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      // locale: this.$store.getters['global/language'],
      defaultLocaleOptions: [
        { value: 'en-us', label: this.$t('English') },
        { value: 'zh-cn', label: this.$t('ChineseSimplified') },
        { value: 'zh-tw', label: this.$t('ChineseTraditional') },
        { value: 'de', label: this.$t('German') },
        { value: 'es', label: this.$t('Spanish') },
      ],
      localeOptions: []
    }
  },
  methods: {
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
    }
  },
  computed: {
    locale: {
      get () {
        return this.$store.getters['global/language']
      },
      set (lang) {
        this.$i18n.locale = lang.value
        const newLocale = { value: lang.value, label: this.$t(supportedLangs[lang.value]) }
        this.$store.commit('global/setLanguage', newLocale)
      }
    }
  }
}
</script>
