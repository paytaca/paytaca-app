<template>
  <div
    class="row justify-center fixed-footer"
    :class="getDarkModeClass()"
    :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto', 'padding-bottom': $q.platform.is.ios ? '80px' : '0'}"
  >
    <div class="col row justify-evenly footer-btn-container q-ml-sm q-mr-sm q-gutter-xs">
      <q-btn flat no-caps dense class="footer-icon-btn q-mr-xs btn-ellipse cursor-pointer" :class="{'text-white': darkMode}" @click="onSelectMenu('FiatStore')">
          <q-icon class="mb-2" :class="isActive('FiatStore') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_storefront"/>
        <span>{{ $t('Home') }}</span>
      </q-btn>
      <q-btn flat no-caps dense class="footer-icon-btn q-mr-xs btn-ellipse cursor-pointer" :class="{'text-white': darkMode}" @click="onSelectMenu('FiatAds')">
          <q-icon class="mb-2" :class="isActive('FiatAds') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_sell"/>
        <span>{{ $t('Ads') }}</span>
      </q-btn>
      <q-btn flat no-caps dense class="footer-icon-btn btn-ellipse cursor-pointer" :class="{'text-white': darkMode}" @click="onSelectMenu('FiatOrders')">
        <q-icon class="mb-2" :class="isActive('FiatOrders') ? 'default-text-color' : 'inactive-color'" size="30px" name="sym_o_receipt_long"></q-icon>
        <q-badge v-if="data?.unreadOrdersCount > 0" rounded color="red" floating>{{ data?.unreadOrdersCount }}</q-badge>
        <!-- <q-badge class="" rounded color="red" floating>4</q-badge> -->
        <span>{{ $t('Orders') }}</span>
      </q-btn>
      <q-btn flat no-caps dense class="footer-icon-btn q-mr-xs btn-ellipse cursor-pointer" :class="{'text-white': darkMode}" @click="onSelectMenu('FiatProfileCard')">
          <q-icon class="mb-2" :class="isActive('FiatProfileCard') ? 'default-text-color' : 'inactive-color'" size="30px" name="o_account_circle"/>
        <span>{{ $t('Profile') }}</span>
      </q-btn>
      <q-btn flat no-caps dense v-if="$q.platform.is.bex" class="footer-icon-btn q-mr-xs btn-ellipse" @click="expandBex">
        <i class="footer-icon mdi mdi-launch default-text-color"></i>
      </q-btn>
    </div>
  </div>
</template>

<script>
export default {
  name: 'footer-menu',
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      activeButton: 'FiatStore'
    }
  },
  emits: ['clicked'],
  props: {
    tab: String,
    data: Object
  },
  computed: {
  },
  mounted () {
    if (this.tab) this.activeButton = this.tab
  },
  methods: {
    expandBex () {
      this.$q.bex.send('ui.expand')
    },
    async onSelectMenu (menu) {
      // this.activeButton = menu
      let pageName = null
      switch (menu) {
        case 'FiatStore':
          pageName = 'p2p-store'
          break
        case 'FiatAds':
          pageName = 'p2p-ads'
          break
        case 'FiatOrders':
          pageName = 'p2p-orders'
          break
        case 'FiatProfileCard':
          pageName = 'p2p-profile'
          break
      }
      this.$store.commit('ramp/resetListingTabs')
      await this.$router.replace({ name: pageName })
      this.$emit('clicked', { name: menu })
    },
    isActive (menu) {
      switch (menu) {
        case 'FiatStore':
          return this.$route.name === 'p2p-store'
        case 'FiatAds':
          return this.$route.name === 'p2p-ads'
        case 'FiatOrders':
          return this.$route.name === 'p2p-orders'
        case 'FiatProfileCard':
          return this.$route.name === 'p2p-profile'
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
      width: 40px;
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
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
    .inactive-color {
      color: gray;
    }
  }
</style>
