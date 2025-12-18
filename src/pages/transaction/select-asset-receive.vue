<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav id="RECEIVE" 
      :title="$t('Receive')" backnavpath="/"></header-nav>
    <template v-if="assets">
      <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="q-mb-sm pt-label" :class="getDarkModeClass(darkMode)">
            {{ $t('SelectAssetToBeReceived') }}
          </p>
        </div>
        <div class="col-3 q-mt-sm asset-filter-container">
          <AssetFilter v-if="enableSLP" @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
        >
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
            @click="checkIfFirstTimeReceiver(asset)"
            role="button"
            class="row q-pl-lg q-pr-lg"
          >
          <div 
            class="col row group-currency q-mb-sm" 
            :class="getDarkModeClass(darkMode)" 
            v-if="isCashToken"
          >
            <div class="row q-pt-sm q-pb-xs q-pl-md" style="width: 100%;">
              <div>
                <img
                  v-if="asset.id === 'ct/unlisted' || asset.id === 'slp/unlisted'"
                  src="ct-logo.png"
                  width="50"
                  alt=""
                />
                <img
                  v-else
                  :src="getImageUrl(asset)"
                  width="50"
                  alt=""
                >
              </div>
              <div class="col q-pl-sm q-pr-sm">
                <p
                  class="q-ma-none text-token text-weight-regular"
                  :class="darkMode ? 'dark' : 'light'"
                >
                  {{ asset.name }}
                </p>
                <p
                  v-if="asset.id === 'ct/unlisted' || asset.id === 'slp/unlisted'"
                  class="q-ma-none amount-text"
                  :class="getDarkModeClass(darkMode, '', 'text-grad')"
                >
                  Any Fungible CashToken
                </p>
                <p
                  v-else-if="asset.id !== 'ct/unlisted' && asset.id !== 'slp/unlisted'"
                  class="q-ma-none amount-text"
                  :class="getDarkModeClass(darkMode, '', 'text-grad')"
                >
                  <template v-if="!asset.name.includes('New')">
                    <span>
                      {{ parseAssetDenomination(denomination, asset, false, 16) }}
                    </span>
                  </template>
                  {{ asset.name.includes('New') ? asset.symbol : '' }}
                </p>
              </div>
              <div v-if="isFavorite(asset.id)" class="q-pr-sm" style="display: flex; align-items: center;">
                <q-icon name="star" size="20px" color="amber-6" />
              </div>
            </div>
          </div>
          </div>
        </div>
        <q-banner
          v-if="!isCashToken"
          inline-actions
          class="bg-red text-center q-mt-lg text-bow slp-disabled-banner"
          :class="getDarkModeClass(darkMode)"
        >
          {{ `Receiving SLP ${isHongKong(currentCountry) ? 'points' : 'tokens'} is temporarily disabled until further notice.` }}
        </q-banner>
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
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import { cachedLoadWallet } from 'src/wallet'
import { getDarkModeClass, isHongKong } from 'src/utils/theme-darkmode-utils'
import FirstTimeReceiverWarning from 'src/pages/transaction/dialog/FirstTimeReceiverWarning'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { convertTokenAmount, getWalletByNetwork, getWatchtowerApiUrl } from 'src/wallet/chipnet'
import { convertIpfsUrl } from 'src/wallet/cashtokens'
import axios from 'axios'

