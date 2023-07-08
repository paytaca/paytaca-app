<template>
  <div id="app-container" :class="{'pt-dark': darkMode}">
    <header-nav :title="$t('Receive')" backnavpath="/"></header-nav>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}"
      class="col-12 q-px-lg pp-fcolor"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab name="BCH" :class="{'text-blue-5': darkMode}" :label="networks.BCH.name"/>
      <q-tab name="sBCH" :class="{'text-blue-5': darkMode}" :label="networks.sBCH.name" :disable="isChipnet"/>
    </q-tabs>
    <template v-if="assets">
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm" :class="{'pt-dark-label': darkMode}">{{ $t('SelectAssetToBeReceived') }}</p>
        </div>
        <div class="col-3 q-mt-sm" style="position: relative; margin-top: 45px;" v-show="selectedNetwork === networks.BCH.name">
          <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="$router.push({ name: 'transaction-receive', query: { assetId: asset.id, network: selectedNetwork } })"
          role="button"
          class="row q-pl-lg q-pr-lg token-link"
        >
          <div class="col row group-currency q-mb-sm" :class="darkMode ? 'pt-dark-card' : 'bg-white'" v-if="isCashToken">
            <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
              <div><img :src="asset.logo || getFallbackAssetLogo(asset)" width="50"></div>
              <div class="col q-pl-sm q-pr-sm">
                <p class="q-ma-none text-token text-weight-regular" :class="darkMode ? 'text-pink-5' : 'text-dark'" style="font-size: 18px;">
                  {{ asset.name }}
                </p>
                <p class="q-ma-none" :class="darkMode ? 'text-grey' : 'text-grad'" style="font-size: 18px;">
                  <span v-if="asset.balance">{{ String(convertTokenAmount(asset.balance, asset.decimals, isBCH=asset.symbol.toLowerCase() === 'bch', isSLP=isSLP=asset.id.startsWith('slp/'))).substring(0, 16) }}</span>
                  {{ asset.symbol }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <q-banner v-if="!isCashToken" inline-actions class="text-white bg-red text-center q-mt-lg" :class="darkMode ? 'text-white' : 'text-black'" style="width: 90%; margin-left: auto; margin-right: auto;">
          Receiving SLP tokens is temporarily disabled until further notice.
        </q-banner>
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
  name: 'Receive-page',
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
      let _assets
      if (this.selectedNetwork === 'sBCH') {
        _assets = this.$store.getters['sep20/getAssets'].filter(Boolean)
        _assets = _assets.map((item) => {
          if (item.id === 'bch') {
            item.name = 'Smart Bitcoin Cash'
            item.symbol = 'sBCH'
            item.logo = 'sep20-logo.png'
          }
          return item
        })
        const unlistedAsset = {
          id: 'sep20/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: 'SEP20 token',
          logo: 'new-token.png'
        }
        _assets.push(unlistedAsset)
        return _assets
      }

      const vm = this
      _assets = this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item.id === 'bch'
          const tokenType = item.id.split('/')[0]

          if (vm.isCashToken) 
            return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })
      let unlistedAsset = {
        id: 'slp/unlisted',
        name: this.$t('NewUnlisted'),
        symbol: 'SLP token',
        logo: 'new-token.png'
      }
      if (vm.isCashToken) {
        unlistedAsset = {
          id: 'ct/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: 'CashToken',
          logo: 'new-token.png'
        } 
      }
      _assets.push(unlistedAsset)
      return _assets
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
    }
  },
  mounted () {
    const assets = this.$store.getters['assets/getAssets']
    const vm = this
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))
  }
}
</script>

<style lang="scss" scoped>
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
