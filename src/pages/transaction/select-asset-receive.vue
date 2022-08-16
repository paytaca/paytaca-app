<template>
  <div id="app-container" :class="{'pt-dark': $store.getters['darkmode/getStatus']}">
    <header-nav title="RECEIVE" backnavpath="/"></header-nav>
    <q-tabs
      dense
      active-color="brandblue"
      style="margin-top: 70px;"
      class="col-12 q-px-lg pp-fcolor"
      :value="selectedNetwork"
      @input="changeNetwork"
    >
      <q-tab name="BCH" :class="{'text-blue-5': $store.getters['darkmode/getStatus']}" :label="networks.BCH.name"/>
      <q-tab name="sBCH" :class="{'text-blue-5': $store.getters['darkmode/getStatus']}" :label="networks.sBCH.name"/>
    </q-tabs>
    <template v-if="assets">
      <div class="row">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm" :class="{'pt-dark-label': $store.getters['darkmode/getStatus']}">Select Asset to be Received</p>
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="$router.push({ name: 'transaction-receive', params: { assetId: asset.id, network: selectedNetwork } })"
          role="button"
          class="row q-pl-lg q-pr-lg token-link"
        >
          <div class="col row group-currency q-mb-sm" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark-card' : 'bg-white'">
            <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
              <div><img :src="asset.logo || getFallbackAssetLogo(asset)" width="50"></div>
              <div class="col q-pl-sm q-pr-sm">
                <p class="q-ma-none text-token text-weight-regular" :class="$store.getters['darkmode/getStatus'] ? 'text-pink-5' : 'text-dark'" style="font-size: 18px;">
                  {{ asset.name }}
                </p>
                <p class="q-ma-none" :class="$store.getters['darkmode/getStatus'] ? 'text-grey' : 'text-grad'" style="font-size: 18px;">
                  {{ String(asset.balance).substring(0, 16) }}
                  {{ asset.symbol }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="q-pa-sm text-grey text-center text-h6"
    >
      No assets available
    </div>

    <footer-menu />
  </div>
</template>
<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'Receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { HeaderNav },
  data () {
    return {
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      activeBtn: 'btn-bch',
      result: '',
      error: ''
    }
  },
  computed: {
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      }
    },
    assets () {
      if (this.selectedNetwork === 'sBCH') {
        return this.$store.getters['sep20/getAssets'].filter(Boolean)
      }

      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          return item
        }
      })
    }
  },
  methods: {
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    }
  }
}
</script>

<style lang="scss" scoped>
  #app-container {
    position: relative !important;
    background-color: #ECF3F3;
    min-height: 100vh;
  }
  .group-currency {
    width: 100%;
    border-radius: 7px;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .pp-fcolor {
    color: #000 !important;
  }
</style>
