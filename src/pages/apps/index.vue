<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
    <div id="apps" ref="apps" class="text-center">
      <p class="section-title" :class="{'text-blue-5': $store.getters['darkmode/getStatus']}">Applications</p>

      <div class="row q-px-xs">
        <div v-for="(app, index) in apps" :key="index" class="col-xs-4 col-sm-2 col-md-1 q-pa-xs text-center">
          <div class="pt-app bg-grad" @click="openApp(app)">
            <q-icon class="app-icon" :color="iconColorClass(app)" size="xl" :name="app.iconName" />
          </div>
          <p class="pt-app-name q-mt-xs q-mb-none q-mx-none" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">{{ app.name }}</p>
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
          name: 'Bridge',
          iconName: 'mdi-bridge',
          path: '/apps/bridge',
          active: true
        },
        {
          name: 'Asset Swap',
          iconName: 'mdi-swap-horizontal-bold',
          path: '/apps/asset-swap',
          active: true
        },
        {
          name: 'Wallet Connect',
          iconName: 'mdi-connection',
          path: '/apps/wallet-connect',
          active: true
        },
        {
          name: 'Collectibles',
          iconName: 'burst_mode',
          path: '/apps/collectibles',
          active: true
        },
        {
          name: 'Sweep',
          iconName: 'mdi-broom',
          path: '/apps/sweep',
          active: true
        },
        {
          name: 'Wallet Info',
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true
        },
        {
          name: 'Settings',
          iconName: 'settings',
          path: '/apps/settings',
          active: true
        }
        // {
        //   name: 'Rewards',
        //   iconName: 'mdi-trophy',
        //   path: '',
        //   active: false
        // },
        // {
        //   name: 'Connecta',
        //   iconName: 'delivery_dining',
        //   path: '/apps/connecta/',
        //   active: false
        // },
        // {
        //   name: 'Bills Payment',
        //   iconName: 'receipt_long',
        //   path: '',
        //   active: false
        // },
        // {
        //   name: 'Top Up',
        //   iconName: 'system_security_update_good',
        //   path: '',
        //   active: false
        // }
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
  mounted () {
    const htmlTag1 = document.querySelector('.pt-app')
    const htmlTag = document.getElementsByClassName('pt-app')
    this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
    for (var i = 0; i < htmlTag.length; i++) {
      htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
    }

    window.addEventListener('resize', function () {
      this.appHeight = parseInt(document.defaultView.getComputedStyle(htmlTag1).width, 10)
      for (var i = 0; i < htmlTag.length; i++) {
        htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
      }
      htmlTag[i].setAttribute('style', `height: ${this.appHeight}px !important`)
    })
  }
}
</script>

<style scoped lang="scss">
  #apps {
    padding: 20px;
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
    // background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
  .pt-dark-app {
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);

    // background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
    /* background-image: linear-gradient(to right bottom, #CACFD2, #A6ACAF, #717D7E, #5F6A6A, #515A5A); */
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
