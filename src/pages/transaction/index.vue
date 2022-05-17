<template>
  <div style="background-color: #ECF3F3;" :class="{'pt-dark': darkMode}">

    <startPage v-if="startPageStatus" v-on:logIn="logIn" />

    <div v-else>

      <div class="fixed-container" :class="{'pt-dark': darkMode}" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
        <div class="row q-pt-lg q-pb-xs">

          <!-- <p class="col-12 q-px-lg q-ma-none text-subtitle1" role="button" @click="promptChangeNetwork()">
            <span
              class="text-brandblue"
              style="text-decoration:underline;"
            >
              {{ networks[selectedNetwork] && networks[selectedNetwork].name }}
            </span>
          </p> -->
          <q-tabs
            active-color="brandblue"
            class="col-12 q-px-sm q-pb-md pp-fcolor"
            :value="selectedNetwork"
            @input="changeNetwork"
            style="margin-top: -20px; padding-bottom: 16px;"
          >
            <q-tab name="BCH" :class="{'pt-dark-label': darkMode}" :label="networks.BCH.name"/>
            <q-tab name="sBCH" :class="{'pt-dark-label': darkMode}" :label="networks.sBCH.name"/>
          </q-tabs>
          <div class="col q-pl-lg">
            <p class="text-light p-label" style="color: #ABA9BB;">
              Your {{ selectedAsset.symbol }} balance
            </p>
            <p class="text-number-balance default-text-color">
              <span v-if="hideBalances" style="color: transparent;">
                {{ String(selectedAsset.balance).substring(0, 10) }}
              </span>
              <span v-else>{{ String(selectedAsset.balance).substring(0, 10) }}</span>
            </p>
            <div class="text-caption pp-text" style="margin-top:-30px;">
              <template v-if="selectedAssetMarketBalance">
                <span :class="{'pt-dark-label': darkMode}">
                  {{ selectedAssetMarketBalance }} {{ String(selectedMarketCurrency).toUpperCase() }}
                </span>
              </template>
              <template v-else>
                <span style="color: transparent;">NA</span>
              </template>
            </div>
          </div>
          <div class="q-space q-pr-lg">
            <p class="text-right text-light p-label" style="color: #ABA9BB;">{{ today }}</p>
            <img class="float-right q-mt-sm" :src="selectedAsset.logo || getFallbackAssetLogo(selectedAsset)" height="50">
          </div>
        </div>
        <div class="row q-mt-sm">
          <div class="col">
            <p class="q-ml-lg q-mb-sm payment-methods q-gutter-x-sm" :class="{'pt-dark-label': darkMode}">
              Assets
              <q-btn
                flat
                padding="none"
                size="sm"
                icon="app_registration"
                style="color: #3B7BF6;"
                :class="{'pt-dark-label': darkMode}"
                @click="toggleManageAssets"
              />
              <q-btn
                v-if="manageAssets"
                flat
                padding="none"
                size="sm"
                icon="search"
                style="color: #3B7BF6;"
                :class="{'pt-dark-label': darkMode}"
                @click="checkMissingAssets({autoOpen: true})"
              />
            </p>
          </div>
        </div>
        <asset-info ref="asset-info" :network="selectedNetwork"></asset-info>
        <!-- Cards without drag scroll on mobile -->
        <template v-if="$q.platform.is.mobile">
          <asset-cards
            :assets="assets"
            :network="selectedNetwork"
          >
          </asset-cards>
        </template>
        <!-- Cards with drag scroll on other platforms -->
        <template v-else>
          <asset-cards
            :assets="assets"
            v-dragscroll.x="true"
            :network="selectedNetwork"
          >
          </asset-cards>
        </template>
      </div>
      <div class="row transaction-row">
        <transaction ref="transaction"></transaction>
        <div class="col transaction-container" :class="{'pt-dark-card-2': darkMode}">
            <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': darkMode}">Transactions</p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-mb-sm q-pa-none q-pl-none text-center btn-transaction" :class="{'pt-dark-card': darkMode}">
              <button class="btn-custom q-mt-none active-transaction-btn btn-all" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-all')" id="btn-all"><b>All</b></button>
              <button class="btn-custom q-mt-none btn-sent" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-sent')" id="btn-sent"><b>Sent</b></button>
              <button class="btn-custom q-mt-none btn-received" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-received')" id="btn-received"><b>Received</b></button>
            </div>
            <div class="transaction-list">
              <template v-if="balanceLoaded && transactionsLoaded">
                <div class="row" v-for="(transaction, index) in transactions" :key="'tx-' + index">
                    <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                      <div class="row" @click="showTransactionDetails(transaction)">
                        <!-- <div class="q-mr-sm">
                          <img :src="selectedAsset.logo" width="40">
                        </div> -->
                        <div class="col col-transaction">
                          <div>
                            <p :class="{'pt-dark-label': darkMode}" class="q-mb-none transactions-wallet ib-text" style="font-size: 15px;"><b>{{ recordTypeMap[transaction.record_type] }}</b></p>
                            <p :class="{'pt-dark-label': darkMode}" class="q-mb-none transactions-wallet float-right ib-text q-mt-sm"><b>{{ +(transaction.amount) }} {{ selectedAsset.symbol }}</b></p>
                          </div>
                          <div class="col">
                              <span class="float-left subtext" :class="{'pt-dark-label': darkMode}" style="font-size: 12px;"><b>{{ transaction.date_created | formatDate }}</b></span>
                              <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                <div v-if="transactionsLoaded && transactionsPageHasNext" :class="{'pt-dark-label': darkMode}" style="margin-top: 20px; width: 100%; text-align: center; color: #3b7bf6;">
                  <p @click="() => { transactionsPage += 1; getTransactions() }">Show More</p>
                </div>
              </template>
              <div style="text-align: center;" v-else>
                <ProgressLoader :hideCallback="toggleHideBalances"></ProgressLoader>
              </div>
            </div>
        </div>
      </div>
      <footer-menu />
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

    <TokenSuggestionsDialog
      ref="tokenSuggestionsDialog"
      v-model="showTokenSuggestionsDialog"
      :slp-wallet-hash="getWallet('slp').walletHash"
      :sbch-address="wallet && wallet.sBCH && wallet.sBCH._wallet && wallet.sBCH._wallet.address"
    />
  </div>
