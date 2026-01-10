<template>
  <div id="app-container" class="debug-page sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav
      :title="$t('Debug')"
      backnavpath="/apps"
      class="header-nav q-px-sm apps-header"
    >
      <template #top-right-menu>
        <q-btn
          flat
          round
          icon="visibility_off"
          @click="hideDebugApp"
          class="q-mr-sm"
        >
          <q-tooltip>{{ $t('Hide') }}</q-tooltip>
        </q-btn>
      </template>
    </header-nav>

    <div class="q-pa-md q-mt-sm">
      <div class="row">
        <!-- Tools Card -->
        <div class="col-12 col-md-6 q-pa-sm">
          <q-card 
            class="debug-menu-card cursor-pointer" 
            :class="getDarkModeClass(darkMode)"
            @click="$router.push('/apps/debug/tools')"
          >
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <q-icon name="build" size="48px" :color="toggleColor" />
                <div class="col">
                  <div class="text-h6 text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Tools', {}, 'Tools') }}
                  </div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                    {{ $t('DebugToolsDescription', {}, 'SLP settings, denomination selector, address key viewer, and more') }}
                  </div>
                </div>
                <q-icon name="chevron_right" size="24px" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Console Card -->
        <div class="col-12 col-md-6 q-pa-sm">
          <q-card 
            class="debug-menu-card cursor-pointer" 
            :class="getDarkModeClass(darkMode)"
            @click="$router.push('/apps/debug/console')"
          >
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <q-icon name="terminal" size="48px" :color="toggleColor" />
                <div class="col">
                  <div class="text-h6 text-weight-medium" :class="getDarkModeClass(darkMode)">
                    {{ $t('Console', {}, 'Console') }}
                  </div>
                  <div class="text-caption" :class="darkMode ? 'text-grey-6' : 'text-grey-7'">
                    {{ $t('ConsoleDescription', {}, 'View intercepted console logs with filtering and export options') }}
                  </div>
                </div>
                <q-icon name="chevron_right" size="24px" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import headerNav from 'src/components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'DebugIndex',
  components: {
    headerNav
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },
  methods: {
    getDarkModeClass,
    hideDebugApp () {
      this.$q.dialog({
        class: `text-bow ${this.getDarkModeClass(this.darkMode)}`,
        title: this.$t('HideDebugApp'),
        message: this.$t('AreYouSureYouWantToHideTheDebugApp'),
        cancel: { 
          label: this.$t('Cancel'),
          flat: true,
          color: this.darkMode ? 'grey-6' : 'grey-8'
        },
        ok: { 
          label: this.$t('OK'),
          color: this.toggleColor
        },
        persistent: true
      }).onOk(() => {
        localStorage.setItem('debugAppVisible', 'false')
        this.$router.push('/apps')
      })
    }
  }
}
</script>

<style scoped lang="scss">
.debug-page {
  min-height: 100vh;
  background-color: #ECF3F3;
}

body.theme-glassmorphic-blue .debug-page.dark {
  background-color: #273746;
}

body.theme-glassmorphic-red .debug-page.dark {
  background-color: #462733;
}

body.theme-glassmorphic-green .debug-page.dark {
  background-color: #263d32;
}

body.theme-glassmorphic-gold .debug-page.dark {
  background-color: #3d3224;
}

body.theme-payhero .debug-page.dark {
  background-color: #012121;
}

.debug-page.dark {
  background-color: #273746;
}

.debug-menu-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.debug-menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.debug-menu-card.dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.debug-menu-card.light {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>

