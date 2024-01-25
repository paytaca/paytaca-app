<template>
  <div class="col">
    <div class="row justify-center text-center">
      <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">{{ $t('ThemePreferenceTitle') }}</h5><br/>
    </div>
    <div class="row justify-center q-mt-sm dim-text text-center">
      <p>{{ $t('ThemePreferenceSubtitle') }}</p>
    </div>
    <div class="row justify-center themes-preview-container">
      <q-card class="full-width pt-card" :class="getDarkModeClass(darkMode)">
        <template v-for="(themeElem, index) in themesList" v-bind:key="index">
          <q-card-section class="q-pt-xs q-pb-md">
            <q-radio
              v-model="selectedTheme"
              :val="themeElem.value"
              :label="$t('ThemeName', { theme: themeElem.label }, `${themeElem.label} Theme`)"
              class="pt-label"
              :class="getDarkModeClass(darkMode)"
            />
            <q-card class="row justify-evenly bg-grey-7">
              <q-card-section class="q-pa-sm">
                <PreviewTemplate :theme="themeElem.value" :mode="`light`" />
              </q-card-section>
              <q-separator inset vertical color="white" />
              <q-card-section class="q-pa-sm">
                <PreviewTemplate :theme="themeElem.value" :mode="`dark`" />
              </q-card-section>
            </q-card>
          </q-card-section>
        </template>
      </q-card>
    </div>
    <div class="row justify-center">
      <q-btn rounded :label="$t('Continue')" class="q-mt-lg full-width button" @click="choosePreferedSecurity"/>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import PreviewTemplate from './PreviewTemplate.vue'

export default {
  name: 'ThemeSelectorPreview',
  props: {
    choosePreferedSecurity: { type: Function }
  },
  components: {
    PreviewTemplate
  },
  data () {
    return {
      selectedTheme: 'default',
      themesList: [
        { value: 'default', label: this.$t('Default') }
      ]
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    }
  },
  methods: {
    getDarkModeClass
  },
  mounted () {
    this.selectedTheme = this.theme || 'default'
  },
  watch: {
    selectedTheme () {
      this.$store.commit('global/setTheme', this.selectedTheme)
    }
  }
}
</script>

<style lang="scss" scoped>
  .themes-preview-container {
    max-height: 47vh;
    overflow-y: scroll;
  }
</style>
