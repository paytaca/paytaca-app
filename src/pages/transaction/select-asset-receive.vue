<template>
  <div id="app-container" :class="getDarkModeClass()">
    <header-nav :title="$t('Receive')" backnavpath="/"></header-nav>
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
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="slp_tokens q-mb-sm pt-label" :class="getDarkModeClass()">
            {{ $t('SelectAssetToBeReceived') }}
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
          @click="$router.push({ name: 'transaction-receive', query: { assetId: asset.id, network: selectedNetwork } })"
          role="button"
          class="row q-pl-lg q-pr-lg token-link"
        >
          <div class="col row group-currency q-mb-sm" :class="getDarkModeClass('', 'bg-white')" v-if="isCashToken">
            <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
              <div><img :src="asset.logo || getFallbackAssetLogo(asset)" width="50"></div>
              <div class="col q-pl-sm q-pr-sm">
                <p
                  class="q-ma-none text-token text-weight-regular"
                  :class="darkMode ? isDefaultTheme ? 'text-grad' : 'dark' : 'light'"
                >
                  {{ isHongKong() ? asset.name.replace('Token', 'Point') : asset.name }}
                </p>
                <p class="q-ma-none amount-text" :class="getDarkModeClass('', 'text-grad')">
                  <span v-if="asset.balance">{{ parseAssetDenomination(denomination, asset, 16) }}</span>
                  {{
                      asset.name.includes('New')
                        ? isHongKong()
                          ? asset.symbol.replace('Token', 'Point')
                          : asset.symbol
                        : ''
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <q-banner v-if="!isCashToken" inline-actions class="text-white bg-red text-center q-mt-lg" :class="darkMode ? 'text-white' : 'text-black'" style="width: 90%; margin-left: auto; margin-right: auto;">
          {{ `Receiving SLP ${isHongKong() ? 'points' : 'tokens'} is temporarily disabled until further notice.` }}
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
import { parseAssetDenomination } from 'src/utils/denomination-utils'

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
      darkMode: this.$store.getters['darkmode/getStatus'],
      currentCountry: this.$store.getters['global/country'].code,
      denomination: this.$store.getters['global/denomination']
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
      const themedIconPath = this.isDefaultTheme ? `assets/img/theme/${this.$store.getters['global/theme']}/` : ''
      const themedNewTokenIcon = `${themedIconPath}new-token.png`

      if (this.selectedNetwork === 'sBCH') {
        _assets = this.$store.getters['sep20/getAssets'].filter(Boolean)
        _assets = _assets.map((item) => {
          if (item?.id === 'bch') {
            item.name = 'Smart Bitcoin Cash'
            item.symbol = 'sBCH'
            item.logo = 'sep20-logo.png'
          }
          return item
        })
        const unlistedAsset = {
          id: 'sep20/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: `SEP20 ${this.isHongKong() ? 'point' : 'token'}`,
          logo: themedNewTokenIcon
        }
        _assets.push(unlistedAsset)
        return _assets
      }

      const vm = this
      _assets = this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item.id?.split?.('/')?.[0]

          if (vm.isCashToken) 
            return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })
      let unlistedAsset = {
        id: 'slp/unlisted',
        name: this.$t('NewUnlisted'),
        symbol: 'SLP token',
        logo: themedNewTokenIcon
      }
      if (vm.isCashToken) {
        unlistedAsset = {
          id: 'ct/unlisted',
          name: this.$t('NewUnlisted'),
          symbol: 'CashToken',
          logo: themedNewTokenIcon
        } 
      }
      _assets.push(unlistedAsset)
      return _assets
    },
    isDefaultTheme () {
      return this.$store.getters['global/theme'] !== 'default'
    }
  },
  methods: {
    convertTokenAmount,
    parseAssetDenomination,
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    getDarkModeClass (darkModeClass = '', lightModeClass = '') {
      return this.darkMode ? `dark ${darkModeClass}` : `light ${lightModeClass}`
    },
    isHongKong () {
      return this.currentCountry === 'HK'
    },
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
  .text-token {
    font-size: 18px;
  }
  .pp-fcolor {
    color: #000 !important;
  }
  .pt-label {
    font-size: 16px;
    font-weight: 300;
  }
</style>
