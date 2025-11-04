<template>
  <div class="col theme-selector-root">
    <div class="row justify-center text-center">
      <h5 class="q-ma-none text-bow" :class="getDarkModeClass(darkMode)">{{ $t('ThemePreferenceTitle') }}</h5><br/>
    </div>
    <div class="row justify-center q-mt-sm text-center">
      <p>{{ $t('ThemePreferenceSubtitle') }}</p>
    </div>
    <div class="row justify-center q-mt-md">
      <div class="gifts-tabs" :class="getDarkModeClass(darkMode)">
        <button
          class="gifts-tab"
          :class="[
            darkMode ? 'dark' : '',
            modeTab === 'dark' ? 'active-theme-btn' : '',
            `theme-${theme}`
          ]"
          :style="modeTab === 'dark' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="modeTab = 'dark'"
        >
          {{ $t('DarkMode') }}
        </button>
        <button
          class="gifts-tab"
          :class="[
            darkMode ? 'dark' : '',
            modeTab === 'light' ? 'active-theme-btn' : '',
            `theme-${theme}`
          ]"
          :style="modeTab === 'light' ? `background-color: ${getThemeColor()} !important; color: #fff !important;` : ''"
          @click="modeTab = 'light'"
        >
          {{ $t('LightMode') }}
        </button>
      </div>
    </div>
    <!-- Thumbnail strip only -->
    <div class="row q-mt-sm">
      <div class="full-width thumbs-scroll" role="list">
        <div
          v-for="(themeElem, index) in themesList"
          :key="`thumb-${index}`"
          class="thumb-card"
          :class="[{ active: themeElem.value === selectedTheme }, getDarkModeClass(darkMode)]"
          role="listitem"
          :aria-selected="themeElem.value === selectedTheme"
          @click="onSelectTheme(themeElem.value)"
        >
          <div class="thumb-preview">
            <div class="preview-inner thumb">
              <PreviewTemplate :theme="themeElem.value" :mode="modeTab" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row justify-center">
      <q-btn
        no-caps
        rounded
        :label="$t('Continue')"
        class="q-mt-lg full-width primary-cta bg-grad"
        @click="choosePreferedSecurity"
        id="Continue"
      />
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
      modeTab: 'dark',
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
    getDarkModeClass,
    getThemeColor () {
      const themeMap = {
        'glassmorphic-blue': '#42a5f5',
        'glassmorphic-green': '#4caf50',
        'glassmorphic-gold': '#ffa726',
        'glassmorphic-red': '#f54270'
      }
      return themeMap[this.theme] || '#42a5f5'
    },
    onSelectTheme (theme) {
      this.selectedTheme = theme
      this.$store.commit('global/setTheme', this.selectedTheme)
    },
    onSlideChange () {}
  },
  mounted () {
    this.selectedTheme = this.theme || 'glassmorphic-blue'
    // default to Dark tab
    this.modeTab = 'dark'
    this.$store.commit('darkmode/setDarkmodeSatus', true)
  },
  watch: {
    modeTab (val) {
      this.$store.commit('darkmode/setDarkmodeSatus', val === 'dark')
    },
    selectedTheme () {
      this.$store.commit('global/setTheme', this.selectedTheme)
    }
  }
}
</script>

