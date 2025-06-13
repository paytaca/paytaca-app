<template>
  <div id="app-container" :class="darkmode ? 'dark': 'light'">
    <!-- Gradient Panel -->
    <div id="gradient-panel">
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
          <q-btn icon="notifications" size="sm" padding="sm" outline round class="q-mx-xs" @click="openNotificationsDialog()">
            <!-- <q-icon name="notifications" size=xs></q-icon> -->
          </q-btn>
          <q-btn icon="settings" size="sm" padding="sm" outline round class="q-mx-xs" @click="$router.push('/apps/settings')"/>
        </div>
      </div>  

      <!-- BCH/Stablehedge -->
      <q-tabs
        v-if="enableStablhedge"
        v-model="stablehedgeTab"
        class="text-white title-medium"
        style="margin: 0px 60px 25px;"
        no-caps
      >
        <q-tab name="bch">
          <!-- <q-icon name="img:bch-logo.png" size="25px"/> -->
          <span>BCH</span>
        </q-tab>
        <q-tab name="stablehedge">
          <!-- <q-icon name="img:assets/img/stablehedge/stablehedge-bch.svg" size="25px"/> -->
          <span>Stablehedge</span>
        </q-tab>      
      </q-tabs>

      <!-- Menu -->
        <!-- <div class="row justify-between text-light manage-wallet">
          <div>
            <multi-wallet/>
            <q-icon name="visibility_off" class="q-pr-sm"/>
          </div>
          <div>
            <q-btn flat size="sm" >
              <q-icon name="keyboard_arrow_down" class="q-pr-sm"/>
              <q-icon><img src='ui-revamp/manage-token.svg'/></q-icon>

              <!-- Token Menu --
              <q-menu
                ref="tokenMenu"
                class="token-menu"
                :class="darkmode ? 'text-light' : 'text-dark'"
              >
                <q-list dense class="body-small">
                  <!-- Check for token --
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
        </div> -->

        <!-- Balance -->
        <div class="balance text-light text-center">
          <div class="row justify-center">
            <!-- Price -->
            <q-skeleton type="rect" v-if="!balanceLoaded" style="width: 250px"/>
            <div v-else class="headline-large">{{ bchBalanceText() }} <span class="headline-small">BCH</span></div>
            <!-- Token Icon -->
            <div v-if="balanceLoaded">
              <q-icon id="asset-logo" v-if="stablehedgeView" name="img:assets/img/stablehedge/stablehedge-bch.svg"/>
              <q-icon id="asset-logo" v-else name="img:bch-logo.png"/>
            </div>            
            <!-- <q-img v-if="balanceLoaded" src="bch-logo.png" id="header-logo"/> -->
          </div>
          <!-- Fiat Equivalent -->
          <div class="row justify-center">
            <q-skeleton v-if="!balanceLoaded" type="text" style="width: 50px;"/>
            <div v-else class="body-medium">
              <span class="text-uppercase">{{ selectedMarketCurrency }}</span> &nbsp; {{ equivalentExchangeText }}
            </div>
          </div>        
        </div>
    </div>

    <!-- Asset Buttons -->
    <asset-option 
      :stablehedgeView="stablehedgeView" 
      :loaded="balanceLoaded" 
      :selectedDenomination="selectedDenomination" 
      @cashin="openCashIn()" 
      @price-chart="openPriceChart()"
      @deposit="onStablehedgeTransaction"
      @redeem="onStablehedgeTransaction"
    />
    <div class="text-center assets">
        <!-- <q-icon name="minimize" size="30px"/>      -->
        <asset-cards
                :assets="assets"
                :manage-assets="manageAssets"
                :selected-asset="selectedAsset"
                :balance-loaded="balanceLoaded"
                :network="selectedNetwork"
                :wallet="wallet"
                :isCashToken="isCashToken"
                :currentCountry="currentCountry"
                @select-asset="asset => setSelectedAsset(asset)"
                @show-asset-info="asset => showAssetInfo(asset)"
                @hide-asset-info="hideAssetInfo()"
                @removed-asset="selectBch()"
                @click="() => {txSearchActive = false; txSearchReference = ''}"
              />
      </div>

      <!-- Header Card -->
    <!-- <header-card :balance="bchBalanceText()" :equivalentExchange="getAssetMarketBalance(bchAsset)" :loaded="balanceLoaded" @cashin="openCashIn()"/> -->

      <!-- Ellipses Note: Add Carousel later-->
    <!-- <div class="text-center q-pt-md">
      <q-icon padding="0" name="more_horiz" size="sm" color="black"/>
    </div> -->

      <!-- Tutorial Card -->
    <!-- <tutorial-card/> -->

      <!-- Marketplace -->
    <!-- <home-marketplace/> -->

      <!-- Apps -->
    <!-- <home-apps/> -->

    <!-- Transaction History -->
    <!-- <transaction-list
      :loaded="balanceLoaded"
      :selectedAssetProps="selectedAsset"
      :denominationTabSelected="denominationTabSelected"
      :wallet="wallet"
      :selectedNetworkProps="selectedNetwork"
      /> -->    

    <!-- Footer -->
    <footer-menu ref="footerMenu" />

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />
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
import transactionList from 'src/components/ui-revamp/home/transaction-list.vue';
import assetOption from 'src/components/ui-revamp/home/asset-option.vue'
import multiWallet from 'src/components/ui-revamp/home/multi-wallet.vue'
import packageInfo from '../../../package.json'

