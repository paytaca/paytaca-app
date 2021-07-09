<template>
  <div>
    <div id="apps">
      <p class="section-title">Applications</p>
      <div v-for="(app, index) in apps" :key="index" class="app" @click="openApp(app.name)">
        <q-icon class="app-icon" size="50px" style="color: #fff" :name="app.iconName" />
        <p>{{ app.name }}</p>
      </div>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import { Notify } from 'quasar'

export default {
  name: 'apps',
  data () {
    return {
      apps: [
        {
          name: 'Collectibles',
          iconName: 'collections_bookmark',
          path: ''
        },
        {
          name: 'Asset Swap',
          iconName: 'swap_horiz',
          path: ''
        },
        {
          name: 'Bills Payment',
          iconName: 'receipt_long',
          path: ''
        },

        {
          name: 'Top Up',
          iconName: 'system_security_update_good',
          path: ''
        }
      ]
    }
  },
  methods: {
    openApp (name) {
      Notify.create({
        message: `${name} app is coming soon!`,
        position: 'center',
        color: 'info'
      })
    }
  }
}
</script>

<style scoped>
  #apps {
    padding: 20px;
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
  }
</style>
