<template>
  <div class="row justify-center fixed-footer" :class="{'pt-dark-card': darkMode}" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="{'text-white': darkMode}">
        <router-link :to="{ path: '/' }">
          <q-icon class="default-text-color" size="30px">
            <svg>
              <use xlink:href="app-home.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <span @click="$router.push('/')">Home</span>
      </button>
      <button class="footer-icon-btn" :class="{'text-white': darkMode}">
        <router-link :to="{ name: 'transaction-send-select-asset' }">
          <q-icon class="default-text-color" size="30px">
            <svg>
              <use xlink:href="app-send.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <span @click="$router.push({ name: 'transaction-send-select-asset' })">Send</span>
      </button>
      <button class="footer-icon-btn" :class="{'text-white': darkMode}">
        <router-link :to="{ name: 'transaction-receive-select-asset' }">
          <q-icon class="default-text-color" size="30px">
            <svg>
              <use xlink:href="app-receive.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <span @click="$router.push({ name: 'transaction-receive-select-asset' })">Receive</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}">
        <router-link :to="{ name: 'apps-dashboard' }">
          <q-icon class="default-text-color" size="30px">
            <svg>
              <use xlink:href="app-apps.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <span @click="$router.push({ name: 'apps-dashboard' })">Apps</span>
      </button>
      <button v-if="$q.platform.is.bex" class="footer-icon-btn q-mr-xs btn-ellipse" @click="expandBex">
        <i class="footer-icon mdi mdi-launch default-text-color"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
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
    height: 67px;
    padding-top: 5px;
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
      width: 60px;
      height: 50px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: 20px;
    }
    .footer-btn-container {
      margin-top: 1px !important;
    }
    .active-switch {
      color: #69CB51;
    }
    .pt-dark-label {
      color: #fff !important;
    }
  }
</style>
