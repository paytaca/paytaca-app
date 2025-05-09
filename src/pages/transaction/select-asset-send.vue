<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Send')" :backnavpath="!backPath ? '/' : backPath"></header-nav>
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
                  :src="getImageUrl(asset)"
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
                <p v-if="asset.id.startsWith('ct/')" class="q-ma-none amount-text" :class="getDarkModeClass(darkMode, '', 'text-grad')">
                  {{ convertTokenAmount(asset.balance, asset.decimals, decimalPlaces=asset.decimals) }} {{ asset.symbol }}
                </p>
                <p v-else class="q-ma-none amount-text" :class="getDarkModeClass(darkMode, '', 'text-grad')">
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
      {{ $t('NoAssetsAvailable') }}
    </div>
    <footer-menu />
  </div>
</template>
<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import { cachedLoadWallet } from 'src/wallet'
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
    },
    backPath: {
      type: String,
      default: null
    }
  },
  components: {
    HeaderNav,
    AssetFilter
  },
  data () {
    return {
      networks: { BCH: { name: 'BCH' } },
      activeBtn: 'btn-bch',
      result: '',
      error: '',
      isCashToken: true,
      tokenNotFoundDialog: null
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
    online () {
      return this.$store.state.global.online
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
      const vm = this

      // eslint-disable-next-line array-callback-return
      const assets = vm.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item?.id?.split?.('/')?.[0]

          if (vm.isCashToken) return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })

      if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
        return assets.splice(1)
      }

      return assets
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
    getImageUrl (asset) {
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          if (asset.logo.startsWith('https://ipfs.paytaca.com/ipfs')) {
            return asset.logo + '?pinataGatewayToken=' + process.env.PINATA_GATEWAY_TOKEN
          } else {
            return asset.logo
          }
        } else {
          return this.getFallbackAssetLogo(asset)
        }
      }
    },
    redirectToSend (asset) {
      if (this.online) {
        const query = {
          assetId: asset.id,
          tokenType: 1,
          network: this.selectedNetwork,
          address: this.address,
          backPath: this.backPath
        }
        this.$router.push({
          name: 'transaction-send',
          query
        })
      } else {
        this.$q.dialog({
          title: this.$t('Warning'),
          message: this.$t('SendPageOffline'),
          persistent: true,
          seamless: true,
          ok: true,
          class: `pt-card no-click-outside text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
      }
    }
  },
  async mounted () {
    const vm = this
    vm.$store.dispatch('market/updateAssetPrices', {})
    const assets = vm.$store.getters['assets/getAssets']
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

    if (this.$route.query.error === 'token-mismatch') {
      this.$router.replace({ path: this.$route.path })
      this.$q.dialog({
        title: this.$t('TokenMismatch'),
        message: this.$t('TokenMismatchMessage'),
        persistent: true,
        seamless: true,
        ok: true,
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
      })
    }

    if (this.$route.query.error === 'token-not-found') {
      this.$router.replace({ path: this.$route.path })
      this.tokenNotFoundDialog = this.$q.dialog({
        title: this.$t('TokenNotFound'),
        message: this.$t('TokenNotFoundMessage'),
        persistent: true,
        seamless: true,
        ok: true,
        class: `pt-card text-bow ${this.getDarkModeClass(this.darkMode)} no-click-outside`
      })
    }

    // update balance of assets
    const wallet = await cachedLoadWallet('BCH', vm.$store.getters['global/getWalletIndex'])
    for (var i = 0; i < assets.length; i = i + 3) {
      const balanceUpdatePromises = assets.slice(i, i + 3).map(asset => {
        return updateAssetBalanceOnLoad(asset.id, wallet, vm.$store)
      })
      const assetMetadataUpdatePromises = assets.slice(i, i + 3).map(asset => {
        return vm.$store.dispatch('assets/getAssetMetadata', asset.id)
      })
      await Promise.allSettled([...balanceUpdatePromises, ...assetMetadataUpdatePromises])
    }
  },
  beforeRouteLeave (to, from, next) {
    // Close any open dialogs before leaving
    if (this.tokenNotFoundDialog) {
      this.tokenNotFoundDialog.hide()
    }
    next()
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