<style lang="scss" scoped>
  .themes-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    border-radius: 14px;
    padding-bottom: 4px;
  }
  .theme-selector-root {
    padding-top: 28px;
  }
  .theme-preview-surface {
    border-radius: 14px;
    overflow: hidden;
  }
  .preview-wrapper {
    width: 100%;
    max-width: 100%;
    padding: 0; /* remove side padding */
    box-sizing: border-box;
  }
  .preview-inner {
    width: 100%;
    padding: 0 !important; /* ensure no inner padding */
    margin: 0 !important;
  }
  .preview-inner.thumb {
    display: flex;
    align-items: center;
    justify-content: center; /* center the miniature preview inside the thumbnail */
  }
  :deep(.preview-inner.live > *) { width: 100% !important; display: block !important; padding: 0 !important; margin: 0 !important; }
  :deep(.preview-inner.thumb > *) { width: auto !important; display: inline-block !important; padding: 0 !important; margin: 0 auto !important; }

  /* Thumbnails */
  .thumbs-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    display: flex;
    justify-content: center;
    gap: 0;
    padding: 8px;
  }
  .thumb-card {
    flex: 0 0 140px;
    min-width: 140px;
    border-radius: 12px;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    border: 1px solid rgba(255,255,255,.12);
    margin: 8px; /* equal margin on all sides */
  }
  .thumb-card.light { border-color: rgba(0,0,0,.08); }
  .thumb-card:hover { transform: translateY(-2px); }
  .thumb-card.active {
    box-shadow: 0 8px 20px rgba(0,0,0,.22);
    border: 2px solid transparent;
    background-image: linear-gradient(#0000,#0000),
      linear-gradient(135deg, rgba(59,123,246,.9), rgba(39,159,190,.9));
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }
  .thumb-preview { padding: 6px; border-radius: 10px; overflow: hidden; }
  /* .thumb-title removed per request */
  .pill-toggle {
    border-radius: 9999px !important;
    padding: 4px;
    height: 44px;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  /* Gifts tab styles (copied for consistency) */
  .gifts-tabs {
    display: inline-flex;
    gap: 8px;
    background-color: rgb(242, 243, 252);
    border-radius: 28px;
    padding: 6px;
    &.dark { background-color: rgba(255, 255, 255, 0.1); }
  }
  .gifts-tab {
    min-width: 110px;
    height: 44px;
    border-radius: 22px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline: 0;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: 600;
    font-size: 14px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover:not(.active-theme-btn) { background-color: rgba(0, 0, 0, 0.05); }
    &.dark {
      color: rgba(255, 255, 255, 0.8);
      &:hover:not(.active-theme-btn) { background-color: rgba(255, 255, 255, 0.08); }
    }
  }
  .gifts-tab.active-theme-btn { color: #fff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
  .pill-toggle.dark {
    background: rgba(39, 55, 70, 0.55);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .pill-toggle.light {
    background: rgba(255,255,255,0.55);
    border: 1px solid rgba(0,0,0,0.06);
  }
  /* Theme-aware base tints for container (LIFT-like subtle tint) */
  .pill-toggle.glassmorphic-blue.dark { background: rgba(39,55,70,0.55); }
  .pill-toggle.glassmorphic-blue.light { background: rgba(220,236,255,0.55); }
  .pill-toggle.glassmorphic-red.dark { background: rgba(70,39,49,0.55); }
  .pill-toggle.glassmorphic-red.light { background: rgba(255,220,228,0.55); }
  .pill-toggle.glassmorphic-green.dark { background: rgba(39,70,55,0.55); }
  .pill-toggle.glassmorphic-green.light { background: rgba(220,255,236,0.55); }
  .pill-toggle.glassmorphic-gold.dark { background: rgba(70,60,39,0.55); }
  .pill-toggle.glassmorphic-gold.light { background: rgba(255,246,220,0.55); }
  .pill-toggle .q-btn {
    border-radius: 9999px !important;
    height: 36px;
    font-weight: 600;
    letter-spacing: 0.2px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .pill-toggle.dark .q-btn {
    background: transparent;
    color: rgba(255,255,255,0.85);
  }
  .pill-toggle.light .q-btn {
    background: transparent;
    color: #1f2937;
  }
  /* Active pill: LIFT-like glossy gradient, theme-aware */
  .pill-toggle .q-btn--active,
  .pill-toggle .q-btn--active .q-btn__content {
    color: #fff !important; /* ensure readable label */
    text-shadow: 0 1px 2px rgba(0,0,0,0.35);
    box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.25);
  }
  /* Blue theme */
  .pill-toggle.glassmorphic-blue .q-btn--active {
    background-image: linear-gradient(
      to right bottom,
      rgba(59, 123, 246, 0.95),
      rgba(54, 129, 232, 0.95),
      rgba(49, 139, 218, 0.95),
      rgba(44, 149, 204, 0.95),
      rgba(39, 159, 190, 0.95)
    );
  }
  /* Red theme */
  .pill-toggle.glassmorphic-red .q-btn--active {
    background-image: linear-gradient(
      to right bottom,
      rgba(246, 59, 123, 0.95),
      rgba(232, 54, 96, 0.95),
      rgba(218, 49, 72, 0.95),
      rgba(204, 44, 61, 0.95),
      rgba(190, 39, 50, 0.95)
    );
  }
  /* Green theme */
  .pill-toggle.glassmorphic-green .q-btn--active {
    background-image: linear-gradient(
      to right bottom,
      rgba(67, 160, 71, 0.95),
      rgba(62, 164, 74, 0.95),
      rgba(57, 168, 77, 0.95),
      rgba(52, 172, 80, 0.95),
      rgba(47, 176, 83, 0.95)
    );
  }
  /* Gold theme */
  .pill-toggle.glassmorphic-gold .q-btn--active {
    background-image: linear-gradient(
      to right bottom,
      rgba(255, 167, 38, 0.95),
      rgba(255, 176, 56, 0.95),
      rgba(255, 184, 74, 0.95),
      rgba(255, 192, 92, 0.95),
      rgba(255, 200, 110, 0.95)
    );
  }
  .themes-row {
    display: inline-flex;
    gap: 12px;
    padding: 8px 4px;
  }
  .theme-card {
    min-width: 260px;
    flex: 0 0 260px;
    border-radius: 12px;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
    border: 1px solid rgba(255,255,255,.12);
    display: flex;
    flex-direction: column;
  }
  .theme-card.active {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,.2);
  }
  .theme-card-title {
    font-weight: 600;
  }

  /* Mobile: 2x2 grid for thumbnails */
  @media (max-width: 430px) {
    .thumbs-scroll {
      overflow: visible;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: auto;
      justify-items: center;
      align-items: start;
      padding: 8px 8px;
      gap: 12px; /* add space between columns and rows */
    }
    .thumb-card {
      flex: initial;
      min-width: 0;
      width: 100%;
      max-width: 180px;
      margin: 0; /* use grid gap instead of margins to avoid tight columns */
    }
    .thumb-preview { width: 100%; display: flex; justify-content: center; }
  }
</style>
