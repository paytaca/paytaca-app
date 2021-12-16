<template>
  <div style="background-color: #ECF3F3;">

    <startPage v-if="startPageStatus" v-on:logIn="logIn" />

    <div v-else>

      <div class="fixed-container" :style="{width: $q.platform.is.bex ? '375px' : '100%', margin: '0 auto'}">
        <div class="row q-pt-lg">
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
          </div>
          <div class="q-space q-pr-lg">
            <p class="text-right text-light p-label" style="color: #ABA9BB;">{{ today }}</p>
            <img class="float-right q-mt-sm" :src="selectedAsset.logo" height="50">
          </div>
        </div>
        <div class="row">
            <div class="col">
                <p class="q-ml-lg q-mb-sm payment-methods">
                  Assets
                  <q-btn
                    flat
                    padding="none"
                    size="sm"
                    icon="app_registration"
                    style="color: #3B7BF6;"
                    @click="toggleManageAssets"
                  />
                </p>
            </div>
        </div>
        <asset-info ref="asset-info"></asset-info>
        <!-- Cards without drag scroll on mobile -->
        <template v-if="$q.platform.is.mobile">
          <asset-cards
            :assets="assets"
          >
          </asset-cards>
        </template>
        <!-- Cards with drag scroll on other platforms -->
        <template v-else>
          <asset-cards
            :assets="assets"
            v-dragscroll.x="true"
          >
          </asset-cards>
        </template>
      </div>
      <div class="row transaction-row">
        <transaction ref="transaction"></transaction>
        <div class="col transaction-container">
            <p class="q-ma-lg transaction-wallet">Transactions</p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-mb-sm q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-transaction-btn btn-all" @click="switchActiveBtn('btn-all')" id="btn-all"><b>All</b></button>
                <button class="btn-custom q-mt-none btn-sent" @click="switchActiveBtn('btn-sent')" id="btn-sent"><b>Sent</b></button>
                <button class="btn-custom q-mt-none btn-received" @click="switchActiveBtn('btn-received')" id="btn-received"><b>Received</b></button>
            </div>
            <div class="transaction-list">
              <template v-if="balanceLoaded">
                <div class="row" v-for="(transaction, index) in transactions" :key="'tx-' + index">
                    <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                      <div class="row" @click="showTransactionDetails(transaction)">
                        <!-- <div class="q-mr-sm">
                          <img :src="selectedAsset.logo" width="40">
                        </div> -->
                        <div class="col col-transaction">
                          <div>
                            <p class="q-mb-none transactions-wallet ib-text" style="font-size: 15px;"><b>{{ recordTypeMap[transaction.record_type] }}</b></p>
                            <p class="q-mb-none transactions-wallet float-right ib-text q-mt-sm"><b>{{ +(transaction.amount) }} {{ selectedAsset.symbol }}</b></p>
                          </div>
                          <div class="col">
                              <span class="float-left subtext" style="font-size: 12px;"><b>{{ transaction.date_created | formatDate }}</b></span>
                              <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                <div v-if="transactionsLoaded && transactionsPageHasNext" style="margin-top: 20px; width: 100%; text-align: center; color: #3b7bf6;">
                  <p @click="() => { transactionsPage += 1; getTransactions() }">Show More</p>
                </div>
              </template>
              <div style="text-align: center;" v-else>
                <loader :hideCallback="toggleHideBalances"></loader>
              </div>
            </div>
        </div>
      </div>
      <footer-menu />
    </div>

    <securityOptionDialog :security-option-dialog-status="securityOptionDialogStatus" v-on:preferredSecurity="setPreferredSecurity" />
    <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="executeActionTaken" />

  </div>
</template>

<script>
import { getMnemonic, Wallet } from '../../wallet'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import Loader from '../../components/loader'
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

export default {
  name: 'Transaction-page',
  components: { Loader, Transaction, AssetInfo, AssetCards, pinDialog, securityOptionDialog, startPage },
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
      prevPath: null
    }
  },

  computed: {
    assets () {
      return this.$store.getters['assets/getAssets'].filter(function (item) {
        if (item) {
          return item
        }
      })
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
          vm.$refs.transaction.show(transaction)
          vm.hideBalances = true
          clearInterval(txCheck)
        }
      }, 100)
    },
    getBalance (id) {
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

    checkFingerprintAuthEnabled () {
      NativeBiometric.isAvailable()
        .then(result => {
          if (result.isAvailable !== false) {
            this.securityOptionDialogStatus = 'show'
          } else {
            console.log('Not available: ', result.isAvailable)
            this.pinDialogAction = 'VERIFY'
          }
        },
        (error) => {
          console.log('Error: ', error)
          this.pinDialogAction = 'VERIFY'
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
              vm.pinDialogAction = 'VERIFY'
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
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
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
      if (vm.prevPath === '/') {
        vm.logIn()
      } else {
        vm.startPageStatus = false
      }
    })
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
    margin-top: 270px;
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
    font-size: 20px;
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
