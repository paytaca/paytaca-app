<template>
  <div id="app-container" :class="getDarkModeClass()">
    <header-nav :title="$t('Send')" backnavpath="/"></header-nav>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      :indicator-color="isDefaultTheme && 'transparent'"
      :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}"
      class="col-12 q-px-lg pp-fcolor"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab
      name="BCH"
      class="network-selection-tab"
      :class="{'text-blue-5': darkMode}"
      :label="networks.BCH.name"
      />
      <q-tab
      name="sBCH"
      class="network-selection-tab"
      :class="{'text-blue-5': darkMode}"
      :label="networks.sBCH.name"
      :disable="isChipnet"
      />
    </q-tabs>
    <template v-if="assets">
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}">
        <div class="col-9 q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm pt-label" :class="getDarkModeClass()">
            {{ $t('SelectAssetToSend') }}
          </p>
        </div>
        <div class="col-3 q-mt-sm" style="position: relative; margin-top: 45px;" v-show="selectedNetwork === networks.BCH.name">
          <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="redirectToSend(asset)"
          role="button"
          class="row q-pl-lg q-pr-lg token-link"
        >
          <div class="col row group-currency q-mb-sm" :class="getDarkModeClass('dark', 'bg-white light')">
            <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
              <div><img :src="asset.logo || getFallbackAssetLogo(asset)" width="50" /></div>
              <div class="col q-pl-sm q-pr-sm">
                <p
                  class="q-ma-none text-token text-weight-regular"
                  :class="darkMode ? isDefaultTheme ? 'text-grad' : 'dark' : 'light'"
                >
                  {{ asset.name }}
                </p>
                <p class="q-ma-none amount-text" :class="getDarkModeClass('dark', 'text-grad')">
                  {{ asset.id.startsWith('bch') ? String(asset.balance) : String(convertTokenAmount(asset.balance, asset.decimals)) }}
                  <span>
                    {{ asset.symbol }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="height: 90px;" v-if="assets.length > 5"></div>
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
import AssetFilter from '../../components/AssetFilter'
import { convertTokenAmount } from 'src/wallet/chipnet'

export default {
  name: 'Send-select-asset',
  mixins: [
    walletAssetsMixin
  ],
  components: {
    HeaderNav,
    AssetFilter,
  },
  data () {
    return {
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      activeBtn: 'btn-bch',
      result: '',
      error: '',
      isCashToken: true,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    isChipnet () {
      return this.$store.getters['global/isChipnet']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
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
        const assets = this.$store.getters['sep20/getAssets'].filter(Boolean)
        return assets.map((item) => {
          if (item?.id === 'bch') {
            item = Object.assign({}, item, {
              name: 'Smart Bitcoin Cash',
              symbol: 'sBCH',
              logo: 'sep20-logo.png',
            },)
            console.log(item)
          }
          return item
        })
      }

      const vm = this
      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item?.id?.split?.('/')?.[0]

          if (vm.isCashToken)
            return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })
    },
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    convertTokenAmount,
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    redirectToSend (asset) {
      let query = {
        assetId: asset.id,
        tokenType: 1,
        network: this.selectedNetwork
      }
      this.$router.push({
        name: 'transaction-send',
        query
      })
    },
    getDarkModeClass(darkModeClass = 'dark', lightModeClass = 'light') {
      return this.darkMode ? darkModeClass : lightModeClass
    }
  },
  mounted () {
    this.$store.dispatch('market/updateAssetPrices', {})
    const assets = this.$store.getters['assets/getAssets']
    const vm = this
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))
  }
}
</script>

<style scoped>
  .group-currency {
    width: 100%;
    border-radius: 7px;
    margin-top: 5px;
    margin-bottom: 5px;
  }
  .text-token {
    font-size: 18px;
  }
  .pp-fcolor {
    color: #000 !important;
  }
</style>
