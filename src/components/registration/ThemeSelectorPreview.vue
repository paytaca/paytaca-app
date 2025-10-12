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
                <div class="row items-center q-pb-xs text-capitalize text-weight-bold">
                  <q-radio
                    size="xs"
                    class="prev-radio"
                    :val="`${themeElem.value} light`"
                    v-model="selectedMode"
                  />
                  {{ $t('LightMode') }}
                </div>
                <PreviewTemplate :theme="themeElem.value" :mode="`light`" />
              </q-card-section>
              <q-separator inset vertical color="white" />
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-pb-xs text-capitalize text-weight-bold">
                  <q-radio
                    size="xs"
                    class="prev-radio"
                    :val="`${themeElem.value} dark`"
                    v-model="selectedMode"
                  />
                  {{ $t('DarkMode') }}
                </div>
                <PreviewTemplate :theme="themeElem.value" :mode="`dark`" />
              </q-card-section>
            </q-card>
          </q-card-section>
        </template>
      </q-card>
    </div>
    <div class="row justify-center">
      <q-btn rounded :label="$t('Continue')" class="q-mt-lg full-width button" @click="choosePreferedSecurity" id="Continue"/>
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
      selectedTheme: 'glassmorphic-blue',
      selectedMode: 'glassmorphic-blue dark',
      themesList: [
        { value: 'glassmorphic-blue', label: this.$t('GlassmorphicBlue') },
        { value: 'glassmorphic-red', label: this.$t('GlassmorphicRed') },
        { value: 'glassmorphic-green', label: this.$t('GlassmorphicGreen') },
        { value: 'glassmorphic-gold', label: this.$t('GlassmorphicGold') }
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
    this.selectedTheme = this.theme || 'glassmorphic-blue'
  },
  watch: {
    selectedTheme () {
      this.$store.commit('global/setTheme', this.selectedTheme)
      this.selectedMode = `${this.selectedTheme} ${this.darkMode ? 'dark' : 'light'}`
    },
    selectedMode () {
      const themeMode = this.selectedMode.split(' ')
      this.$store.commit('global/setTheme', themeMode[0])
      this.$store.commit('darkmode/setDarkmodeSatus', themeMode[1] === 'dark')
      this.selectedTheme = themeMode[0]
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

<style lang="scss">
  .prev-radio.q-radio > .q-radio__inner--truthy {
    color: #4FC3F7 !important;
  }
</style>
