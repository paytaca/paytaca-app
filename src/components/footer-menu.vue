<template>
  <div class="row justify-center fixed-footer" :class="{'pt-dark-card': $q.dark.mode}" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn">
        <router-link :to="{ path: '/' }">
          <i class="footer-icon mdi mdi-home" :class="{'pt-dark-label': $q.dark.mode}"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn">
        <router-link :to="{ name: 'transaction-send-select-asset' }">
          <i class="footer-icon mdi mdi-send" :class="{'pt-dark-label': $q.dark.mode}"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn">
        <router-link :to="{ name: 'transaction-receive-select-asset' }">
          <i class="footer-icon mdi mdi-inbox" :class="{'pt-dark-label': $q.dark.mode}"></i>
        </router-link>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse">
        <router-link :to="{ name: 'apps-dashboard' }">
          <i class="footer-icon mdi mdi-apps" :class="{'pt-dark-label': $q.dark.mode}"></i>
        </router-link>
      </button>
      <button v-if="$q.platform.is.bex" class="footer-icon-btn q-mr-xs btn-ellipse" @click="expandBex">
        <i class="footer-icon mdi mdi-launch" :class="{'pt-dark-label': $q.dark.mode}"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    }
  }
}
</script>

<style lang="scss">
  .fixed-footer {
    position: fixed;
    height: 60px;
    width: 100%;
    background-color: #fff;
    border-top-right-radius: 20px;
    border-top-left-radius: 20px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    bottom: 0pt;
    z-index: 6;
    .footer-icon {
      font-size: 30px !important;
      color: rgb(60, 100, 246) !important;
    }
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 50px;
      height: 50px;
      outline: none;
      background-color: transparent;
    }
    .footer-btn-container {
      margin-top: 1px !important;
    }
    .active-switch {
      color: #69CB51;
    }
    .account-options {
      position: absolute;
      display: none !important;
      line-height: 40px;
      top: -100px;
      right: 30px;
      width: 80px;
      text-align: center;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 1px 1px 2px 1px rgba(99, 103, 103, .2);
      border-radius: 10px;
      vertical-align: middle;
      padding: 8px 0px 8px 0px;
      transition: .3s;
      a {
        display: block;
        text-decoration: none;
        width: 100%;
        padding: 4px 0px 4px 0px;
        color: #000;
      }
    }
    .btn-ellipse:focus .account-options {
      display: block !important;
    }
    .pt-dark-label {
      color: #fff !important;
    }
  }
</style>
