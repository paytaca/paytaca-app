<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav id="RECEIVE" 
      :title="$t('Receive')" backnavpath="/"></header-nav>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      
      :style="{ 'margin-top': $q.platform.is.ios ? '20px' : '0px'}"
      class="col-12 q-px-lg"
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
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
          <p class="q-mb-sm pt-label" :class="getDarkModeClass(darkMode)">
            {{ $t('SelectAssetToBeReceived') }}
          </p>
        </div>
        <div class="col-3 q-mt-sm asset-filter-container" v-show="selectedNetwork === networks.BCH.name">
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
              FAVORITES
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
              OTHER TOKENS
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
                  v-if="asset.id === 'ct/unlisted' || asset.id === 'sep20/unlisted' || asset.id === 'slp/unlisted'"
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
                  v-if="asset.id === 'ct/unlisted' || asset.id === 'sep20/unlisted' || asset.id === 'slp/unlisted'"
                  class="q-ma-none amount-text" 
                  :class="getDarkModeClass(darkMode, '', 'text-grad')"
                >
                  Any Fungible CashToken
                </p>
                <p 
                  v-else-if="asset.id !== 'ct/unlisted' && asset.id !== 'sep20/unlisted' && asset.id !== 'slp/unlisted'"
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
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import FirstTimeReceiverWarning from 'src/pages/transaction/dialog/FirstTimeReceiverWarning'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { convertTokenAmount, getWalletByNetwork } from 'src/wallet/chipnet'
import * as assetSettings from 'src/utils/asset-settings'

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
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      activeBtn: 'btn-bch',
      result: '',
      error: '',
      isCashToken: true,
      wallet: null,
      favorites: [],
      customList: null,
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
      const themedIconPath = ''
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
          name: 'CashToken',
          symbol: 'SEP20 token',
          logo: themedNewTokenIcon
        }
        // Ordering: sBCH first, then unlisted SEP20 token, then others
        const bchAsset = _assets.find(asset => asset?.id === 'bch')
        const otherAssets = _assets.filter(asset => asset?.id !== 'bch')
        return [
          ...(bchAsset ? [bchAsset] : []),
          unlistedAsset,
          ...otherAssets
        ]
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
        name: 'CashToken',
        symbol: 'SLP token',
        logo: themedNewTokenIcon
      }
      if (vm.isCashToken) {
        unlistedAsset = {
          id: 'ct/unlisted',
          name: 'CashToken',
          symbol: 'CashToken',
          logo: themedNewTokenIcon
        } 
      }
      // Ordering: BCH first, then favorites (using custom list order), then others, with optional unlisted at end
      const bchAsset = _assets.find(asset => asset?.id === 'bch')
      const favoriteTokenIds = this.favorites
        .filter(item => item.favorite === 1)
        .map(item => item.id)

      // Build ordered list from custom list if available
      let orderedAssets = []
      if (this.customList && this.customList.BCH && Array.isArray(this.customList.BCH)) {
        // Map all assets from custom list in order (excluding BCH which is handled separately)
        orderedAssets = this.customList.BCH
          .map(id => {
            // Skip BCH as it's handled separately
            if (id === 'bch') return null
            return _assets.find(asset => {
              const aid = String(asset?.id || '')
              return aid === id || aid.endsWith('/' + id)
            })
          })
          .filter(Boolean)
      } else {
        // Fallback: use all assets in their current order
        orderedAssets = _assets.filter(asset => asset?.id !== 'bch')
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

      // Ordering: BCH first, then New/Unlisted CashToken (if CashToken mode), then favorites, then others
      const baseList = [
        ...(bchAsset ? [bchAsset] : []),
        // Add unlisted CashToken right after BCH if in CashToken mode
        ...(vm.isCashToken ? [unlistedAsset] : []),
        ...favoriteAssets
      ]

      // Always show all tokens
      const finalList = [...baseList, ...sortedOtherAssets, ...(vm.isCashToken ? [] : [unlistedAsset])]

      return finalList
    }
  },
  methods: {
    isFavorite(assetId) {
      return this.favorites.some(item => item.id === assetId && item.favorite === 1)
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
      const isUnlisted = previousAsset.id === 'ct/unlisted' || previousAsset.id === 'sep20/unlisted' || previousAsset.id === 'slp/unlisted'
      const isBch = previousAsset.id === 'bch'
      const wasFavorite = this.isFavorite(previousAsset.id)
      
      return (isBch || isUnlisted || !wasFavorite)
    },
    shouldShowOtherTokensLabel(asset, index) {
      // Show label if:
      // 1. Current asset is NOT a favorite (and not BCH or unlisted CashToken)
      // 2. Previous asset (if exists) was a favorite, BCH, or unlisted CashToken
      const isUnlisted = asset.id === 'ct/unlisted' || asset.id === 'sep20/unlisted' || asset.id === 'slp/unlisted'
      const isBch = asset.id === 'bch'
      if (isBch || isUnlisted || this.isFavorite(asset.id)) return false
      
      if (index === 0) return false // Don't show before first item
      
      const previousAsset = this.assets[index - 1]
      if (!previousAsset) return false
      
      // Show if previous asset was a favorite, BCH, or unlisted CashToken
      const prevIsUnlisted = previousAsset.id === 'ct/unlisted' || previousAsset.id === 'sep20/unlisted' || previousAsset.id === 'slp/unlisted'
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

      const transactionsLength = this.selectedNetwork === 'sBCH'
        ? await this.getSbchTransactions(asset)
        : await this.getBchTransactions(asset)

      if (this.selectedNetwork !== 'sBCH') {
        this.$store.commit('assets/updateAssetTxCount', {
          id: asset?.id,
          txCount: transactionsLength,
        })
      }

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
    },
    async getSbchTransactions (asset) {
      const vm = this
      const address = vm.$store.getters['global/getAddress']('sbch')
      const id = asset.id
      const sep20IdRegexp = /sep20\/(.*)/
      let historyLength = -1

      const filterOpts = { limit: 10, includeTimestamp: true, type: 'incoming' }
      let requestPromise = null

      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          address,
          filterOpts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          address,
          filterOpts
        )
      }

      if (!requestPromise) return
      await requestPromise.then(response => {
        historyLength = response?.transactions.length ?? 0
      })
      return historyLength
    }
  },
  async mounted () {
    const vm = this
    vm.$store.dispatch('market/updateAssetPrices', {})
    const bchAssets = vm.$store.getters['assets/getAssets']
    bchAssets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

    // Fetch custom list and favorites for sorting (do this early so it's available for initial render)
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

    // update balance of assets
    const wallet = await cachedLoadWallet('BCH', vm.$store.getters['global/getWalletIndex'])
    vm.wallet = wallet // Initialize the wallet property
    
    for (var i = 0; i < bchAssets.length; i = i + 3) {
      const balanceUpdatePromises = bchAssets.slice(i, i + 3).map(asset => {
        return updateAssetBalanceOnLoad(asset.id, wallet, vm.$store)
      })
      const assetMetadataUpdatePromises = bchAssets.slice(i, i + 3).map(asset => {
        return vm.$store.dispatch('assets/getAssetMetadata', asset.id)
      })
      await Promise.allSettled([...balanceUpdatePromises, ...assetMetadataUpdatePromises])
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
