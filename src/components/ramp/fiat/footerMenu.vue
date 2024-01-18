<template>
  <div
    class="row justify-center fixed-footer"
    :class="getDarkModeClass()"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="onSelectMenu('store')">
          <q-icon class="mb-2" :class="isActive('store') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_storefront"/>
        <span>Home</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="onSelectMenu('ads')">
          <q-icon class="mb-2" :class="isActive('ads') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_sell"/>
        <span>Ads</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="onSelectMenu('orders')">
          <q-icon class="mb-2" :class="isActive('orders') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_receipt_long"/>
        <span>Orders</span>
      </button>
      <button class="footer-icon-btn q-mr-xs btn-ellipse" :class="{'text-white': darkMode}" @click="onSelectMenu('profile')">
          <q-icon class="mb-2" :class="isActive('profile') ? 'default-text-color' : 'inactive-color'" size="30px" name="o_account_circle"/>
        <span>Profile</span>
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
      darkMode: this.$store.getters['darkmode/getStatus'],
      activeButton: 'store'
    }
  },
  computed: {
    isNotDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  emits: ['clicked'],
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    selectMenu (menu) {
      this.activeButton = menu
    },
    onSelectMenu (menu) {
      this.selectMenu(menu)
      this.$emit('clicked', menu)
    },
    isActive (menu) {
      if (this.activeButton === menu) {
        return true
      } else {
        return false
      }
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
    background-color: #fff;
    border-top-right-radius: 20px;
    border-top-left-radius: 20px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
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
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
    .inactive-color {
      color: gray;
    }
  }
</style>
