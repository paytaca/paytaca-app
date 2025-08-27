<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav id="RECEIVE" 
      :title="$t('Receive')" backnavpath="/"></header-nav>
    <q-tabs
      dense
      v-if="enableSmartBCH"
      active-color="brandblue"
      :indicator-color="isNotDefaultTheme(theme) && 'transparent'"
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
          <AssetFilter @filterTokens="isCT => isCashToken = isCT" />
        </div>
      </div>
      <div style="overflow-y: scroll;">
        <div
          v-for="(asset, index) in assets"
          :key="index"
          @click="checkIfFirstTimeReceiver(asset)"
          role="button"
          class="row q-pl-lg q-pr-lg"
        >
          <div class="col row group-currency q-mb-sm" :class="getDarkModeClass(darkMode)" v-if="isCashToken">
            <div class="row q-pt-sm q-pb-xs q-pl-md">
              <div>
                <img
                  :src="getImageUrl(asset)"
                  width="50"
                  alt=""
                >
              </div>
              <div class="col q-pl-sm q-pr-sm">
                <p
                  class="q-ma-none text-token text-weight-regular"
                  :class="darkMode ? isNotDefaultTheme(theme) ? 'text-grad' : 'dark' : 'light'"
                >
                  {{ asset.name }}
                </p>
                <p class="q-ma-none amount-text" :class="getDarkModeClass(darkMode, '', 'text-grad')">
                  <template v-if="!asset.name.includes('New')">
                    <span>
                      {{ parseAssetDenomination(denomination, asset, false, 16) }}
                    </span>
                  </template>
                  {{ asset.name.includes('New') ? asset.symbol : '' }}
                </p>
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
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import FirstTimeReceiverWarning from 'src/pages/transaction/dialog/FirstTimeReceiverWarning'
import { parseAssetDenomination } from 'src/utils/denomination-utils'
import { convertTokenAmount, getWalletByNetwork } from 'src/wallet/chipnet'

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
      wallet: null
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
      let _assets
      const themedIconPath = isNotDefaultTheme(this.theme) ? `assets/img/theme/${this.$store.getters['global/theme']}/` : ''
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
          symbol: 'SEP20 token',
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
    }
  },
  methods: {
    convertTokenAmount,
    parseAssetDenomination,
    getDarkModeClass,
    isNotDefaultTheme,
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
