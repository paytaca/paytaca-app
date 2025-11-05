<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav id="SEND"
      :title="$t('Send')" :backnavpath="!backPath ? '/' : backPath"></header-nav>
    <template v-if="assets">
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}">
        <div class="col-9 q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="q-mb-sm pt-label" :class="getDarkModeClass(darkMode)" id="select-asset-to-send">
            {{ $t('SelectAssetToSend') }}
          </p>
        </div>
        <div
          class="col-3 q-mt-sm asset-filter-container" v-show="selectedNetwork === networks.BCH.name">
          <AssetFilter v-if="enableSLP" @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          id = "asset-dropdown"
          v-for="(asset, index) in assets"
          :key="index"
          @click="redirectToSend(asset)"
          role="button"
          class="row q-pl-lg q-pr-lg"
        >
          <div id="bitcoin-cash"
            class="col row group-currency q-mb-sm" :class="getDarkModeClass(darkMode)">
            <div class="row q-pt-sm q-pb-xs q-pl-md" style="width: 100%;">
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
                  :class="darkMode ? 'dark' : 'light'"
                >
                  {{ asset.name }}
                </p>
                <p class="q-ma-none amount-text" :class="getDarkModeClass(darkMode, '', 'text-grad')">
                  {{ parseAssetDenomination(denomination, asset, false, 16) }}
                </p>
              </div>
              <div v-if="isFavorite(asset.id)" class="q-pr-sm" style="display: flex; align-items: center;">
                <q-icon name="star" size="20px" color="amber-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Show More / Show Less Button -->
      <div v-if="hasNonFavoriteTokens" class="q-pa-md text-center">
        <q-btn
          flat
          no-caps
          :label="showAllTokens ? $t('ShowLess', {}, 'Show Less') : $t('ShowMore', {}, 'Show More')"
          :icon="showAllTokens ? 'expand_less' : 'expand_more'"
          @click="showAllTokens = !showAllTokens"
          :class="getDarkModeClass(darkMode)"
          color="primary"
        />
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
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import * as assetSettings from 'src/utils/asset-settings'

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
    paymentUrl: {
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
      tokenNotFoundDialog: null,
      favorites: [],
      customList: null,
      showAllTokens: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    enableSLP () {
      return this.$store.getters['global/enableSLP']
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
      let assets = vm.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item?.id?.split?.('/')?.[0]

          if (vm.isCashToken) return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })

      if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
        assets = assets.slice(1)
      }

      // Sort: BCH first, then favorites (using custom list order), then others
      const bchAsset = assets.find(asset => asset?.id === 'bch')
      const favoriteTokenIds = vm.favorites
        .filter(item => item.favorite === 1)
        .map(item => item.id)
      
      // Build ordered list from custom list if available
      let orderedAssets = []
      if (vm.customList && vm.customList.BCH && Array.isArray(vm.customList.BCH)) {
        // Map all assets from custom list in order (excluding BCH which is handled separately)
        orderedAssets = vm.customList.BCH
          .map(id => {
            // Skip BCH as it's handled separately
            if (id === 'bch') return null
            return assets.find(asset => {
              const aid = String(asset?.id || '')
              return aid === id || aid.endsWith('/' + id)
            })
          })
          .filter(Boolean)
      } else {
        // Fallback: use all assets in their current order
        orderedAssets = assets.filter(asset => asset?.id !== 'bch')
      }

      // Separate into favorites and others, preserving custom list order
      const favoriteAssets = orderedAssets.filter(asset => {
        const aid = String(asset?.id || '')
        return favoriteTokenIds.some(fid => fid === aid || aid.endsWith('/' + fid))
      })

      const sortedOtherAssets = orderedAssets.filter(asset => {
        const aid = String(asset?.id || '')
        const isFav = favoriteTokenIds.some(fid => fid === aid || aid.endsWith('/' + fid))
        return !isFav
      })

      // Hide non-favorite tokens by default
      if (!vm.showAllTokens) {
        return [
          ...(bchAsset ? [bchAsset] : []),
          ...favoriteAssets
        ]
      }

      return [
        ...(bchAsset ? [bchAsset] : []),
        ...favoriteAssets,
        ...sortedOtherAssets
      ]
    },
    hasNonFavoriteTokens () {
      const vm = this
      const favoriteTokenIds = vm.favorites
        .filter(item => item.favorite === 1)
        .map(item => item.id)
      
      const allAssets = vm.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item?.id?.split?.('/')?.[0]

          if (vm.isCashToken) return tokenType === 'ct' || isBch
          return tokenType === 'slp' || isBch
        }
      })

      const otherAssets = allAssets.filter(asset => 
        asset?.id !== 'bch' && !favoriteTokenIds.includes(asset?.id)
      )

      return otherAssets.length > 0
    }
  },
  methods: {
    convertTokenAmount,
    getDarkModeClass,
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
    isFavorite(assetId) {
      return this.favorites.some(item => item.id === assetId && item.favorite === 1)
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
        // If paymentUrl is provided, pass it to preserve all BIP21 parameters
        if (this.paymentUrl) {
          query.paymentUrl = this.paymentUrl
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

    // Fetch custom list and favorites for sorting
    try {
      const [customList, favorites] = await Promise.all([
        assetSettings.fetchCustomList(),
        assetSettings.fetchFavorites()
      ])
      if (customList && !('error' in customList)) {
        vm.customList = customList
      }
      if (favorites && Array.isArray(favorites)) {
        vm.favorites = favorites
      }
    } catch (error) {
      console.error('Error fetching custom list or favorites:', error)
    }

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
        ok: {
          label: this.$t('OK'),
          handler: () => {
            this.$router.push('/')
          }
        },
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
