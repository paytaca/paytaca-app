<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': $q.dark.mode}">
    <div id="apps" ref="apps">
      <p class="section-title" :class="{'pt-dark-label': $q.dark.mode}">Applications</p>

      <div class="row q-px-xs">
        <div v-for="(app, index) in apps" :key="index" class="col-xs-3 col-sm-2 col-md-1 q-pa-sm text-center">
          <div class="pt-app" :class="[app.active ? 'text-white' : !$q.dark.mode ? 'pt-grey' : 'pt-black', $q.dark.mode ? 'pt-dark-app' : 'pt-light-app']" @click="openApp(app)">
            <q-icon class="app-icon" size="34px" :name="app.iconName" />
          </div>
          <p class="pt-app-name q-mt-xs q-mb-none q-mx-none" :class="{'pt-dark-label': $q.dark.mode}">{{ app.name }}</p>
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
          name: 'Wallet Connect',
          iconName: 'fas fa-wallet',
          path: '/apps/wallet-connect',
          active: true
        },
        {
          name: 'Collectibles',
          iconName: 'collections_bookmark',
          path: '/apps/collectibles',
          active: true
        },
        {
          name: 'Asset Swap',
          iconName: 'swap_horiz',
          path: '/apps/asset-swap',
          active: true
        },
        {
          name: 'Settings',
          iconName: 'settings',
          path: '/apps/settings',
          active: true
        },
        {
          name: 'Wallet Info',
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true
        },
        {
          name: 'Rewards',
          iconName: 'grade',
          path: '',
          active: false
        },
        {
          name: 'Connecta',
          iconName: 'delivery_dining',
          path: '/apps/connecta/',
          active: false
        },
        {
          name: 'Bills Payment',
          iconName: 'receipt_long',
          path: '',
          active: false
        },
        {
          name: 'Top Up',
          iconName: 'system_security_update_good',
          path: '',
          active: false
        }
      ],
      appHeight: null
    }
  },
  methods: {
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

<style scoped>
  #apps {
    padding: 20px;
    color: #3B7BF6;
  }
  .section-title {
    font-size: 22px;
    margin-left: 14px;
  }

  /* New */
  .pt-app {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 20px;
    box-shadow: 1px 2px 2px 2px rgba(99, 103, 103, .2);
  }
  .pt-light-app {
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
  .pt-dark-app {
    background-image: linear-gradient(to right bottom, #CACFD2, #A6ACAF, #717D7E, #5F6A6A, #515A5A);
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
  .pt-grey {
    color: grey !important;
  }
  .pt-black {
    color: #212F3C !important;
  }
</style>
