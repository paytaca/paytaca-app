<template>
  <div id="app-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Receive')" backnavpath="/"></header-nav>
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
      <div class="row flex-center" v-if="isRetrieving">
        <ProgressLoader :color="isDefaultTheme(theme) ? theme : 'pink'"/>
      </div>
      <div style="overflow-y: scroll;" v-else>
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
                  :src="denomination === $t('DEEM') && asset.symbol === 'BCH'
                    ? 'assets/img/theme/payhero/deem-logo.png'
                    : asset.logo || getFallbackAssetLogo(asset)
                  "
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
                  <span v-if="!asset.name.includes('New')">{{ parseAssetDenomination(denomination, asset, false, 16) }}</span>
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
import { markRaw } from '@vue/reactivity'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import AssetFilter from '../../components/AssetFilter'
import { getMnemonic, Wallet } from 'src/wallet'
import { getDarkModeClass, isNotDefaultTheme, isDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import ProgressLoader from 'src/components/ProgressLoader'
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
    ProgressLoader,
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
      isRetrieving: false
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
    async getMainchainTokens () {
      const tokenWalletHashes = [this.getWallet('bch').walletHash, this.getWallet('slp').walletHash]
      const mainchainTokens = []

      for (const tokenWalletHash of tokenWalletHashes) {
        const isCashToken = tokenWalletHashes.indexOf(tokenWalletHash) === 0

        const tokens = await this.$store.dispatch(
          'assets/getMissingAssets',
          {
            isCashToken,
            walletHash: tokenWalletHash,
            includeIgnoredTokens: false
          }
        )

        mainchainTokens.push(...tokens)
      }

      return mainchainTokens
    },
    async getSmartchainTokens () {
      const tokens = await this.$store.dispatch(
        'sep20/getMissingAssets',
        {
          address: this.getWallet('sbch').lastAddress,
          icludeIgnoredTokens: false
        }
      )
      return tokens
    },
    async checkIfFirstTimeReceiver (asset) {
      // check wallet/assets if balance is zero and no transactions were made
      this.isRetrieving = true
      const assetBalance = asset.balance ?? 0
      const transactionsLength = this.selectedNetwork === 'sBCH'
        ? await this.getSbchTransactions(asset)
        : await this.getBchTransactions(asset)
      this.isRetrieving = false

      if (assetBalance === 0 && transactionsLength === 0 && asset.id.split('/')[1] !== 'unlisted') {
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

    // update balance of assets
    await getMnemonic(vm.$store.getters['global/getWalletIndex']).then(function (mnemonic) {
      let wallet = new Wallet(mnemonic, vm.network)
      wallet = markRaw(wallet)
      if (vm.selectedNetwork === 'sBCH') wallet.sBCH.getOrInitWallet()

      bchAssets.forEach(async (asset) => {
        await updateAssetBalanceOnLoad(asset.id, wallet, vm.$store)
      })
    })

    // check for newly-received token(s) then add it to asset list
    const previousRoute = vm.$router.options.history.state.back
    const isSBCH = vm.selectedNetwork === 'sBCH'
    // only run condition if user went back to receive page from receive unlisted token page
    if (previousRoute.includes('receive') && previousRoute.includes('unlisted')) {
      const ignoredAssets = vm.$store.getters[`${isSBCH ? 'sep20' : 'assets'}/ignoredAssets`]
      const missingAssets = isSBCH ? await vm.getSmartchainTokens() : await vm.getMainchainTokens()
      const removedAssets = vm.$store.getters[`${isSBCH ? 'sep20' : 'assets'}/getRemovedAssetIds`]
      const combinedAssets = [...vm.assets.map(a => a.id), ...ignoredAssets.map(a => a.id)]

      missingAssets.forEach(asset => {
        // do not re-add removed assets
        if (combinedAssets.indexOf(asset.id) === -1 && removedAssets.indexOf(asset.id) === -1) {
          vm.$store.commit(`${asset.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, asset)
          vm.$store.commit(`${asset.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
        }
      })
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
