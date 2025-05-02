<template>
  <div id="app-container" class="light">
    <!-- Gradient Panel -->
    <div id="gradient-panel"></div>

    <!-- Header -->
    <div class="row justify-between text-light header">
      <div class="col-7 row">
        <img src='../../assets/paytaca_logo.png' id="header-logo"/>
        <div class="q-pl-sm" style="line-height: 0px;">
          <span class="label-medium">Welcome to</span><br>
          <span class="title-small">Paytaca BCH Wallet</span>
        </div>
      </div>
      <div class="col row justify-end q-pt-sm" style="right: 0px">
        <q-btn no-caps outline rounded padding="xs" size="sm" class="q-mx-xs">
          <span class="body-small q-px-xs">Help?</span>
        </q-btn>
        <q-btn icon="notifications" size="sm" padding="sm" outline round class="q-mx-xs ">
          <!-- <q-icon name="notifications" size=xs></q-icon> -->
        </q-btn>
        <q-btn icon="settings" size="sm" padding="sm" outline round class="q-mx-xs" @click="$router.push('/apps/settings')"/>
      </div>
    </div>

    <!-- Body -->
    <div class="row justify-between text-light manage-wallet">
      <div>
        <multi-wallet/>
        <q-icon name="visibility_off" class="q-pr-sm"/>
      </div>
      <div>
        <q-btn flat size="sm" >
          <q-icon name="keyboard_arrow_down" class="q-pr-sm"/>
          <q-icon><img src='ui-revamp/manage-token.svg'/></q-icon>

          <!-- Token Menu -->
          <q-menu
            ref="tokenMenu"
            class="token-menu"
          >
            <q-list dense class="body-small">
              <!-- Check for token -->
              <q-item class="q-mt-sm" clickable v-close-popup v-ripple>
                Manage Token
              </q-item>
              <q-separator />
              <q-item class="q-mt-sm" clickable v-close-popup v-ripple @click="addNewAsset">
                Add Token
              </q-item>
              <q-separator />
              <q-item class="q-mt-sm" clickable v-close-popup v-ripple @click="checkMissingAssets({autoOpen: true})">
                Scan Token
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>

      <!-- Header Card -->
    <header-card/>

      <!-- Ellipses Note: Add Carousel later-->
    <div class="text-center q-pt-md">
      <q-icon padding="0" name="more_horiz" size="sm" color="black"/>
    </div>

      <!-- Tutorial Card -->
    <tutorial-card/>

      <!-- Marketplace -->
    <home-marketplace/>

      <!-- Apps -->
    <home-apps/>

    <!-- Transaction History -->
    <transaction-history/>

    <div></div>

    <!-- Footer -->
    <footer-menu ref="footerMenu" />


    <TokenSuggestionsDialog
      ref="tokenSuggestionsDialog"
      v-model="showTokenSuggestionsDialog"
      :bch-wallet-hash="getWallet('bch').walletHash"
      :slp-wallet-hash="getWallet('slp').walletHash"
      :sbch-address="getWallet('sbch').lastAddress"
    />
  </div>
</template>
<script>
// New
import headerCard from 'src/components/ui-revamp/home/header-card.vue';
import tutorialCard from 'src/components/ui-revamp/home/tutorial-card.vue'
import homeMarketplace from 'src/components/ui-revamp/home/marketplace.vue';
import homeApps from 'src/components/ui-revamp/home/apps.vue'
import transactionHistory from 'src/components/ui-revamp/home/transaction-history.vue';
import multiWallet from 'src/components/ui-revamp/home/multi-wallet.vue'

// Old
import TokenSuggestionsDialog from 'src/components/TokenSuggestionsDialog.vue';
import AddNewAsset from './dialog/AddNewAsset.vue';
import PriceChart from './dialog/PriceChart.vue';
// import MultiWallet from 'src/components/multi-wallet/index.vue'
import { getMnemonic, Wallet } from 'src/wallet';
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { markRaw } from '@vue/reactivity'

