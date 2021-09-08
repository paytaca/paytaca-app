<template>
  <div>
    <div id="apps">
      <p class="section-title">Applications</p>
      <div ref="apps" style="margin-left: auto; margin-right: auto;">
        <div v-for="(app, index) in apps" :key="index" class="app" @click="openApp(app)">
          <q-icon class="app-icon" size="50px" :style="{color: app.active ? '#fff' : 'gray'}" :name="app.iconName" />
          <p>{{ app.name }}</p>
        </div>

        <div style="margin-top: 45px; font-size: 14px; text-align: center;">
          <p>Paytaca aims to bring Bitcoin Cash to everyone everywhere. You can help us bootstrap our products through a small donation.</p>
          <q-btn @click="donate">Donate Now</q-btn>
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
          name: 'Collectibles',
          iconName: 'collections_bookmark',
          path: '/apps/collectibles',
          active: true
        },
        {
          name: 'Wallet Info',
          iconName: 'info',
          path: '/apps/wallet-info',
          active: true
        },
        {
          name: 'Creative Suite',
          iconName: 'palette',
          path: '',
          active: false
        },
        {
          name: 'Asset Swap',
          iconName: 'swap_horiz',
          path: '',
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
        },
        {
          name: 'Settings',
          iconName: 'settings',
          path: '',
          active: false
        }
      ]
    }
  },
  methods: {
    openApp (app) {
      if (app.active) {
        this.$router.push(app.path)
      }
    },
    donate () {
      this.$router.push({
        name: 'transaction-send',
        params: {
          assetId: 'bch',
          amount: 0.1,
          fixed: false,
          recipient: 'bitcoincash:qr628de9s6a5tjrd4lz9dpnrf46urc63a5nlrzlj7t'
        }
      })
    }
  },
  mounted () {
    this.$refs.apps.style.width = (screen.width * 0.8) + 'px'
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
  .app {
    width: 75px;
    height: 75px;
    border-radius: 20px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
    display: inline-block;
    margin: 10px;
    position: relative;
    box-shadow: 1px 2px 2px 2px rgba(99, 103, 103, .2);
  }
  .app-icon {
    vertical-align: middle;
    align-content: center;
    width: 100%;
    height: 100%;
  }
  .app p {
    font-size: 12px !important;
    text-align: center;
    margin-top: 5px;
    width: 75px;
    color: #000 !important;
  }
</style>
