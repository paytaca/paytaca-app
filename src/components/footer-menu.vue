<template>
  <div
    class="row justify-center fixed-footer"
    :class="getDarkModeClass()"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ path: '/' }">
          <q-icon v-if="isDefaultTheme" name="img:/icons/theme/payhero/app-home.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-home.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span @click="$router.push('/')">{{ $t('Home') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'transaction-send-select-asset' }">
          <q-icon v-if="isDefaultTheme" name="img:/icons/theme/payhero/app-send.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-send.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span @click="$router.push({ name: 'transaction-send-select-asset' })">{{ $t('Send') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'transaction-receive-select-asset' }">
          <q-icon v-if="isDefaultTheme" name="img:/icons/theme/payhero/app-receive.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-receive.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span @click="$router.push({ name: 'transaction-receive-select-asset' })">{{ $t('Receive') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'apps-dashboard' }">
          <q-icon v-if="isDefaultTheme" name="img:/icons/theme/payhero/app-apps.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="apps.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span @click="$router.push({ name: 'apps-dashboard' })" class="ellipsis-2-lines">{{ $t('Apps') }}</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="getDarkModeClass()" @click="openWalletDialog">
        <q-icon v-if="isDefaultTheme" name="img:/icons/theme/payhero/app-wallet.png" size="30px" />
        <q-icon v-else class="default-text-color mb-2" size="30px">
          <svg>
            <use xlink:href="wallet.svg#icon"></use>
          </svg>
        </q-icon>
        <br>
        <span>{{ $t('Wallets') }}</span>
      </button>
      <!-- <button class="footer-icon-btn q-mr-xs btn-ellipse" @click="expandBex">
        <i class="footer-icon mdi mdi-launch default-text-color"></i>
      </button> -->
    </div>
  </div>
</template>

<script>
import MultiWallet from './multi-wallet/index.vue'
export default {
  name: 'footer-menu',
  components: {
    MultiWallet
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    openWalletDialog () {
      this.$q.dialog({
        component: MultiWallet
      })
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    }
  }
}
</script>

<style lang="scss" scoped>
  .mb-2 {
    margin-bottom: 2px;
  }
  .fixed-footer {
    position: fixed;
    height: 67px;
    padding-top: 5px;
    width: 100%;
    bottom: 0;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;
    margin: 0 auto;

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
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
  }
</style>