export default {
  data () {
    return {
      showTokenSuggestionsDialog: false,
      showWalletMenu: false,

      wallet: null,
      isCashToken: true,
      balanceLoaded: false,
      transactionsLoaded: false,
      stablehedgeView: false,
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      },
    }
  },
  components: {
    headerCard,
    tutorialCard,
    homeMarketplace,
    homeApps,
    transactionHistory,
    multiWallet,

    TokenSuggestionsDialog,
    // MultiWallet
  },
  computed: {
    darkmode () {
      return this.$store.getters['darkmode/getStatus']
    },
    selectedNetwork: {
      get () {
        return this.$store.getters['global/network']
      },
      set (value) {
        return this.$store.commit('global/setNetwork', value)
      },
    },
    currentCountry () {
      return this.$store.getters['global/country'].code
    },
    balance () {
      return this.$store.getters['assets/getAssets'][0].balance
    },
    // bchAsset () {
    //   if (this.selectedNetwork === 'sBCH') {
    //     return this.$store.getters['sep20/getAssets'][0]
    //   }

    //   const asset = this.$store.getters['assets/getAssets'][0]
    //   return asset
    // },
    // smartchainAssets() {
    //   return this.$store.getters['sep20/getAssets'].filter(function (item) {
    //     if (item && item.id !== 'bch') return item
    //   })
    // },
    // assets () {
    //   const vm = this
    //   if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets

    //   if (vm.stablehedgeView) {
    //     return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
    //   }

    //   return vm.mainchainAssets.filter(token => {
    //     const assetId = token.id?.split?.('/')?.[0]
    //     return (
    //       vm.isCashToken && assetId === 'ct' ||
    //       !vm.isCashToken && assetId === 'slp'
    //     )
    //   })
    // },
    // mainchainAssets() {
    //   return this.$store.getters['assets/getAssets'].filter(function (item) {
    //     if (item && item.id !== 'bch') return item
    //   })
    // },
  },
  async mounted () {
    const vm = this

    vm.loadWallets()
    // if (navigator.onLine) {
    //   vm.onConnectivityChange(true)
    // } else {
    //   vm.loadWallets()
    // }
    console.log('bch balance: ', this.balance)
  },
  methods: {

    // Methods from old page
    async checkMissingAssets (opts = { autoOpen: false }) {
      if (!this.$refs.tokenSuggestionsDialog) return Promise.reject()
      this.showTokenSuggestionsDialog = Boolean(opts && opts.autoOpen)
      return this.$refs.tokenSuggestionsDialog.updateList(opts)
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    async loadWallets () {
      const vm = this
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)

      const wallet = new Wallet(mnemonic, vm.selectedNetwork)
      vm.wallet = markRaw(wallet)

      const storedWalletHash = vm.$store.getters['global/getWallet']('bch').walletHash
      const derivedWalletHash = getWalletByNetwork(vm.wallet, 'bch').walletHash

      if (storedWalletHash !== derivedWalletHash) {
        console.log('INCONSISTENCY DETECTED!')
        console.log('Wallet index:', walletIndex)
        this.$store.commit('global/updateCurrentWallet', walletIndex)
        // location.reload()
      }

      // COMMENTED OUT SINCE V1 WALLETS ARE ALREADY NOT IN USE
      //
      // if (vm.selectedNetwork === 'BCH') {
      //   // Create change addresses if nothing is set yet
      //   // This is to make sure that v1 wallets auto-upgrades to v2 wallets
      //   const bchChangeAddress = vm.getChangeAddress('bch')
      //   getWalletByNetwork(vm.wallet, 'bch').getNewAddressSet(0).then(function ({ addresses }) {
      //     if (bchChangeAddress.length === 0) {
      //       vm.$store.commit('global/updateWallet', {
      //         type: 'bch',
      //         walletHash: getWalletByNetwork(vm.wallet, 'bch').walletHash,
      //         derivationPath: getWalletByNetwork(vm.wallet, 'bch').derivationPath,
      //         lastAddress: addresses.receiving,
      //         lastChangeAddress: addresses.change,
      //         lastAddressIndex: 0,
      //       })
      //     }
      //   })
      //   const slpChangeAddress = vm.getChangeAddress('slp')
      //   if (slpChangeAddress.length === 0) {
      //     getWalletByNetwork(vm.wallet, 'slp').getNewAddressSet(0).then(function (addresses) {
      //       vm.$store.commit('global/updateWallet', {
      //         type: 'slp',
      //         walletHash: getWalletByNetwork(vm.wallet, 'slp').walletHash,
      //         derivationPath: getWalletByNetwork(vm.wallet, 'slp').derivationPath,
      //         lastAddress: addresses.receiving,
      //         lastChangeAddress: addresses.change,
      //         lastAddressIndex: 0
      //       })
      //     })
      //   }
      // } else if (vm.selectedNetwork === 'sBCH') {
      //   const lastAddress = vm.getWallet('sbch').lastAddress
      //   let subscribeSbchAddress = !vm.getWallet('sbch').subscribed
      //   if (lastAddress.length === 0) {
      //     await vm.wallet.sBCH.getOrInitWallet()
      //     subscribeSbchAddress = true
      //     vm.$store.commit('global/updateWallet', {
      //       type: 'sbch',
      //       derivationPath: vm.wallet.sBCH.derivationPath,
      //       walletHash: vm.wallet.sBCH.walletHash,
      //       lastAddress: vm.wallet.sBCH._wallet ? vm.wallet.sBCH._wallet.address : ''
      //     })

      //     if (subscribeSbchAddress) {
      //       wallet.sBCH.subscribeWallet()
      //         .then(response => {
      //           if (response && response.success) {
      //             vm.$store.commit('global/setWalletSubscribed', {
      //               type: 'sbch',
      //               subscribed: true
      //             })
      //           }
      //         })
      //     }
      //   }
      // }
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        // need both in passing props for now for backwards compatibility
        componentProps: {
          network: vm.selectedNetwork,
          darkMode: vm.darkmode,
          isCashToken: vm.isCashToken,
          wallet: vm.wallet,
          currentCountry: vm.currentCountry
        },
        component: AddNewAsset
      }).onOk((asset) => {
        if (asset.data?.id) vm.selectAsset(null, asset.data)
      })
    },
    // bchBalanceText() {
    //   if (!this.balanceLoaded && this.selectedAsset?.id === this?.bchAsset?.id) return '0'
    //   console.log('continue')
    //   const currentDenomination = this.selectedDenomination
    //   const balance = this.stablehedgeView
    //     ? this.stablehedgeWalletData.balance
    //     : this.bchAsset.balance

    //   if (this.selectedNetwork === 'sBCH') {
    //     return `${String(balance).substring(0, 10)} ${selectedNetwork}`
    //   }

    //   const parsedBCHBalance = getAssetDenomination(currentDenomination, balance)

    //   if (currentDenomination === this.$t('DEEM')) {
    //     const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
    //       minimumFractionDigits: 0,
    //       maximumFractionDigits: 0
    //     })
    //     return `${commaBalance} ${currentDenomination}`
    //   }

    //   return parsedBCHBalance
    // },
    // async onConnectivityChange (online) {
    //   const vm = this
    //   if (online === true) {
    //     if (!vm.wallet) await vm.loadWallets()

    //     // if (Array.isArray(vm.assets) && vm.assets.length > 0) {
    //     //   const selectedAssetExists = vm.assets.find(asset => asset?.id == vm.selectedAsset?.id)
    //     //   if (!selectedAssetExists) vm.selectedAsset = vm.bchAsset
    //     // }

    //     vm.getBalance(vm.selectedAsset.id)
    //    // vm.$refs['transaction-list-component'].getTransactions()

    //     vm.$store.dispatch('assets/updateTokenIcons', { all: false })
    //     if (this.selectedNetwork === 'sBCH') {
    //       vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
    //     }
    //   } else {
    //     vm.balanceLoaded = true
    //     vm.transactionsLoaded = true
    //   }
    //   // this.adjustTransactionsDivHeight()
    // },
    // getBalance (id) {
    //   const vm = this
    //   vm.balanceLoaded = false
    //   if (vm.selectedNetwork === 'sBCH') return 0 // vm.getSbchBalance(id, vm)
    //   return vm.getBchBalance(id, vm)
    // },
    // async getBchBalance (id, vm) {
    //   if (!id) {
    //     id = vm.selectedAsset.id
    //   }
    //   vm.transactionsPageHasNext = false
    //   await updateAssetBalanceOnLoad(id, vm.wallet, vm.$store)
    //   vm.balanceLoaded = true
    // },
  },
  openPriceChart () {
       this.$q.dialog({
          component: PriceChart
        })

      // if (!this.isPriceChartDialogShown) {
      //   this.isPriceChartDialogShown = true
      //   this.$q.dialog({
      //     component: PriceChart
      //   })
      //     .onDismiss(() => {
      //       this.isPriceChartDialogShown = false
      //     })
      // }
    },
}
</script>
<style lang="scss" scoped>
.header {
  padding: 24px 16px 0;
  z-index: 1;
  #header-logo {
    height: 34px;
    width: 36px;
  }
}
.manage-wallet {
  z-index: 1;
  margin: 24px 16px 0px;
}
.token-menu {
  border-radius: 50%;
  padding: 5px 5px 5px;
}
</style>