</template>

<script>
import { getMnemonic, Wallet } from '../../wallet'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import TokenSuggestionsDialog from '../../components/TokenSuggestionsDialog'
import ProgressLoader from '../../components/ProgressLoader'
import Transaction from '../../components/transaction'
import AssetCards from '../../components/asset-cards'
import AssetInfo from '../../pages/transaction/dialog/AssetInfo.vue'
import startPage from '../../pages/transaction/dialog/StartPage.vue'
import securityOptionDialog from '../../components/authOption'
import pinDialog from '../../components/pin'
import { dragscroll } from 'vue-dragscroll'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const ago = require('s-ago')

const sep20IdRegexp = /sep20\/(.*)/

export default {
  name: 'Transaction-page',
  components: { TokenSuggestionsDialog, ProgressLoader, Transaction, AssetInfo, AssetCards, pinDialog, securityOptionDialog, startPage },
  directives: {
    dragscroll
  },
  mixins: [
    walletAssetsMixin
  ],
  data () {
    return {
      today: new Date().toDateString(),
      hideBalances: false,
      networks: {
        BCH: { name: 'BCH' },
        sBCH: { name: 'SmartBCH' }
      },
      selectedAsset: {
        id: 'bch',
        symbol: 'BCH',
        name: 'Bitcoin Cash',
        logo: 'bitcoin-cash-bch-logo.png',
        balance: 0
      },
      recordTypeMap: {
        incoming: 'RECEIVED',
        outgoing: 'SENT'
      },
      transactionsFilter: 'all',
      activeBtn: 'btn-all',
      transactions: [],
      transactionsPage: 1,
      transactionsPageHasNext: false,
      transactionsLoaded: false,
      balanceLoaded: false,
      wallet: null,
      paymentMethods: null,
      manageAssets: false,
      assetInfoShown: false,
      pinDialogAction: '',
      securityOptionDialogStatus: 'dismiss',
      startPageStatus: true,
      prevPath: null,
      showTokenSuggestionsDialog: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },

  computed: {
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
        return this.$store.getters['sep20/getAssets'].filter(Boolean)
      }

      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          return item
        }
      })
    },
    selectedAssetMarketPrice () {
      if (!this.selectedAsset || !this.selectedAsset.id) return
      if (!this.selectedMarketCurrency) return
      return this.$store.getters['market/getAssetPrice'](this.selectedAsset.id, this.selectedMarketCurrency)
    },
    selectedMarketCurrency () {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    selectedAssetMarketBalance () {
      if (!this.selectedAsset) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(this.selectedAsset.balance || 0) * Number(this.selectedAssetMarketPrice)

      return computedBalance.toFixed(2)
    },
    earliestBlock () {
      if (!Array.isArray(this.transactions) || !this.transactions.length) return 0
      return Math.min(
        ...this.transactions
          .map(tx => tx && tx.block)
          .filter(Boolean)
          .filter(Number.isSafeInteger)
      )
    }
  },

  filters: {
    titleCase (str) {
      return str.toLowerCase().replace(/\b(\w)/g, s => s.toUpperCase())
    },
    truncateTxid (str) {
      return str.substring(0, 30)
    },
    formatDate (date) {
      return ago(new Date(date))
    }
  },

  methods: {
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    promptChangeNetwork () {
      this.$q.dialog({
        title: 'Select network',
        message: 'Select network',
        options: {
          type: 'radio',
          model: this.selectedNetwork,
          items: [
            { value: 'BCH', label: this.networks.BCH.name },
            { value: 'sBCH', label: this.networks.sBCH.name }
          ]
        },
        cancel: true,
        persistent: true,
        class: 'pp-text'
      }).onOk(data => {
        this.changeNetwork(data)
      })
    },
    changeNetwork (newNetwork = 'BCH') {
      const prevNetwork = this.selectedNetwork
      this.selectedNetwork = newNetwork
      if (prevNetwork !== this.selectedNetwork) {
        this.selectedAsset = this.assets[0]
        this.transactions = []
        this.transactionsPage = 1
        this.transactionsLoaded = false
        this.getTransactions()
        if (this.selectedAsset) this.getBalance(this.selectedAsset.id)
      }
    },
    toggleManageAssets () {
      this.manageAssets = !this.manageAssets
    },
    showAssetInfo (asset) {
      const vm = this
      vm.assetInfoShown = true
      const assetCheck = setInterval(function () {
        if (asset) {
          vm.$refs['asset-info'].show(asset)
          clearInterval(assetCheck)
        }
      }, 100)
    },
    hideAssetInfo () {
      this.$refs['asset-info'].hide()
      this.assetInfoShown = false
    },
    toggleHideBalances () {
      this.hideBalances = !this.hideBalances
    },
    showTransactionDetails (transaction) {
      const vm = this
      vm.hideAssetInfo()
      const txCheck = setInterval(function () {
        if (transaction) {
          transaction.asset = vm.selectedAsset
          vm.$refs.transaction.show(transaction, vm.darkMode)
          vm.hideBalances = true
          clearInterval(txCheck)
        }
      }, 100)
    },
    getBalance (id) {
      if (this.selectedNetwork === 'sBCH') return this.getSbchBalance(id)
      return this.getBchBalance(id)
    },
    getSbchBalance (id) {
      const vm = this
      if (!id) {
        id = vm.selectedAsset.id
      }
      const parsedId = String(id)

      if (sep20IdRegexp.test(parsedId)) {
        const contractAddress = parsedId.match(sep20IdRegexp)[1]
        vm.wallet.sBCH.getSep20TokenBalance(contractAddress)
          .then(balance => {
            const commitName = 'sep20/updateAssetBalance'
            vm.$store.commit(commitName, {
              id: parsedId,
              balance: balance
            })
            vm.balanceLoaded = true
          })
      } else {
        vm.wallet.sBCH.getBalance()
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
    getBchBalance (id) {
      const vm = this
      if (!id) {
        id = vm.selectedAsset.id
      }
      vm.balanceLoaded = false
      vm.transactionsPageHasNext = false
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        vm.wallet.SLP.getBalance(tokenId).then(function (response) {
          vm.balanceLoaded = true
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance
          })
        })
      } else {
        vm.wallet.BCH.getBalance().then(function (response) {
          vm.balanceLoaded = true
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance
          })
        })
      }
    },

    getTransactions () {
      if (this.selectedNetwork === 'sBCH') return this.getSbchTransactions()
      return this.getBchTransactions()
    },
    getSbchTransactions () {
      const vm = this
      const id = String(vm.selectedAsset.id)
      vm.transactionsLoaded = false

      const opts = { limit: 10, includeTimestamp: true }
      if (vm.transactionsFilter === 'sent') {
        opts.type = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        opts.type = 'incoming'
      }

      let appendResults = false
      if (Number.isSafeInteger(this.earliestBlock) && this.earliestBlock > 0) {
        opts.before = '0x' + (this.earliestBlock - 1).toString(16)
        appendResults = true
      }

      let requestPromise = null
      if (sep20IdRegexp.test(id)) {
        const contractAddress = vm.selectedAsset.id.match(sep20IdRegexp)[1]
        requestPromise = vm.wallet.sBCH._watchtowerApi.getSep20Transactions(
          contractAddress,
          vm.wallet.sBCH._wallet.address,
          opts
        )
      } else {
        requestPromise = vm.wallet.sBCH._watchtowerApi.getTransactions(
          vm.wallet.sBCH._wallet.address,
          opts
        )
      }

      if (!requestPromise) return
      requestPromise
        .then(response => {
          vm.transactionsPageHasNext = false
          if (Array.isArray(response.transactions)) {
            vm.transactionsPageHasNext = response.transactions.length > 0
            if (!appendResults) vm.transactions = []
            vm.transactions.push(...response.transactions
              .map(tx => {
                tx.senders = [tx.from]
                tx.recipients = [tx.to]
                return tx
              })
            )
          }
        })
        .finally(() => {
          vm.transactionsLoaded = true
        })
    },
    getBchTransactions () {
      const vm = this
      const id = vm.selectedAsset.id
      vm.transactionsLoaded = false
      let recordType = 'all'
      if (vm.transactionsFilter === 'sent') {
        recordType = 'outgoing'
      } else if (vm.transactionsFilter === 'received') {
        recordType = 'incoming'
      }
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        vm.wallet.SLP.getTransactions(tokenId, vm.transactionsPage, recordType).then(function (transactions) {
          if (transactions.history) {
            transactions.history.map(function (item) {
              vm.transactions.push(item)
            })
          } else {
            transactions.map(function (item) {
              vm.transactions.push(item)
            })
          }
          vm.transactionsLoaded = true
          setTimeout(() => {
            vm.transactionsPageHasNext = transactions.has_next
          }, 1000)
        })
      } else {
        vm.wallet.BCH.getTransactions(vm.transactionsPage, recordType).then(function (transactions) {
          if (transactions.history) {
            transactions.history.map(function (item) {
              vm.transactions.push(item)
            })
          } else {
            transactions.map(function (item) {
              vm.transactions.push(item)
            })
          }
          vm.transactionsLoaded = true
          setTimeout(() => {
            vm.transactionsPageHasNext = transactions.has_next
          }, 1000)
        })
      }
    },

    switchActiveBtn (btn) {
      var customBtn = document.getElementById(this.activeBtn)
      customBtn.classList.remove('active-transaction-btn')

      var element = document.getElementById(btn)
      var name = 'active-transaction-btn'
      var arr = element.className.split(' ')
      if (arr.indexOf(name) === -1) {
        element.className += ' ' + name
      }
      this.activeBtn = btn

      // change transactions filter
      this.transactionsFilter = btn.split('-')[1]
      this.transactions = []
      this.transactionsPage = 1
      this.transactionsLoaded = false
      this.getTransactions()
    },
    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
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
            vm.startPageStatus = false
            vm.securityOptionDialogStatus = 'dismiss'
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          console.log('Verification error: ', error)
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled')) {
          } else {
            this.verifyBiometric()
          }
        }
        )
    },

    setVerifyDialogAction () {
      const vm = this
      let pinVerificationCount
      pinVerificationCount = vm.$q.localStorage.getItem('pinVerificationCount')
      pinVerificationCount = isNaN(pinVerificationCount) ? 0 : parseInt(pinVerificationCount)
      if (pinVerificationCount % 10 === 0) {
        // Verify PIN every 10th load of this index page
        vm.$q.localStorage.set('pinVerificationCount', pinVerificationCount + 1)
        vm.pinDialogAction = 'VERIFY'
      } else {
        vm.pinDialogAction = 'SKIP'
        vm.$q.localStorage.set('pinVerificationCount', pinVerificationCount + 1)
      }
    },

    verifyOrSetupPIN () {
      if (this.$q.localStorage.getItem('preferredSecurity') === 'pin') {
        this.setVerifyDialogAction()
      } else {
        this.setPreferredSecurity('pin')
      }
    },

    checkFingerprintAuthEnabled () {
      NativeBiometric.isAvailable()
        .then(result => {
          if (result.isAvailable !== false) {
            this.securityOptionDialogStatus = 'show'
          } else {
            console.log('Not available: ', result.isAvailable)
            this.verifyOrSetupPIN()
          }
        },
        (error) => {
          console.log('Error: ', error)
          this.verifyOrSetupPIN()
        })
    },
    setPreferredSecurity (auth) {
      this.$q.localStorage.set('preferredSecurity', auth)
      if (auth === 'pin') {
        this.pinDialogAction = 'SET UP'
      } else {
        this.verifyBiometric()
      }
    },

    logIn () {
      const vm = this
      setTimeout(() => {
        // Security Authentication
        if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
          SecureStoragePlugin.get({ key: 'pin' })
            .then(() => {
              vm.setVerifyDialogAction()
            })
            .catch(_err => {
              vm.pinDialogAction = 'SET UP'
            })
        } else if (vm.$q.localStorage.getItem('preferredSecurity') === 'biometric') {
          vm.verifyBiometric()
        } else {
          vm.checkFingerprintAuthEnabled()
        }
      }, 500)
    },

    executeActionTaken (action) {
      if (action !== 'cancel') {
        this.pinDialogAction = ''
        this.startPageStatus = false
        this.securityOptionDialogStatus = 'dismiss'
      } else {
        this.pinDialogAction = ''
      }
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },

    async checkMissingAssets(opts={ autoOpen: false }) {
      if (!this.$refs.tokenSuggestionsDialog) return Promise.reject()
      this.showTokenSuggestionsDialog = Boolean(opts && opts.autoOpen)
      return this.$refs.tokenSuggestionsDialog.updateList(opts)
    },

    async loadWallets () {
      const vm = this
      const mnemonic = await getMnemonic()

      const wallet = new Wallet(mnemonic)
      await wallet.sBCH.getOrInitWallet()
      vm.wallet = wallet
      vm.assets.map(function (asset) {
        vm.getBalance(asset.id)
      })
      vm.getTransactions()

      // Create change addresses if nothing is set yet
      // This is to make sure that v1 wallets auto-upgrades to v2 wallets
      const bchChangeAddress = vm.getChangeAddress('bch')
      if (bchChangeAddress.length === 0) {
        vm.wallet.BCH.getNewAddressSet(0).then(function (addresses) {
          vm.$store.commit('global/updateWallet', {
            type: 'bch',
            walletHash: vm.wallet.BCH.walletHash,
            derivationPath: vm.wallet.BCH.derivationPath,
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: 0
          })
        })
      }
      const slpChangeAddress = vm.getChangeAddress('slp')
      if (slpChangeAddress.length === 0) {
        vm.wallet.SLP.getNewAddressSet(0).then(function (addresses) {
          vm.$store.commit('global/updateWallet', {
            type: 'slp',
            walletHash: vm.wallet.SLP.walletHash,
            derivationPath: vm.wallet.SLP.derivationPath,
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: 0
          })
        })
      }

      const sBchDerivationPath = vm.getWallet('sbch').derivationPath
      const lastAddress = vm.getWallet('sbch').lastAddress
      let subscribeSbchAddress = !vm.getWallet('sbch').subscribed
      if (sBchDerivationPath.length !== 14 || lastAddress !== wallet.sBCH._wallet.address) {
        subscribeSbchAddress = true
        vm.$store.commit('global/updateWallet', {
          type: 'sbch',
          derivationPath: vm.wallet.sBCH.derivationPath,
          walletHash: vm.wallet.sBCH.walletHash,
          lastAddress: vm.wallet.sBCH._wallet ? wallet.sBCH._wallet.address : ''
        })
      }

      if (subscribeSbchAddress) {
        wallet.sBCH.subscribeWallet()
          .then(response => {
            if (response && response.success) {
              vm.$store.commit('global/setWalletSubscribed', {
                type: 'sbch',
                subscribed: true
              })
            }
          })
      }
    }
  },

  beforeRouteEnter (to, from, next) {
    next(vm => {
      vm.prevPath = from.path
    })
  },

  async mounted () {
    const vm = this
    if (Array.isArray(vm.assets) && this.assets.length > 0) {
      vm.selectedAsset = vm.assets[0]
    }

    // Load wallets
    this.loadWallets()
      .then(() => {
        console.log('Notified suggestions: ', this.$root.hasSuggestedAssets)
        if (this.$root.hasSuggestedAssets) return
        this.checkMissingAssets()
          .then(() => {
            this.$root.hasSuggestedAssets = true
          })
      })

    if (vm.prevPath === '/') {
      vm.logIn()
    } else {
      vm.startPageStatus = false
    }
  }
}
</script>

