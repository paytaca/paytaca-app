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
          class="col-3 q-mt-sm asset-filter-container">
          <AssetFilter v-if="enableSLP" @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <template
          v-for="(asset, index) in assets"
          :key="asset?.id || index"
        >
          <template v-if="asset && asset.id">
            <!-- FAVORITES label - show before first favorite token -->
            <div 
              v-if="shouldShowFavoritesLabel(asset, index)"
              class="q-pl-lg q-pr-lg q-mt-md q-mb-sm"
            >
              <p 
                class="q-ma-none text-uppercase text-weight-bold"
                :class="darkMode ? 'text-grey-4' : 'text-grey-7'"
                style="font-size: 12px; letter-spacing: 1px;"
              >
                {{ $t('Favorites').toLocaleUpperCase() }}
              </p>
            </div>
            <!-- OTHER TOKENS label - show before first non-favorite token -->
            <div 
              v-if="shouldShowOtherTokensLabel(asset, index)"
              class="q-pl-lg q-pr-lg q-mt-md q-mb-sm"
            >
              <p 
                class="q-ma-none text-uppercase text-weight-bold"
                :class="darkMode ? 'text-grey-4' : 'text-grey-7'"
                style="font-size: 12px; letter-spacing: 1px;"
              >
                {{ $t('OtherTokens').toLocaleUpperCase() }}
              </p>
            </div>
            <div
              @click="redirectToSend(asset)"
              role="button"
              class="row q-pl-lg q-pr-lg"
              id="asset-dropdown"
            >
          <div id="bitcoin-cash"
            class="col row group-currency q-mb-sm" :class="getDarkModeClass(darkMode)">
            <div class="row q-pt-sm q-pb-xs q-pl-md" style="width: 100%;">
              <div>
                <img
                  :src="getImageUrl(asset)"
                  width="50"
                  class="asset-icon"
                  alt=""
                  @touchstart.prevent.stop
                  @touchmove.prevent.stop
                  @touchend.prevent.stop
                  @contextmenu.prevent.stop
                  @selectstart.prevent
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
          </template>
        </template>
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
import { convertTokenAmount, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import axios from 'axios'

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
      wallet: null,
      allTokensFromAPI: [] // Store tokens fetched from API
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

      // For CashTokens, use API data directly
      if (vm.isCashToken) {
        // Get BCH asset from store
        let bchAsset = vm.$store.getters['assets/getAssets'].find(asset => asset?.id === 'bch')
        
        // Handle special case: if address is zcash format, exclude BCH
        if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
          bchAsset = null
        }
        
        // Use tokens from API - they already have favorite and favorite_order
        // Filter out tokens without an id to prevent rendering errors
        const apiTokens = (vm.allTokensFromAPI || [])
          .filter(token => token && token.id) // Only include tokens with valid id
          .map(token => ({
            id: token.id,
            name: token.name || 'Unknown Token',
            symbol: token.symbol || '',
            decimals: token.decimals || 0,
            logo: token.logo,
            balance: token.balance !== undefined ? token.balance : 0,
            favorite: token.favorite === true ? 1 : 0,
            favorite_order: token.favorite_order !== null && token.favorite_order !== undefined ? token.favorite_order : null
          }))

        // Sort: favorites first (by favorite_order), then non-favorites
        const sortedTokens = apiTokens.sort((a, b) => {
          // If one is favorite and other is not, favorite comes first
          if (a.favorite === 1 && b.favorite === 0) return -1
          if (a.favorite === 0 && b.favorite === 1) return 1
          // If both are favorites, sort by favorite_order
          if (a.favorite === 1 && b.favorite === 1) {
            const orderA = a.favorite_order || 0
            const orderB = b.favorite_order || 0
            return orderA - orderB
          }
          // If both are non-favorites, maintain their relative order
          return 0
        })

        // Separate favorites and non-favorites
        const favoriteTokens = sortedTokens.filter(token => token.favorite === 1)
        const nonFavoriteTokens = sortedTokens.filter(token => token.favorite === 0)

        // Ordering: BCH first (if not excluded), then favorites, then others
        const allAssets = [
          ...(bchAsset ? [bchAsset] : []),
          ...favoriteTokens,
          ...nonFavoriteTokens
        ].filter(asset => asset && asset.id) // Extra safety: filter out any undefined/invalid assets
        
        return allAssets
      }

      // For SLP tokens, use store data (API doesn't support SLP yet)
      // eslint-disable-next-line array-callback-return
      let assets = vm.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item?.id?.split?.('/')?.[0]
          return tokenType === 'slp' || isBch
        }
      })

      if (vm.address !== '' && vm.address.includes('bitcoincash:zq')) {
        assets = assets.slice(1)
      }

      // Sort: BCH first, then others
      const bchAsset = assets.find(asset => asset?.id === 'bch')
      const otherAssets = assets.filter(asset => asset?.id !== 'bch')

      const allAssets = [
        ...(bchAsset ? [bchAsset] : []),
        ...otherAssets
      ].filter(asset => asset && asset.id) // Extra safety: filter out any undefined/invalid assets
      
      return allAssets
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
      if (!asset) return this.getFallbackAssetLogo(asset)
      if (this.denomination === this.$t('DEEM') && asset.symbol === 'BCH') {
        return 'assets/img/theme/payhero/deem-logo.png'
      } else {
        if (asset.logo) {
          // Handle IPFS URLs (already converted by convertIpfsUrl)
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
      if (!assetId) return false
      // For CashTokens, use API data
      if (this.isCashToken) {
        const token = this.allTokensFromAPI.find(t => t && t.id === assetId)
        return token && (token.favorite === true || token.favorite === 1)
      }
      // For other cases, return false (legacy support)
      return false
    },
    async fetchTokensFromAPI () {
      // Only fetch for CashTokens
      if (!this.isCashToken) {
        return []
      }

      if (!this.wallet) {
        console.warn('Wallet not loaded, cannot fetch tokens')
        return []
      }

      const walletHash = this.wallet.BCH?.walletHash || this.wallet.bch?.walletHash
      if (!walletHash) {
        console.warn('Wallet hash not available')
        return []
      }

      const isChipnet = this.$store.getters['global/isChipnet']
      const baseUrl = getWatchtowerApiUrl(isChipnet)

      const filterParams = {
        has_balance: true,
        token_type: 1,
        wallet_hash: walletHash,
        limit: 100 // Fetch more tokens per page
      }

      try {
        const url = `${baseUrl}/cashtokens/fungible/`
        let allTokens = []
        let nextUrl = url
        let params = filterParams

        // Fetch all pages if there are more results
        while (nextUrl) {
          const { data } = await axios.get(nextUrl, { params })

          if (!Array.isArray(data.results)) {
            break
          }

          // Map API response to asset format
          const tokens = data.results
            .filter(result => {
              if (!result || !result.id) {
                console.warn('Token from API missing id:', result)
                return false
              }
              return true
            })
            .map(result => {
              // Convert IPFS URLs if needed
              const logo = result.image_url ? convertIpfsUrl(result.image_url) : null

              return {
                id: result.id,
                name: result.name || 'Unknown Token',
                symbol: result.symbol || '',
                decimals: result.decimals || 0,
                logo: logo,
                balance: result.balance !== undefined ? result.balance : 0,
                favorite: result.favorite === true ? 1 : 0, // Convert boolean to 1/0 format
                favorite_order: result.favorite_order !== null && result.favorite_order !== undefined ? result.favorite_order : null
              }
            })

          allTokens = [...allTokens, ...tokens]

          // Check if there's a next page
          if (data.next) {
            nextUrl = data.next
            params = {} // Don't send params again, URL already has them
          } else {
            nextUrl = null
          }
        }

        return allTokens
      } catch (error) {
        console.error('Error fetching tokens from API:', error)
        return []
      }
    },
    shouldShowFavoritesLabel(asset, index) {
      // Show label if:
      // 1. Current asset is a favorite
      // 2. Previous asset (if exists) is not a favorite (or is BCH)
      if (!asset || !asset.id) return false
      if (!this.isFavorite(asset.id)) return false

      if (index === 0) return false // Don't show before first item

      const previousAsset = this.assets[index - 1]
      if (!previousAsset || !previousAsset.id) return false

      // Show if previous asset was BCH or if it wasn't a favorite
      const isBch = previousAsset.id === 'bch'
      const wasFavorite = this.isFavorite(previousAsset.id)

      return (isBch || !wasFavorite)
    },
    shouldShowOtherTokensLabel(asset, index) {
      // Show label if:
      // 1. Current asset is NOT a favorite (and not BCH)
      // 2. Previous asset (if exists) was a favorite or BCH
      if (!asset || !asset.id) return false
      
      const isBch = asset.id === 'bch'
      if (isBch || this.isFavorite(asset.id)) return false

      if (index === 0) return false // Don't show before first item

      const previousAsset = this.assets[index - 1]
      if (!previousAsset || !previousAsset.id) return false

      // Show if previous asset was BCH or a favorite
      const prevIsBch = previousAsset.id === 'bch'
      const prevWasFavorite = this.isFavorite(previousAsset.id)

      return (prevIsBch || prevWasFavorite)
    },
    redirectToSend (asset) {
      if (this.online) {
        console.log('[SelectAssetSend] Clicked asset:', asset)
        
        // Prepare asset data to pass to send page
        // This ensures the send page has immediate access to logo, name, symbol, decimals, and balance
        const assetData = asset ? {
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol,
          decimals: asset.decimals !== undefined ? asset.decimals : 0,
          logo: asset.logo || null,
          balance: asset.balance !== undefined ? asset.balance : undefined
        } : null
        
        console.log('[SelectAssetSend] Passing asset data:', assetData)
        
        const query = {
          assetId: asset.id,
          tokenType: 1,
          network: this.selectedNetwork,
          address: this.address,
          backPath: this.backPath,
          // Pass asset data as JSON string to preserve structure
          assetData: assetData ? JSON.stringify(assetData) : undefined
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

    // Load wallet
    const wallet = await cachedLoadWallet('BCH', vm.$store.getters['global/getWalletIndex'])
    vm.wallet = wallet

    // For CashTokens, fetch tokens directly from API
    if (vm.isCashToken) {
      vm.allTokensFromAPI = await vm.fetchTokensFromAPI()
    } else {
      // For SLP, use store data (legacy behavior)
      const assets = vm.$store.getters['assets/getAssets']
      assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))
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
  },
  watch: {
    assets: {
      handler(newAssets) {
        // Debug log to check if any assets are invalid
        const invalidAssets = newAssets.filter(asset => !asset || !asset.id)
        if (invalidAssets.length > 0) {
          console.error('Invalid assets detected in send page:', invalidAssets)
          console.error('All assets:', newAssets)
        }
      },
      immediate: true
    },
    isCashToken () {
      // Reload tokens when filter changes
      if (this.isCashToken) {
        this.fetchTokensFromAPI().then(tokens => {
          this.allTokensFromAPI = tokens
        })
      }
    },
    selectedNetwork () {
      // Network changes not needed anymore (BCH only)
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
