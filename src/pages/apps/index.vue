<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;">
    <div id="apps" ref="apps">
      <p class="section-title">Applications</p>
      <div ref="apps-icons" style="margin-left: auto; margin-right: auto;">
        <div v-for="(app, index) in apps" :key="index" class="app" @click="openApp(app)">
          <q-icon class="app-icon" size="50px" :style="{color: app.active ? '#fff' : 'gray'}" :name="app.iconName" />
          <p>{{ app.name }}</p>
        </div>
      </div>
      <div style="padding-top: 20px;"></div>
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
          path: '/apps/settings',
          active: true
        }
      ]
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
    const bodyBounds = document.body.getBoundingClientRect()
    this.$refs.apps.style.width = bodyBounds.width + 'px'
    const appIconsWidth = Math.ceil((bodyBounds.width * 0.90) / 70) * 70
    this.$refs['apps-icons'].style.width = appIconsWidth + 'px'
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
    width: 75px;
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
