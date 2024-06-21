<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Send')" backnavpath="/"></header-nav>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      :indicator-color="isNotDefaultTheme(theme) && 'transparent'"
      :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}"
      class="col-12 q-px-lg pp-fcolor"
      :modelValue="selectedNetwork"
      @update:modelValue="changeNetwork"
    >
      <q-tab
        name="BCH"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        :label="networks.BCH.name"
      />
      <q-tab
        name="sBCH"
        class="network-selection-tab"
        :class="getDarkModeClass(darkMode)"
        :label="networks.sBCH.name"
        :disable="isChipnet"
      />
    </q-tabs>
    <template v-if="assets">
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}">
        <div class="col-9 q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="q-mb-sm pt-label" :class="getDarkModeClass(darkMode)">
            {{ $t('SelectAssetToSend') }}
          </p>
        </div>
        <div class="col-3 q-mt-sm asset-filter-container" v-show="selectedNetwork === networks.BCH.name">
          <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="redirectToSend(asset)"
          role="button"
          class="row q-pl-lg q-pr-lg"
        >
          <div class="col row group-currency q-mb-sm" :class="getDarkModeClass(darkMode)">
            <div class="row q-pt-sm q-pb-xs q-pl-md">
              <div>
                <img
                  :src="denomination === $t('DEEM') && asset.symbol === 'BCH'
                    ? 'assets/img/theme/payhero/deem-logo.png'
                    : asset.logo || getFallbackAssetLogo(asset)
                  "
                  width="50"
                  alt=""
                />
              </div>
              <div class="col q-pl-sm q-pr-sm">
                <p
                  class="q-ma-none text-token text-weight-regular"
                  :class="darkMode ? isNotDefaultTheme(theme) ? 'text-grad' : 'dark' : 'light'"
                >
                  {{ asset.name }}
                </p>
                <p class="q-ma-none amount-text" :class="getDarkModeClass(darkMode, '', 'text-grad')">
                  {{ parseAssetDenomination(denomination, asset) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="vertical-space" v-if="assets.length > 5"></div>
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
import { markRaw } from '@vue/reactivity'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import { getMnemonic, Wallet } from 'src/wallet'
import { convertTokenAmount } from 'src/wallet/chipnet'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'

export default {
  name: 'Send-select-asset',
  mixins: [
    walletAssetsMixin
  ],
  props: {
    address: {
      type: String,
      default: ''
    }
  },
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
      isCashToken: true
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    denomination () {
      return this.$store.getters['global/denomination']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
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
    }
  },
  methods: {
    convertTokenAmount,
    getDarkModeClass,
    isNotDefaultTheme,
    isHongKong,
    parseAssetDenomination,
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    redirectToSend (asset) {
      const query = {
        assetId: asset.id,
        tokenType: 1,
        network: this.selectedNetwork,
        address: this.address
      }
      this.$router.push({
        name: 'transaction-send',
        query
      })
    }
  },
  async mounted () {
    const vm = this
    vm.$store.dispatch('market/updateAssetPrices', {})
    const assets = vm.$store.getters['assets/getAssets']
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

    // update balance of assets
    await getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      let wallet = new Wallet(mnemonic, vm.network)
      wallet = markRaw(wallet)
      if (vm.selectedNetwork === 'sBCH') wallet.sBCH.getOrInitWallet()

      assets.forEach(async (asset) => {
        await updateAssetBalanceOnLoad(asset.id, wallet, vm.$store)
      })
    })

    // check if address is not empty (from qr reader redirection)
    if (vm.address !== '') {
      if (vm.address.includes('bitcoincash:zq')) {
        // cashtoken
      } else if (vm.address.includes('bitcoincash:qq') || vm.address.includes('bitcoincash:?')) {
        // bch
        vm.redirectToSend(assets[0])
      }
    }
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
  .pt-label {
    font-size: 16px;
    font-weight: 300;
  }
</style>
