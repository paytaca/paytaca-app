<template>
  <div class="scroll-y" style="background-color: #ECF3F3;" :class="{'pt-dark': darkMode}">

    <startPage v-if="startPageStatus" v-on:logIn="logIn" />

    <div v-else>
      <q-pull-to-refresh @refresh="refresh">
        <div ref="fixedSection" class="fixed-container" :class="{'pt-dark': darkMode}" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
          <div class="row q-pt-lg q-pb-xs">
            <q-tabs
              active-color="brandblue"
              class="col-12 q-px-sm q-pb-md pp-fcolor"
              :modelValue="selectedNetwork"
              @update:modelValue="changeNetwork"
              style="margin-top: -20px; padding-bottom: 16px;"
            >
              <q-tab name="BCH" :class="{'text-blue-5': darkMode}" :label="networks.BCH.name"/>
              <q-tab name="sBCH" :class="{'text-blue-5': darkMode}" :label="networks.sBCH.name"/>
            </q-tabs>
          </div>
          <div class="row q-mt-sm">
            <div class="col text-white" :class="{'text-white': darkMode}" @click="selectBch">
              <img src="../../assets/bch-logo.png" style="height: 75px; position: absolute; right: 34px; margin-top: 15px; z-index: 1;"/>
              <q-card id="bch-card">
                <q-card-section style="padding-top: 10px; padding-bottom: 12px;">
                  <div class="text-h6">Bitcoin Cash</div>
                  <div v-if="!balanceLoaded && selectedAsset.id === 'bch'" style="width: 60%; height: 63px;">
                    <q-skeleton style="font-size: 22px;" type="rect"/>
                  </div>
                  <div v-else style="margin-top: -5px; z-index: 20; position: relative;">
                    <p style="font-size: 24px;">{{ String(bchAsset.balance).substring(0, 10) }} BCH</p>
                    <div style="padding: 0; margin-top: -15px;">{{ getAssetMarketBalance(bchAsset) }} {{ String(selectedMarketCurrency).toUpperCase() }}</div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
          <div class="row q-mt-sm">
            <div class="col">
              <p class="q-ml-lg q-mb-sm payment-methods q-gutter-x-sm" :class="{'pt-dark-label': darkMode}">
                Tokens
                <q-btn
                  flat
                  padding="none"
                  size="sm"
                  icon="app_registration"
                  style="color: #3B7BF6;"
                  @click="toggleManageAssets"
                />
                <q-btn
                  v-if="manageAssets"
                  flat
                  padding="none"
                  size="sm"
                  icon="search"
                  style="color: #3B7BF6;"
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
              :manage-assets="manageAssets"
              :selected-asset="selectedAsset"
              :balance-loaded="balanceLoaded"
              :network="selectedNetwork"
            >
            </asset-cards>
          </template>
          <!-- Cards with drag scroll on other platforms -->
          <template v-else>
            <asset-cards
              :assets="assets"
              :manage-assets="manageAssets"
              :selected-asset="selectedAsset"
              :balance-loaded="balanceLoaded"
              v-dragscroll.x="true"
              :network="selectedNetwork"
            >
            </asset-cards>
          </template>
        </div>
      </q-pull-to-refresh>
      <div ref="transactionSection" class="row transaction-row">
        <transaction ref="transaction"></transaction>
        <div class="col transaction-container" :class="{'pt-dark-card-2': darkMode}">
            <p class="q-ma-lg transaction-wallet" :class="{'pt-dark-label': darkMode}">Transactions</p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-mb-sm q-pa-none q-pl-none text-center btn-transaction" :class="{'pt-dark-card': darkMode}">
              <button class="btn-custom q-mt-none active-transaction-btn btn-all" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-all')" id="btn-all">All</button>
              <button class="btn-custom q-mt-none btn-sent" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-sent')" id="btn-sent">Sent</button>
              <button class="btn-custom q-mt-none btn-received" :class="{'pt-dark-label': darkMode}" @click="switchActiveBtn('btn-received')" id="btn-received">Received</button>
            </div>
            <div class="transaction-list">
              <template v-if="transactionsLoaded">
                <div class="row" v-for="(transaction, index) in transactions" :key="'tx-' + index">
                    <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" :style="darkMode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'">
                      <div class="row" @click="showTransactionDetails(transaction)">
                        <!-- <div class="q-mr-sm">
                          <img :src="selectedAsset.logo" width="40">
                        </div> -->
                        <div class="col col-transaction ">
                          <div>
                            <p :class="{'pt-dark-label': darkMode}" class="q-mb-none transactions-wallet ib-text" style="font-size: 15px;">{{ recordTypeMap[transaction.record_type] }}</p>
                            <p :class="{'text-grey': darkMode}" class="q-mb-none transactions-wallet float-right ib-text q-mt-sm">{{ +(transaction.amount) }} {{ selectedAsset.symbol }}</p>
                          </div>
                          <div class="col">
                              <span class="float-left subtext" :class="{'pt-dark-label': darkMode}" style="font-size: 12px;">{{ formatDate(transaction.date_created) }}</span>
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

  watch: {
    startPageStatus (n, o) {
      setTimeout(() => {
        const sectionHeight = this.$refs.fixedSection.clientHeight
        this.$refs.transactionSection.setAttribute('style', `position: relative; margin-top: ${sectionHeight - 24}px; z-index: 1`)
      }, 100)
    },
    selectedAsset () {
      this.transactions = []
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
    bchAsset () {
      if (this.selectedNetwork === 'sBCH') {
        return this.$store.getters['sep20/getAssets'][0]
      }

      return this.$store.getters['assets/getAssets'][0]
    },
    assets () {
      if (this.selectedNetwork === 'sBCH') {
        return this.$store.getters['sep20/getAssets'].filter(function (item) {
          if (item && item.id !== 'bch') {
            return item
          }
        })
      }

      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item && item.id !== 'bch') {
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


  methods: {
    formatDate (date) {
      return ago(new Date(date))
    },
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
        this.selectedAsset = this.bchAsset
        this.transactions = []
        this.transactionsPage = 1
        this.transactionsLoaded = false
        this.getTransactions()
        if (this.selectedAsset) this.getBalance(this.selectedAsset.id)
      }
    },
    selectBch () {
      const vm = this
      vm.selectedAsset = this.bchAsset
      vm.getBalance(this.bchAsset.id)
      vm.getTransactions()
      vm.assetClickCounter += 1
      if (vm.assetClickCounter >= 2) {
        vm.showAssetInfo(this.bchAsset)
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
      } else {
        vm.hideAssetInfo()
        vm.assetClickTimer = setTimeout(() => {
          clearTimeout(vm.assetClickTimer)
          vm.assetClickTimer = null
          vm.assetClickCounter = 0
        }, 600)
      }
    },
    toggleManageAssets () {
      this.manageAssets = !this.manageAssets
    },
    getAssetMarketBalance (asset) {
      if (!asset || !asset.id) return ''

      const assetPrice = this.$store.getters['market/getAssetPrice'](asset.id, this.selectedMarketCurrency)
      if (!assetPrice) return ''

      const computedBalance = Number(asset.balance || 0) * Number(assetPrice)

      return computedBalance.toFixed(2)
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
      this.balanceLoaded = false
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
      vm.transactionsPageHasNext = false
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        vm.wallet.SLP.getBalance(tokenId).then(function (response) {
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance
          })
          vm.balanceLoaded = true
        })
      } else {
        vm.wallet.BCH.getBalance().then(function (response) {
          vm.$store.commit('assets/updateAssetBalance', {
            id: id,
            balance: response.balance,
            spendable: response.spendable
          })
          vm.balanceLoaded = true
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
    refresh (done) {
      this.getBalance(this.bchAsset.id)
      this.getBalance(this.selectedAsset.id)
      this.getTransactions()
      done()
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

    async checkMissingAssets (opts = { autoOpen: false }) {
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
      vm.selectedAsset = this.bchAsset
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
    color: rgb(60, 100, 246) !important;
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
    font-weight: 500;
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
    font-weight: 500;
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
  #bch-card {
    margin: 0px 20px 10px 20px;
    border-radius: 15px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
  }
</style>
