<template>
  <div
    class="row justify-center fixed-footer"
    :class="getDarkModeClass()"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ path: '/' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-home.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-home.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span 
          id="home-button"
          @click="$router.push('/')">{{ $t('Home') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'transaction-send-select-asset' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-send.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-send.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span 
          id="send-button"
          @click="$router.push({ name: 'transaction-send-select-asset' })">{{ $t('Send') }}</span>
      </button>
      <div style="width: 50px;"></div>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'transaction-receive-select-asset' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-receive.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-receive.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span
          id="receive-button" 
          @click="$router.push({ name: 'transaction-receive-select-asset' })">{{ $t('Receive') }}</span>
      </button>
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'apps-dashboard' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-apps.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="apps.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
        <br>
        <span 
          id="apps-button"
          @click="$router.push({ name: 'apps-dashboard' })" class="ellipsis-2-lines">{{ $t('Apps') }}</span>
      </button>
    </div>

    <div id="qr-button" @click="$router.push({ name: 'qr-reader' })">
      <button class="footer-icon-btn" :class="getDarkModeClass()">
        <router-link :to="{ name: 'qr-reader' }">
          <q-icon v-if="isNotDefaultTheme" name="img:assets/img/theme/payhero/app-qr.png" size="30px" />
          <q-icon v-else class="default-text-color mb-2" size="30px">
            <svg>
              <use xlink:href="app-qr.svg#icon"></use>
            </svg>
          </q-icon>
        </router-link>
      </button>
      <br>
      <span 
        id="qr-reader-button"
        :class="getDarkModeClass()" @click="$router.push({ name: 'qr-reader' })">{{ 'QR' }}</span>
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
  computed: {
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
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
      min-width: 50px;
    }
    .footer-btn-container {
      margin-top: 1px !important;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
    }
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
  }
  #qr-button {
    z-index: 100 !important;
    margin-top: -25px;
    display: block;
    text-align: center;
    position: absolute;
    button {
      z-index: 100 !important;
      border-radius: 50px;
      border: 2px solid lightgray;
      width: 60px;
      height: 60px;
      background-color: #012121;
    }
    button.light {
      background-color: #fff;
    }
    span {
      font-size: 12px;
    }
    span.light {
      font-size: 12px;
      color: black;
    }
  }
</style>
