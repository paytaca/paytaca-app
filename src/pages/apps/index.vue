<template>
  <div id="apps-page-container" class="row" :class="getDarkModeClass(darkMode, 'pt-dark', '')">
    <div id="apps" ref="apps" class="text-center">
      <div>
        <div :class="{'pt-header apps-header': isDefaultTheme(theme)}" :style="{ 'padding-top': $q.platform.is.ios ? '40px' : '0px'}">
          <p
            class="section-title"
            :class="{'text-blue-5': darkMode, 'text-grad': isDefaultTheme(theme)}"
            :style="{ 'padding-top': $q.platform.is.ios ? '10px' : '20px'}"
          >
            {{ $t('Applications') }}
          </p>
        </div>
        <div class="row" :class="isDefaultTheme(theme) ? 'q-px-md' : 'q-px-xs'">
          <div v-for="(app, index) in filteredApps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-pa-xs text-center" :class="{'bex-app': $q.platform.is.bex}">
            <div
              class="pt-app bg-grad"
              :class="[
                buttonClassByState(app.active),
                {'apps-border' : isDefaultTheme(theme)}
              ]"
              @click="openApp(app)"
            >
              <q-icon class="app-icon" color="white" size="xl" :name="app.iconName" :style="app.iconStyle"/>
            </div>
            <p class="pt-app-name q-mt-xs q-mb-none q-mx-none pt-label" :class="getDarkModeClass(darkMode)">{{ app.name }}</p>
          </div>
        </div>
      </div>
    </div>
    <footer-menu />
  </div>
  <appSelectionDialog
    v-if="rampAppSelection"
    @back="rampAppSelection=false"
    @submit="rampSelectApp"
  />
</template>

<script>
import { getDarkModeClass, isDefaultTheme } from 'src/utils/theme-darkmode-utils'
import appSelectionDialog from 'src/components/ramp/appSelectionDialog.vue'

export default {
  name: 'apps',
  components: {
    appSelectionDialog
  },
  data () {
    return {
      apps: [
        {
          name: 'Marketplace',
          iconName: 'storefront',
          path: '/apps/marketplace',
          active: true
        },
        {
          name: 'AnyHedge',
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:50%',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Bridge'),
          iconName: 'mdi-bridge',
          path: '/apps/bridge',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        },
        {
          name: this.$t('AssetSwap'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/asset-swap',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: true
        },
        {
          name: this.$t('Ramp'),
          iconName: 'img:ramp_icon_white.png',
          path: '/apps/ramp',
          iconStyle: 'width:50%',
          active: true, // !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('WalletConnect'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Collectibles'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('Sweep'),
          iconName: 'mdi-broom',
          path: '/apps/sweep',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('Gifts'),
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        // {
        //   name: 'Chat',
        //   iconName: 'mdi-chat',
        //   path: '/apps/chat/',
        //   active: true
        // },
        {
          name: this.$t('Map'),
          iconName: 'mdi-map',
          path: '/apps/map/',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('POSAdmin'),
          iconName: 'point_of_sale',
          path: '/apps/point-of-sale',
          active: !this.$store.getters['global/isChipnet'],
          smartBCHOnly: false
        },
        {
          name: this.$t('WalletInfo'),
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true,
          smartBCHOnly: false
        },
        {
          name: this.$t('Settings'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true,
          smartBCHOnly: false
        }
      ],
      filteredApps: [],
      appHeight: null,
      rampAppSelection: false,
      disableRampSelection: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    showTokens () {
      return this.$store.getters['global/showTokens']
    }
  },
  methods: {
    rampSelectApp (app) {
      this.rampAppSelection = false
      this.rampSelectedApp = app
      if (app === 'fiat') {
        this.$router.push('/apps/ramp/fiat')
      }
      if (app === 'crypto') {
        this.$router.push('/apps/ramp/crypto')
      }
    },
    getDarkModeClass,
    isDefaultTheme,
    buttonClassByState (active) {
      return active ? '' : 'disabled'
    },
    openApp (app) {
      if (app.active) {
        if (app.name === 'Ramp') {
          this.rampAppSelection = true
        } else {
          this.$router.push(app.path)
        }
      }
    }
  },
  created () {
    this.filteredApps = this.apps
    const currentTheme = this.$store.getters['global/theme']
    const themedIconPath = isDefaultTheme(this.theme) ? `assets/img/theme/${currentTheme}/` : ''
    this.filteredApps.forEach(app => {
      if (isDefaultTheme(this.theme)) {
        const iconFileName = app.path.split('/')[2]
        const themedIconLoc = `img:${themedIconPath}${iconFileName}.png`
        app.iconName = themedIconLoc
      }
    })

    if (!this.enableSmartBCH) {
      this.filteredApps = this.apps.filter((app) => {
        if (!app.smartBCHOnly) {
          return true
        }
      })
    }
    try {
      if (this.$router.resolve({name: 'apps-sandbox'})) {
        this.apps.unshift({
          name: 'Sandbox',
          iconName: '',
          path: '/apps/sandbox',
          active: true
        })
      }
    } catch { }
  },
  mounted () {
    const htmlTag1 = document.querySelector('.pt-app')
    const htmlTag = document.getElementsByClassName('pt-app')
    this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
    for (let i = 0; i < htmlTag.length; i++) {
      htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
    }

    window.addEventListener('resize', function () {
      this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
      for (let i = 0; i < htmlTag.length; i++) {
        htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
      }
    })
  }
}
</script>

<style scoped lang="scss">
  #apps-page-container {
    background-color: #ECF3F3;
    min-height: 100vh;
  }

  .section-title {
    font-size: 22px;
    margin-left: 14px;
    font-weight: 400;
  }
  .bex-app {
    width: 107px;
  }

  /* New */
  .pt-light-app {
     background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
  .pt-dark-app {
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
  .pt-app-name {
    color: #000;
    font-size: 13px
  }
  .app-icon {
    vertical-align: middle;
    align-content: center;
    width: 50%;
    height: 50%;
  }
  .pt-black {
    color: #212F3C !important;
  }
</style>