<style>
  .fixed-container {
    position: fixed;
    top: 0 !important;
    background-color: #ECF3F3;
    right: 0;
    left: 0;
  }
  .transaction-row {
    position: relative;
    margin-top: 305px;
    z-index: 5;
  }
  .transaction-list {
    height: 440px;
    overflow: auto;
    padding-bottom: 80px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .transaction-list {
      height: 430px;
    }
  }
  .p-label {
    margin-bottom: 0px !important;
  }
  .default-text-color {
    color: rgb(60, 100, 246);
  }
  .text-light {
    color: #BAC2C2;
  }
  .text-number-balance {
    font-size: 45px;
  }
  .payment-methods {
    color: #000;
    font-size: 20px;
  }
  .pp-fcolor {
    color: #000 !important;
  }
  .selected {
    box-shadow: 1px 2px 2px 2px rgba(83, 87, 87, 0.2) !important;
  }
  .ib-text {
    display: inline-block;
  }
  .pay-text {
    font-size: 24px;
    color: #DBE7E7;
  }
  .text-num-lg {
    font-size: 18px;
    color: #DBE7E7;
  }
  .text-num-md {
    margin-top: 13px;
    font-size: 12px;
    color: #DBE7E7;
  }
  .transaction-container {
    min-height: 80vh;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    background-color: #F9F8FF;
    margin-top: 24px;
  }
  .col-transaction {
    padding-top: 2px;
  }
  .transaction-wallet {
    font-size: 20px;
    color: #444646;
  }
  .transactions-wallet {
    color: #4C4F4F;
  }
  .subtext {
    font-size: 11px;
    color: #4C4F4F;
    opacity: .5;
  }
  .btn-all {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #4C4F4F;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
  }
  .btn-custom:hover {
    background-color: #fff;
  }
  .btn-custom.active-transaction-btn {
    background-color: rgb(60, 100, 246) !important;
    color: #fff;
  }
  .btn-transaction {
    font-size: 16px;
    background-color: rgb(242, 243, 252);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
</style>