// Old
import Watchtower from 'watchtower-cash-js'
import TokenSuggestionsDialog from 'src/components/TokenSuggestionsDialog.vue';
import CashIn from 'src/components/cash-in/CashinIndex.vue'
import AddNewAsset from './dialog/AddNewAsset.vue';
import AssetCards from '../../components/asset-cards'
import PriceChart from './dialog/PriceChart.vue';
import Notifications from 'src/components/notifications/index.vue'
import versionUpdate from './dialog/versionUpdate.vue';
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
// import MultiWallet from 'src/components/multi-wallet/index.vue'
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin'
import { NativeBiometric } from 'capacitor-native-biometric'
import { getDarkModeClass, isNotDefaultTheme, isHongKong } from 'src/utils/theme-darkmode-utils'
import { getMnemonic, Wallet } from 'src/wallet';
import { getWalletByNetwork } from 'src/wallet/chipnet'
import { parseTransactionTransfer } from 'src/wallet/sbch/utils'
import { getAssetDenomination, parseAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { updateAssetBalanceOnLoad } from 'src/utils/asset-utils'
import { getBackendWsUrl, backend } from 'src/exchange/backend'
import { WebSocketManager } from 'src/exchange/websocket/manager'
import { getWalletUnreadNotifs } from 'src/utils/engagementhub-utils/engagementhub-utils'
import { bus } from 'src/wallet/event-bus'
import { markRaw } from '@vue/reactivity'
import { sha256 } from 'js-sha256'

const sep20IdRegexp = /sep20\/(.*)/

export default {
  data () {
    return {
      showTokenSuggestionsDialog: false,
      showWalletMenu: false,

      availableCashinFiat: null,
      hasCashinAlert: false,
      hasCashin: false,
      websocketManager: null,
      stablehedgeView: false,
      balanceLoaded: false,
      securityOptionDialogStatus: 'dismiss',
      pinDialogAction: '',
      walletYield: null,
      denominationTabSelected: 'BCH',
      manageAssets: false,
      transactionsFilter: 'all',

      wallet: null,
      isCashToken: true,
      balanceLoaded: false,
      transactionsLoaded: false,      
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bch-logo.png',
        balance: 0
      },
      notifsCount: 0,
      notifSocket: null,
    }
  },
  components: {
    headerCard,
    tutorialCard,
    homeMarketplace,
    homeApps,
    transactionList,
    multiWallet,
    assetOption,

    TokenSuggestionsDialog,
    securityOptionDialog,
    pinDialog,
    AssetCards
    // MultiWallet
  },
  computed: {
    darkmode () {
      return this.$store.getters['darkmode/getStatus']
    },
    theme () {
      return this.$store.getters['global/theme']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    equivalentExchangeText () {
      return this.getAssetMarketBalance(this.bchAsset).replace(/[^0-9.]/g, '')
    },
    currentWalletHash () {
      return this.$store.getters['global/getWallet']('bch')?.walletHash
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    denomination () {
      return this.$store.getters['global/denomination']
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
    mainchainAssets() {
      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') return item
      })
    },
    smartchainAssets() {
      return this.$store.getters['sep20/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') return item
      })
    },
    bchAsset () {
      if (this.selectedNetwork === 'sBCH') {
        return this.$store.getters['sep20/getAssets'][0]
      }

      const asset = this.$store.getters['assets/getAssets'][0]
      return asset
    },
    assets () {
      const vm = this
      if (vm.selectedNetwork === 'sBCH') return this.smartchainAssets

      if (vm.stablehedgeView) {
        return vm.$store.getters['stablehedge/tokenBalancesAsAssets']
      }

      return vm.mainchainAssets.filter(token => {
        const assetId = token.id?.split?.('/')?.[0]
        return (
          vm.isCashToken && assetId === 'ct' ||
          !vm.isCashToken && assetId === 'slp'
        )
      })
    },
    selectedDenomination() {
      return this.isDenominationTabEnabled
        ? this.denominationTabSelected
        : this.denomination
    },
    isDenominationTabEnabled () {
      return (isNotDefaultTheme(this.theme) &&
        (this.denomination === this.$t('DEEM') || this.denomination === 'BCH') &&
        this.selectedNetwork !== 'sBCH')
    },
    enableStablhedge () {
      return this.$store.getters['global/enableStablhedge']
    },
    enableSmartBCH () {
      return this.$store.getters['global/enableSmartBCH']
    },
    stablehedgeTab: {
      get() {
        return this.stablehedgeView ? 'stablehedge' : 'bch'
      },
      set(value) {
        this.stablehedgeView = value === 'stablehedge'
        // this.$nextTick(() => {
        //   this.$refs['transaction-list-component'].resetValues(null, null, this.selectedAsset)
        //   this.$refs['transaction-list-component'].getTransactions()
        // })
      }
    },
    stablehedgeWalletData() {
      const sats = this.$store.getters['stablehedge/totalTokenBalancesInSats']
      console.log('sats: ', sats)
      const balance = sats / 10 ** 8
      const tokenBalances = this.$store.getters['stablehedge/tokenBalancesWithSats']
      const balancesWithoutSats = tokenBalances.filter(tokenBalance => {
        return !Number.isFinite(tokenBalance?.satoshis)
      }).map(tokenBalance => {
        const token = this.$store.getters['stablehedge/token']?.(tokenBalance?.category)
        const decimals = parseInt(token?.decimals) || 0

        return {
          ...tokenBalance,
          decimals: decimals,
          currency: token?.currency,
          standardizedAmount: tokenBalance?.amount / 10 ** decimals,
        }
      })
      return {
        balance,
        tokenBalances,
        balancesWithoutSats,
      }
    },
  },
  created () {
    bus.on('cashin-alert', (value) => { this.hasCashinAlert = value })
  },
  unmounted () {
    bus.off('handle-push-notification', this.handleOpenedNotification)
    this.closeCashinWebSocket()
    stablehedgePriceTracker.unsubscribe('main-page')
  },
  async mounted () {
    const vm = this
    console.log('darkmode: ', this.darkmode)
    vm.$store.commit('global/updateActiveMenu', 'home')

    await this.checkVersionUpdate()

    try {
      await this.checkCashinAvailable()
      this.setupCashinWebSocket()
      this.resetCashinOrderPagination()
      this.checkCashinAlert()
    } catch(error) {
      console.error(error)
    }

    stablehedgePriceTracker.subscribe('main-page')

    bus.on('handle-push-notification', this.handleOpenedNotification)

    if (this.isMobile) {
      vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
      vm.notifSocket = new WebSocket(
        `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
      )
      vm.addListenersToSocket()
    }
    // if (isNotDefaultTheme(vm.theme) && vm.darkMode) {
    //   vm.settingsButtonIcon = 'img:assets/img/theme/payhero/settings.png'
    //   vm.assetsCloseButtonColor = 'color: #ffbf00;'
    // } else {
    //   vm.settingsButtonIcon = 'settings'
    //   vm.assetsCloseButtonColor = 'color: #3B7BF6;'
    // }

    // Check if preferredSecurity and if it's set as PIN
    console.log('here: ', this.$q.localStorage.getItem('preferredSecurity'))
    const preferredSecurity = this.$q.localStorage.getItem('preferredSecurity')
    let forceRecreate = false
    if (preferredSecurity === null) {
      forceRecreate = true      
    } else if (preferredSecurity === 'pin') {      
      // If using PIN, check if it's 6 digits
      const walletIndex = vm.$store.getters['global/getWalletIndex']
      const mnemonic = await getMnemonic(walletIndex)
      // pin = await SecureStoragePlugin.get({ key: `pin-${sha256(mnemonic)}` })
      try {
        let pin = null
        try {
          pin = await SecureStoragePlugin.get({ key: `pin-${sha256(mnemonic)}` })          
        } catch (error) {
          try {
            // fallback for retrieving pin using unhashed mnemonic
            pin = await SecureStoragePlugin.get({ key: `pin ${mnemonic}` })            
          } catch (error1) {
            // fallback for old process of pin retrieval
            pin = await SecureStoragePlugin.get({ key: 'pin' })            
          }
        }
        if (pin?.value.length < 6) {
          forceRecreate = true
        }
      } catch {
        forceRecreate = true
      }
    }
    if (forceRecreate) {
      this.securityOptionDialogStatus = 'show'
      // await vm.$store.dispatch('global/updateOnboardingStep', 0)
      // vm.$router.push('/accounts?recreate=true')
    }

    window.vm = this
    this.handleOpenedNotification()

    // vm.adjustTransactionsDivHeight({ timeout: 50 })


    if (navigator.onLine) {
      vm.onConnectivityChange(true)
    } else {
      vm.loadWallets()
    }

    // If asset prices array is empty, immediately fetch asset prices
    if (vm.$store.state.market.assetPrices.length === 0) {
      vm.$store.dispatch('market/updateAssetPrices', {})
    }

    const assets = vm.$store.getters['assets/getAssets']
    assets.forEach(a => vm.$store.dispatch('assets/getAssetMetadata', a.id))

    // check if newly-received token is already stored in vuex store,
    // if not, then add it to the very first of the list
    const tokens = vm.selectedNetwork === 'sBCH' ? await vm.getSmartchainTokens() : await vm.getMainchainTokens()
    const walletIndex = vm.$store.getters['global/getWalletIndex']
    const vaultRemovedAssetIds = vm.$store.getters['assets/getRemovedAssetIds'][walletIndex].removedAssetIds ?? []

    if (tokens.length > 0) {
      const assetsId = assets.map(a => a.id)
      const newTokens = tokens.filter(b => !assetsId.includes(b.id) && !vaultRemovedAssetIds.includes(b.id))

      newTokens.forEach(token => {
        vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/addNewAsset`, token)
        vm.$store.commit(`${token.isSep20 ? 'sep20' : 'assets'}/moveAssetToBeginning`)
      })
    }

    // TODO: Replace this with a websocket connection that periodically
    // updates the app about watchtower status
    //
    // // Check for slow internet and/or accessibility of the backend
    // let onlineStatus = true
    // axios.get('https://watchtower.cash/api/status/', { timeout: 1000 * 60 }).then((resp) => {
    //   console.log('ONLINE')
    //   if (resp.status === 200) {
    //     if (resp.data.status !== 'up') {
    //       onlineStatus = false
    //     }
    //   }
    // }).catch((error) => {
    //   console.log('OFFLINE', error)
    //   onlineStatus = false
    // }).finally(() => {
    //   if (!onlineStatus) {
    //     vm.$store.dispatch('global/updateConnectivityStatus', false)
    //     vm.balanceLoaded = true
    //     vm.transactionsLoaded = true
    //   }
    // })

    vm.$store.dispatch('market/updateAssetPrices', {})
    vm.computeWalletYield()

    console.log('bch balance: ', this.balance)
  },
  methods: {
    getDarkModeClass,
    getWalletUnreadNotifs,
    // Methods from old page
    addListenersToSocket () {
      const vm = this

      vm.notifSocket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data)
        vm.notifsCount = data.unread_notifs_count
      })

      vm.notifSocket.addEventListener('open', (event) => {
        console.log('Notification websocket opened.')
      })

      vm.notifSocket.addEventListener('close', (event) => {
        console.log('Notification websocket closed. Reopening websocket...')
        vm.notifSocket = new WebSocket(
          `${process.env.ENGAGEMENT_HUB_WS_URL}notifications/${vm.currentWalletHash}/`
        )
        vm.addListenersToSocket()
      })

      vm.notifSocket.addEventListener('error', (event) => {
        console.log('Notification websocket encountered an error. ', event)
      })
    },
    async openNotificationsDialog () {
      const vm = this

      vm.$emit('hide-multi-wallet-dialog')
      vm.$q.dialog({
        component: Notifications,
        componentProps: { onOpenTransaction: this.findAndOpenTransaction }
      }).onDismiss(async () => {
        if (this.isMobile) {
          vm.notifsCount = await getWalletUnreadNotifs(vm.currentWalletHash)
        }
      })
    },
    // findAndOpenTransaction (data) {
    //   this.$emit('find-and-open-transaction', data)
    // },
    async openCashIn () {
      await this.checkCashinAvailable()
      this.$q.dialog({
        component: CashIn,
        componentProps: {
          fiatCurrencies: this.availableCashinFiat
        }
      })
    },
    openPriceChart () {
       this.$q.dialog({
          component: PriceChart
        })
    },
    bchBalanceText() {
      if (!this.balanceLoaded && this.selectedAsset?.id === this?.bchAsset?.id) return '0'
      const currentDenomination = this.selectedDenomination
      const balance = this.stablehedgeView
        ? this.stablehedgeWalletData.balance
        : this.bchAsset.balance

      if (this.selectedNetwork === 'sBCH') {
        return `${String(balance).substring(0, 10)}`
        // return `${String(balance).substring(0, 10)} ${selectedNetwork}`
      }

      const parsedBCHBalance = getAssetDenomination(currentDenomination, balance).replace(` ${currentDenomination}`, '')

      if (currentDenomination === this.$t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance}` //`${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
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
    computeWalletYield () {
      if (this.bchAsset.yield) {
        const payloadYield = this.bchAsset.yield[this.selectedMarketCurrency]
        if (payloadYield) {
          this.walletYield = Number(payloadYield.toFixed(2)) === 0.00 || Number(payloadYield.toFixed(2)) === 0
            ? Math.abs(payloadYield)
            : payloadYield
          return
        }
      }
      this.walletYield = null
    },
    getAssetMarketBalance (asset) {
      if (!asset?.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      let balance = Number(asset.balance || 0)
      if (asset?.id === 'bch' && this.stablehedgeView) {
        const stablehedgeWalletBalance = this.$store.getters['stablehedge/totalTokenBalancesInSats'] / 10 ** 8
        balance = stablehedgeWalletBalance || 0
      }

      const computedBalance = balance * Number(assetPrice)
      this.computeWalletYield()

      return parseFiatCurrency(computedBalance.toFixed(2), this.selectedMarketCurrency)
    },
    async handleOpenedNotification(openedNotification) {
      if(openedNotification) {
        const notificationTypes = this.$store.getters['notification/types']
        if (openedNotification?.data?.type === notificationTypes.MAIN_TRANSACTION) {
          const txid = openedNotification?.data?.txid
          const tokenId = openedNotification?.data?.token_id
          this.findAndOpenTransaction({txid, tokenId, chain: 'BCH' })
        } else if (openedNotification?.data?.type === notificationTypes.SBCH_TRANSACTION) {
          const txid = openedNotification?.data?.txid
          const tokenId = openedNotification?.data?.token_address
          const logIndex = openedNotification?.data?.log_index
          this.findAndOpenTransaction({ txid, tokenId, logIndex, chain: 'sBCH' })
        } else if (Object.prototype.hasOwnProperty.call(openedNotification?.data, 'order_id')) {
          this.handleRampNotif(openedNotification?.data)
        }
      }
    },
    handleRampNotif (notif) {
      // console.log('Handling Ramp Notification')
      this.$router.push({ name: 'ramp-fiat', query: notif })
    },
    async findAndOpenTransaction(data={txid: '', tokenId: '', logIndex: null, chain: 'BCH' }) {
      if (!data) return
      const { txid, tokenId, logIndex, chain } = data

      let transaction = null
      let assetId = ''
      let asset = null
      if (tokenId.split('/')[0] === 'ct') {
        assetId = tokenId
        asset = this.mainchainAssets.find(asset => asset?.id === assetId)
      } else {
        const isToken = tokenId && String(tokenId) !== 'bch'
        const tokenPrefix = chain === 'sBCH' ? 'sep20' : 'slp'
        assetId = isToken ? `${tokenPrefix}/${tokenId}` : 'bch'
        const assets = chain === 'sBCH' ? this.smartchainAssets : this.mainchainAssets
        asset = isToken ? assets.find(asset => asset?.id === assetId) : this.bchAsset
      }

      transaction = await this.findTransaction({ txid, assetId, logIndex, chain })

      if (!transaction) {
        this.$q.dialog({
          message: 'Transaction not found',
          seamless: true,
          ok: true,
          class: `br-15 pt-card text-bow ${this.getDarkModeClass(this.darkMode)}`
        })
        return
      }
      if (asset?.id) {
        if (this.selectedNetwork != chain) this.changeNetwork(chain, asset)
        const refetchTxList = this.selectedAsset?.id != asset?.id
        this.selectedAsset = asset
        if (refetchTxList) {
          this.transactions = []
          this.transactionsPage = 0
          this.transactionsLoaded = false
          this.$refs['transaction-list-component'].getTransactions()
        }
      } else {
        transaction.asset = {
          id: assetId,
        }
      }
      this.showTransactionDetails(transaction)
    },
    showTransactionDetails (transaction) {
      const vm = this
      vm.hideMultiWalletDialog()
      vm.hideAssetInfo()
      const txCheck = setInterval(function () {
        if (transaction) {
          if (!transaction?.asset) transaction.asset = vm.selectedAsset
          vm.$refs.transaction.show(transaction)
          vm.hideBalances = true
          clearInterval(txCheck)
        }
      }, 100)
    },
    async findTransaction(data = {txid, assetId, logIndex, chain: 'BCH'}) {
      if (!data) return
      const { txid, assetId, chain, logIndex } = data
      const transaction = this.transactions?.find?.(tx => (tx?.txid || tx?.tx_hash) === txid)
      if (transaction) return transaction

      const watchtower = new Watchtower()
      if (chain === 'sBCH') {
        return watchtower.BCH._api(`smartbch/transactions/${txid}/transfers/`)
          .then(response => {
            const txTransfer = response?.data?.find?.(tx => {
              if (typeof logIndex === 'number') return tx?.log_index === logIndex
              return true
            })
            const address = this.$store.getters['global/getAddress']('sbch')
            return parseTransactionTransfer(txTransfer, { address })
          })
          .catch(error => {
            console.error(error)
            return null
          })
      } else {
        let tokenId = ''
        let walletHash = ''
        let apiPath = ''
        if (assetId.split('/')[0] === 'ct') {
          tokenId = assetId.split('/')[1]
          walletHash = this.getWallet('bch')?.walletHash
          apiPath = `history/wallet/${walletHash}/${tokenId}/`
        } else {
          const isToken = assetId !== 'bch'
          tokenId = isToken ? assetId.split('/')[1] : assetId
          walletHash = isToken ? this.getWallet('slp')?.walletHash : this.getWallet('bch')?.walletHash
          apiPath = isToken ? `history/wallet/${walletHash}/${tokenId}/` : `history/wallet/${walletHash}/`
        }

        return watchtower.BCH._api(apiPath, { params: { txids: txid } })
          .then(response => {
            return response?.data?.history?.find?.(tx => tx?.txid === txid)
          })
      }
    },
    changeNetwork (newNetwork = 'BCH', setAsset) {
      const vm = this
      const prevNetwork = vm.selectedNetwork
      vm.selectedNetwork = newNetwork
      if (prevNetwork !== vm.selectedNetwork) {
        vm.selectedAsset = vm.bchAsset
        if (setAsset?.id && vm.assets.find(asset => asset?.id == setAsset?.id)) {
          vm.selectedAsset = setAsset
        }
        // vm.$refs['transaction-list-component'].resetValues(null, newNetwork, setAsset)
        vm.assets.map(function (asset) {
          return vm.getBalance(asset.id)
        })
        // vm.$refs['transaction-list-component'].getTransactions()
      }
    },
    getBalance (id) {
      const vm = this
      vm.balanceLoaded = false
      if (vm.selectedNetwork === 'sBCH') return vm.getSbchBalance(id, vm)
      return vm.getBchBalance(id, vm)
    },
    showTransactionDetails (transaction) {
      const vm = this
      // vm.hideMultiWalletDialog()
      // vm.hideAssetInfo()
      const txCheck = setInterval(function () {
        if (transaction) {
          if (!transaction?.asset) transaction.asset = vm.selectedAsset
          // vm.$refs.transaction.show(transaction)
          // vm.hideBalances = true
          clearInterval(txCheck)
        }
      }, 100)
    },
    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },
    getSbchBalance (id, vm) {
      if (!id) {
        id = vm.selectedAsset.id
      }
      const parsedId = String(id)

      const address = vm.$store.getters['global/getAddress']('sbch')
      if (sep20IdRegexp.test(parsedId)) {
        const contractAddress = parsedId.match(sep20IdRegexp)[1]
        vm.wallet.sBCH.getSep20TokenBalance(contractAddress, address)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      } else {
        vm.wallet.sBCH.getBalance(address)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      }
    },
    async getBchBalance (id, vm) {
      if (!id) {
        id = vm.selectedAsset.id
      }
      // vm.transactionsPageHasNext = false

      //

      await updateAssetBalanceOnLoad(id, vm.wallet, vm.$store)
      vm.balanceLoaded = true
    },

    setPreferredSecurity (auth) {
      this.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
    },
    verifyBiometric () {
      const vm = this
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For easy log in',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          console.log('Successful fingerprint credential')
          setTimeout(() => {
            vm.securityOptionDialogStatus = 'dismiss'
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          console.log('Verification error: ', error)
          // eslint-disable-next-line no-empty
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled')) {
          } else {
            this.verifyBiometric()
          }
        }
        )
    },
    executeActionTaken (action) {
      if (action !== 'cancel') {
        this.pinDialogAction = ''
        this.securityOptionDialogStatus = 'dismiss'
      } else {
        this.pinDialogAction = ''
      }
    },
    async onConnectivityChange (online) {
      const vm = this
      if (online === true) {
        if (!vm.wallet) await vm.loadWallets()

        if (Array.isArray(vm.assets) && vm.assets.length > 0) {
          const selectedAssetExists = vm.assets.find(asset => asset?.id == vm.selectedAsset?.id)
          if (!selectedAssetExists) vm.selectedAsset = vm.bchAsset
        }

        vm.getBalance(vm.selectedAsset.id)
        // vm.$refs['transaction-list-component'].getTransactions()

        vm.$store.dispatch('assets/updateTokenIcons', { all: false })
        if (this.selectedNetwork === 'sBCH') {
          vm.$store.dispatch('sep20/updateTokenIcons', { all: false })
        }
      } else {
        vm.balanceLoaded = true
        vm.transactionsLoaded = true
      }
      // this.adjustTransactionsDivHeight()
    },
    async checkCashinAvailable () {
      this.hasCashin = false
      // check network
      if (this.selectedNetwork === 'BCH') {
        // check availableCashinFiat is empty to avoid duplicate requests
        if (this.availableCashinFiat) {
          this.hasCashin = true
        } else {
          let fetchCurrency = false

          await backend.get('/auth')
            .then(response => {
              const user = response.data

              if (!user?.is_arbiter) {
                fetchCurrency = true
              }
            })
            .catch(error => {
              if (error.response?.status === 404) {
                fetchCurrency = true
              }
            })

          if (fetchCurrency) {
            await backend.get('/ramp-p2p/currency/fiat')
              .then(response => {
                this.availableCashinFiat = response.data
                const selectedFiat = this.$store.getters['market/selectedCurrency']
                const fiatSymbol = this.availableCashinFiat.map(item => item.symbol)

                this.hasCashin = fiatSymbol.includes(selectedFiat.symbol)
                console.log('hasCashin: ', this.hasCashin)
              })
              .catch(error => {
                console.error(error)
              })
          }
        }
      } else {
        this.hasCashin = false
      }
    },
    setupCashinWebSocket () {
      this.closeCashinWebSocket()
      const walletHash = this.$store.getters['global/getWallet']('bch').walletHash
      const url = `${getBackendWsUrl()}${walletHash}/cash-in/`
      this.websocketManager = new WebSocketManager()
      this.websocketManager.setWebSocketUrl(url)
      this.websocketManager.subscribeToMessages((message) => {
        if (message?.type === 'ConnectionMessage') return
        bus.emit('cashin-alert', true)
      })
    },
    closeCashinWebSocket () {
      this.websocketManager?.closeConnection()
    },
    resetCashinOrderPagination () {
      this.$store.commit('ramp/resetCashinOrderList')
      this.$store.commit('ramp/resetCashinOrderListPage')
      this.$store.commit('ramp/resetCashinOrderListTotalPage')
    },
    async checkCashinAlert () {
      console.log('Here: ', this.hasCashin)
      if (this.hasCashin) {
        const walletHash = this.$store.getters['global/getWallet']('bch').walletHash
        await backend.get('/ramp-p2p/order/cash-in/alerts/', { params: { wallet_hash: walletHash } })
          .then(response => {
            this.hasCashinAlert = response.data.has_cashin_alerts
          })
          .catch(error => {
            console.log(error.response || error)
          })
      }
    },

    async checkVersionUpdate () {
      const vm = this
      const appVer = packageInfo.version

      /// get platform
      let platform = null

      if (vm.$q.platform.is.mobile) {
        platform = 'android'
      }
      if (vm.$q.platform.is.ios) {
        platform = 'ios'
      }
      if (vm.$q.platform.is.bex) {
        platform = 'web'
      }

      if (platform) {
        // fetching version check
        await backend.get(`version/check/${platform}/`)
          .then(response => {
            if (!('error' in response.data)) {
              const latestVer = response.data?.latest_version
              const minReqVer = response.data?.min_required_version

              if (appVer !== latestVer) {
                const openVersionUpdate = this.checkOutdatedVersion(appVer, minReqVer)

                // open version update dialog
                if (openVersionUpdate) {
                  this.$q.dialog({
                    component: versionUpdate,
                    componentProps: {
                      data: response.data
                    }
                  })
                }
              }
            }
          })
      }
    },
    checkOutdatedVersion (appVer, minReqVer) {
      let isOutdated = false
      const appV = appVer.split('.').map(Number)
      const minV = minReqVer.split('.').map(Number)

      for (let i = 0; i < Math.max(appV.length, minV.length); i++) {
        const v1 = appV[i] || 0
        const v2 = minV[i] || 0

        if (v1 < v2) {
          isOutdated = true
          break
        } else if (v1 > v2) {
          isOutdated = false
          break
        } else {
          isOutdated = false
        }
      }
      return isOutdated
    },

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
    onStablehedgeTransaction(data) {
      this.setTransactionsFilter(this.transactionsFilter)
      this.$store.dispatch('stablehedge/updateTokenBalances')

      data.map(txData => txData?.category)
        .map(category => {
          return this.assets.find(asset => asset?.id?.includes(category))?.id
        })
        .filter(Boolean)
        .map(assetId => updateAssetBalanceOnLoad(assetId, this.wallet, this.$store))
    },
    setTransactionsFilter(value) {
      // const transactionsFilters = this.transactionsFilterOpts.map(opt => opt?.value)
      // if (transactionsFilters.indexOf(value) >= 0) this.transactionsFilter = value
      // else this.transactionsFilter = 'all'

      // this.$nextTick(() => {
      //   this.$refs['transaction-list-component'].resetValues(value)
      //   this.$refs['transaction-list-component'].getTransactions()
      // })
    },
  }
}
</script>
<style lang="scss" scoped>
.header {
  padding: 25px 16px 25px;
  z-index: 1;
}
#header-logo {
  margin: 5px 5px 0px;
  height: 28px;
  width: 28px;
}
#asset-logo {
  margin: 5px 5px 0px;
  height: 40px;
  width: 40px;
}
.manage-wallet {
  z-index: 1;
  margin: 24px 16px 0px;
}
.token-menu {
  border-radius: 50%;
  padding: 5px 5px 5px;
}
.balance {
  margin-bottom: 25px;  
  padding: 10px 16px 0;
}
</style>
