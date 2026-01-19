<template>
  <div class="header-nav-wrapper">
    <template v-if="rewardsPage === ''">
      <div
        ref="header-nav"
        class="pt-header row no-wrap items-center"
        :style="headerNavStyle"
        :class="getDarkModeClass(darkMode)"
      >
        <div class="pt-header-left col-auto row items-center">
          <router-link
            :to="backTo"
            class="pt-arrow-left-link"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            <span class="material-icons" @click="onClick">
                arrow_back
            </span>
          </router-link>
        </div>
        <div class="pt-header-title col">
          <p
            ref="header-title"
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
            v-on-long-press="onLongPressTitle"
          >
            {{ title }}
          </p>
        </div>
        <div class="pt-header-right col-auto row items-center justify-end">
          <slot name="top-right-menu">&nbsp;</slot>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        ref="header-nav"
        class="row no-wrap pt-header justify-between items-center"
        :style="headerNavStyle"
        :class="{'pt-card-3': darkMode}"
      >
        <div class="pt-header-left col-auto row items-center">
          <router-link
            :to="backTo"
            class="pt-arrow-left-link"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            <span class="material-icons" @click="onClick">
                arrow_back
            </span>
          </router-link>
        </div>
        <div class="pt-header-title col">
          <p
            ref="header-title"
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
            v-on-long-press="onLongPressTitle"
          >
            {{ title }}
          </p>
        </div>
        <div class="pt-header-right col-auto q-mr-sm">
          <q-btn
            round
            class="button"
            icon="question_mark"
            size="sm"
            @click="openRewardsHelpDialog"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { vOnLongPress } from '@vueuse/components'
import HelpDialog from 'src/components/rewards/dialogs/HelpDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  name: 'header-nav',
  directives: {
    'on-long-press': vOnLongPress,
  },
  props: {
    title: {
      type: String,
      default: ''
    },
    backnavpath: {
      type: [String, Object],
      default: ''
    },
    rewardsPage: {
      type: String,
      default: ''
    }
  },
  components: {
    HelpDialog
  },
  emits: ['click', 'long-press-title'],
  data () {
    return {
      addedBodyPadding: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    headerNavStyle () {
      /**
       * Prevent header overlap with the OS status bar / cutouts.
       * - iOS: keep the existing visual spacing, but also respect safe-area insets.
       * - Android: add safe-area inset on top of the normal padding so the back button
       *   stays clickable on devices where the status bar overlays the webview.
       */
      const safeTop = 'max(env(safe-area-inset-top, 0px), var(--q-safe-area-top, 0px), var(--safe-area-inset-top, 0px), var(--pt-android-statusbar, 0px))'

      if (this.$q.platform.is.ios) {
        return {
          // Preserve existing iOS sizing, but ensure we never go *below* safe area needs.
          paddingTop: `max(73px, calc(${safeTop} + 29px))`,
          height: `max(95px, calc(${safeTop} + 51px))`,
          paddingBottom: '45px'
        }
      }

      return {
        paddingTop: `calc(18px + ${safeTop})`,
        height: `calc(70px + ${safeTop})`,
        paddingBottom: '0px'
      }
    },
    backTo () {
      if (typeof this.backnavpath === 'object' && this.backnavpath !== null && Object.keys(this.backnavpath).length > 0) {
        return this.backnavpath
      }
      if (typeof this.backnavpath === 'string' && this.backnavpath.trim() !== '') {
        return { path: this.backnavpath }
      }
      // Return empty path as fallback
      return { path: '/' }
    }
  },
  mounted () {
    // Mark that this route has a header so global safe-area padding won't double-apply.
    document.body.classList.add('pt-has-header-nav')

    // adjust header-nav div height when header title breaks into two lines
    const headerTitleHeight = this.$refs['header-title']?.clientHeight
    const headerNavEl = this.$refs['header-nav']

    if (!headerNavEl || typeof headerTitleHeight !== 'number') return

    if (!this.$q.platform.is.ios) {
      const safeTop = 'max(env(safe-area-inset-top, 0px), var(--q-safe-area-top, 0px), var(--safe-area-inset-top, 0px), var(--pt-android-statusbar, 0px))'
      headerNavEl.style.height = headerTitleHeight > 32
        ? `calc(100px + ${safeTop})`
        : `calc(70px + ${safeTop})`

      if (headerTitleHeight > 32) {
        // move all elements 30px down due to the change in height
        document.body.style.paddingTop = '30px'
        this.addedBodyPadding = true
      }
    }
  },
  beforeUnmount () {
    if (this.addedBodyPadding) document.body.style.paddingTop = ''
    document.body.classList.remove('pt-has-header-nav')
  },
  methods: {
    getDarkModeClass,
    async onClick () {
      // Check if backnavpath is a valid non-empty string or a non-empty object
      const hasValidPath = typeof this.backnavpath === 'string' 
        ? this.backnavpath.trim() !== ''
        : typeof this.backnavpath === 'object' && this.backnavpath !== null && Object.keys(this.backnavpath).length > 0

      if (hasValidPath) {
        if (typeof this.backnavpath === 'object') {
          await this.$router.push(this.backnavpath)
        } else {
          await this.$router.push({ path: this.backnavpath })
        }
      } else {
        this.$router.go(-1)
      }
      this.$emit('click')
    },
    openRewardsHelpDialog () {
      this.$q.dialog({
        component: HelpDialog,
        componentProps: { page: this.rewardsPage }
      })
    },
    onLongPressTitle () {
      this.$emit('long-press-title')
    }
  }
}
</script>

<style lang="scss">
.pt-header {
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 20px;
  z-index: 100;
  position: relative;
  --pt-header-side: clamp(44px, 12vw, 56px);
}

/* Fixed side slots so icons never overlap the centered title */
.pt-header-left,
.pt-header-right {
  flex: 0 0 var(--pt-header-side);
  width: var(--pt-header-side);
  min-width: var(--pt-header-side);
}
.pt-header-title {
  flex: 1 1 auto;
  min-width: 0;
}
.pt-arrow-left-link {
  position: relative;
  font-size: 30px;
  color: #3B7BF6;
  text-decoration: none;
  display: flex;
  justify-items: center;
  align-items: center;
  height: 100%;
  width: 100%;
  padding-left: 10px;
  z-index: 2;
}
.pt-settings-icon {
  position: absolute;
  font-size: 28px;
  right: 20px;
  color: #3B7BF6;
  display: flex;
  justify-items: center;
  align-items: center;
}
</style>
