<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
    <div id="apps" ref="apps" class="text-center">
      <div :style="{ 'margin-top': $q.platform.is.ios ? '40px' : '0px'}">
        <p class="section-title" :class="{'text-blue-5': $store.getters['darkmode/getStatus']}">{{ $t('Applications') }}</p>
        <div class="row q-px-xs">
          <div v-for="(app, index) in apps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-pa-xs text-center">
            <div class="pt-app bg-grad" @click="openApp(app)">
              <q-icon class="app-icon" :color="iconColorClass(app)" size="xl" :name="app.iconName" :style="app.iconStyle"/>
            </div>
            <p class="pt-app-name q-mt-xs q-mb-none q-mx-none" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">{{ app.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <footer-menu />
  </div>
</template>

<script>
export default {
  name: 'apps',
  data () {
    return {
      apps: [
        {
          name: 'AnyHedge',
          iconName: 'img:anyhedge-logo.png',
          path: '/apps/anyhedge',
          iconStyle: 'width:50%',
          active: true
        },
        {
          name: this.$t('Bridge'),
          iconName: 'mdi-bridge',
          path: '/apps/bridge',
          active: true
        },
        {
          name: this.$t('AssetSwap'),
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/asset-swap',
          active: true
        },
        {
          name: 'Ramp',
          iconName: 'img:ramp_icon_white.png',
          path: '/apps/ramp',
          iconStyle: 'width:50%',
          active: true
        },
        {
          name: this.$t('WalletConnect'),
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          active: true
        },
        {
          name: this.$t('Collectibles'),
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          active: true
        },
        {
          name: this.$t('Sweep'),
          iconName: 'mdi-broom',
          path: '/apps/sweep',
          active: true
        },
        {
          name: 'Gifts',
          iconName: 'mdi-gift',
          path: '/apps/gifts/',
          active: true
        },
        // {
        //   name: 'Chat',
        //   iconName: 'mdi-chat',
        //   path: '/apps/chat/',
        //   active: true
        // },
        {
          name: 'POS Admin',
          iconName: 'point_of_sale',
          path: '/apps/point-of-sale',
          active: true
        },
        {
          name: this.$t('WalletInfo'),
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true
        },
        {
          name: this.$t('Settings'),
          iconName: 'settings',
          path: '/apps/settings',
          active: true
        }
      ],
      appHeight: null
    }
  },
  methods: {
    iconColorClass (app) {
      if (this.$store.getters['darkmode/getStatus']) {
        return app.active ? 'white' : 'pink-3'
      }
      return app.active ? 'white' : 'grey-5'
    },
    openApp (app) {
      if (app.active) {
        this.$router.push(app.path)
      }
    }
  },
  created() {
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
  #apps {
    padding: 20px 20px 80px 20px;
    color: #3B7BF6;
  }
  .section-title {
    font-size: 22px;
    margin-left: 14px;
    font-weight: 400;
  }

  /* New */
  .pt-app {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
  }
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
    width: 100%;
  }
  .pt-black {
    color: #212F3C !important;
  }
</style>