export default {
  name: 'Receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: {
    HeaderNav,
    AssetFilter,
    FirstTimeReceiverWarning
  },
  data () {
    return {
      activeBtn: 'btn-bch',
      result: '',
      error: '',
      isCashToken: true,
      wallet: null,
      allTokensFromAPI: [], // Store tokens fetched from API
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
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      }
    },
    assets () {
      const themedIconPath = ''
      const themedNewTokenIcon = `${themedIconPath}new-token.png`

      // For CashTokens, use API data directly
      if (this.isCashToken) {
        // Get BCH asset from store
        const bchAsset = this.$store.getters['assets/getAssets'].find(asset => asset?.id === 'bch')
        
        // Use tokens from API - they already have favorite and favorite_order
        const apiTokens = (this.allTokensFromAPI || []).map(token => ({
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

        // Add unlisted CashToken
        const unlistedAsset = {
          id: 'ct/unlisted',
          name: 'CashToken',
          symbol: 'CashToken',
          logo: themedNewTokenIcon
        }

        // Ordering: BCH first, then unlisted CashToken, then favorites, then others
        return [
          ...(bchAsset ? [bchAsset] : []),
          unlistedAsset,
          ...favoriteTokens,
          ...nonFavoriteTokens
        ]
      }

      // For SLP tokens, use store data (API doesn't support SLP yet)
      const vm = this
      let _assets = this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          const isBch = item?.id === 'bch'
          const tokenType = item.id?.split?.('/')?.[0]
          return tokenType === 'slp' || isBch
        }
      })
      
      const unlistedAsset = {
        id: 'slp/unlisted',
        name: 'CashToken',
        symbol: 'SLP token',
        logo: themedNewTokenIcon
      }
      
      // Ordering: BCH first, then unlisted SLP token, then others
      const bchAsset = _assets.find(asset => asset?.id === 'bch')
      const otherAssets = _assets.filter(asset => asset?.id !== 'bch')
      
      return [
        ...(bchAsset ? [bchAsset] : []),
        unlistedAsset,
        ...otherAssets
      ]
    }
  },
  methods: {
    isFavorite(assetId) {
      // For CashTokens on BCH, use API data
      if (this.isCashToken && this.selectedNetwork === 'BCH') {
        const token = this.allTokensFromAPI.find(t => t.id === assetId)
        return token && (token.favorite === true || token.favorite === 1)
      }
      // For other cases, check if asset is in favorites (legacy support)
      // This shouldn't be needed for CashTokens on BCH anymore
      return false
    },
    async fetchTokensFromAPI () {
      // Only fetch for CashTokens on BCH network
      if (this.selectedNetwork !== 'BCH' || !this.isCashToken) {
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
          const tokens = data.results.map(result => {
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
      // 2. Previous asset (if exists) is not a favorite (or is BCH/unlisted CashToken)
      if (!this.isFavorite(asset.id)) return false
      
      if (index === 0) return false // Don't show before first item
      
      const previousAsset = this.assets[index - 1]
      if (!previousAsset) return false
      
      // Show if previous asset was BCH or unlisted CashToken, or if it wasn't a favorite
      const isUnlisted = previousAsset.id === 'ct/unlisted' || previousAsset.id === 'slp/unlisted'
      const isBch = previousAsset.id === 'bch'
      const wasFavorite = this.isFavorite(previousAsset.id)

      return (isBch || isUnlisted || !wasFavorite)
    },
    shouldShowOtherTokensLabel(asset, index) {
      // Show label if:
      // 1. Current asset is NOT a favorite (and not BCH or unlisted CashToken)
      // 2. Previous asset (if exists) was a favorite, BCH, or unlisted CashToken
      const isUnlisted = asset.id === 'ct/unlisted' || asset.id === 'slp/unlisted'
      const isBch = asset.id === 'bch'
      if (isBch || isUnlisted || this.isFavorite(asset.id)) return false

      if (index === 0) return false // Don't show before first item

      const previousAsset = this.assets[index - 1]
      if (!previousAsset) return false

      // Show if previous asset was a favorite, BCH, or unlisted CashToken
      const prevIsUnlisted = previousAsset.id === 'ct/unlisted' || previousAsset.id === 'slp/unlisted'
      const prevIsBch = previousAsset.id === 'bch'
      const prevWasFavorite = this.isFavorite(previousAsset.id)

      return (prevIsBch || prevIsUnlisted || prevWasFavorite)
    },
    convertTokenAmount,
    parseAssetDenomination,
    getDarkModeClass,
    isHongKong,
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    changeNetwork (newNetwork = 'BCH') {
      this.selectedNetwork = newNetwork
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    getImageUrl (asset) {
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
    async isFirstTimeReceiver(asset) {
      if ((asset?.balance ?? 0) !== 0) return false
      if ((asset?.txCount ?? 0) !== 0) return false
      if (asset.id.split('/')[1] === 'unlisted') return false

      const transactionsLength = await this.getBchTransactions(asset)

      this.$store.commit('assets/updateAssetTxCount', {
        id: asset?.id,
        txCount: transactionsLength,
      })

      return transactionsLength === 0
    },
    async checkIfFirstTimeReceiver (asset) {
      // check wallet/assets if balance is zero and no transactions were made
      const displayFirstTimeReceiverWarning = await this.isFirstTimeReceiver(asset)
      if (displayFirstTimeReceiverWarning) {
        this.$q.dialog({ component: FirstTimeReceiverWarning })
          .onOk(() => {
            this.$router.push({
              name: 'transaction-receive',
              query: { assetId: asset.id, network: this.selectedNetwork }
            })
          })
      } else {
        this.$router.push({
          name: 'transaction-receive',
          query: { assetId: asset.id, network: this.selectedNetwork }
        })
      }
    },
    async getBchTransactions (asset) {
      const vm = this
      const id = asset.id
      let historyLength = -1
      let requestPromise

      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'slp').getTransactions(tokenId, 1, 'all')
      } else if (id.indexOf('ct/') > -1) {
        const tokenId = id.split('/')[1]
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(1, 'all', tokenId)
      } else {
        requestPromise = getWalletByNetwork(vm.wallet, 'bch').getTransactions(1, 'all')
      }

      if (!requestPromise) return
      await requestPromise.then((response) => {
        historyLength = response?.history.length ?? 0
      })

      return historyLength
    }
  },
  async mounted () {
    const vm = this
    vm.$store.dispatch('market/updateAssetPrices', {})

    // Fetch and update lastAddressIndex from backend
    try {
      await vm.$store.dispatch('global/loadWalletLastAddressIndex')
    } catch (error) {
      console.error('Error loading last address index:', error)
      // Continue even if this fails
    }

    // Load wallet
    const wallet = await cachedLoadWallet('BCH', vm.$store.getters['global/getWalletIndex'])
    vm.wallet = wallet

    // For CashTokens on BCH, fetch tokens directly from API
    if (vm.isCashToken) {
      vm.allTokensFromAPI = await vm.fetchTokensFromAPI()
    } else {
      // For SLP, use store data (legacy behavior)
      const bchAssets = vm.$store.getters['assets/getAssets']
      bchAssets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))
    }
  },
  watch: {
    isCashToken () {
      // Reload tokens when filter changes
      if (this.isCashToken) {
        this.fetchTokensFromAPI().then(tokens => {
          this.allTokensFromAPI = tokens
        })
      }
    },
    selectedNetwork () {
      // Reload tokens when network changes
      if (this.isCashToken && this.selectedNetwork === 'BCH') {
        this.fetchTokensFromAPI().then(tokens => {
          this.allTokensFromAPI = tokens
        })
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
