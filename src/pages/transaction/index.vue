<template>
  <div @click="() => { if (manageAssets === true) { manageAssets = false } }">
    <div class="fixed-container">
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
                  icon="refresh"
                  style="color: #3B7BF6;"
                  @click="getBalance()"
                />
              </p>
          </div>
      </div>
      <div class="row no-wrap q-gutter-md q-pl-lg q-pb-md" id="asset-container">
          <div
            v-for="(asset, index) in assets"
            :key="index"
            class="method-cards q-pa-md q-mr-none"
            @click="(event) => {
              selectAsset(event, asset)
            }"
            v-touch-hold.5000mouse="toggleManageAssets"
          >
            <div
              v-if="manageAssets && asset.symbol !== 'BCH'"
              @click="() => removeAsset(asset)"
              style="float: right; width: 20px; margin-top: -10px;">
              <q-btn icon="close" flat round dense v-close-popup />
            </div>
            <div class="row items-start no-wrap justify-between">
              <img :src="asset.logo" height="30" class="q-mr-xs">
              <p class="col q-pl-sm" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; font-size: 22px; text-align: right;">
                {{ asset.symbol }}
              </p>
            </div>
            <div class="row">
              <q-space />
              <p class="float-right text-num-lg text-no-wrap" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -5px;">
                {{ asset.balance }}
              </p>
            </div>
          </div>
          <button v-if="manageAssets" class="btn-add-payment-method q-ml-lg shadow-4" @click="addNewAsset">+</button>
          <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
      </div>
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
            <template v-if="transactionsLoaded && balanceLoaded">
              <div class="row" v-for="(transaction, index) in filterTransactions()" :key="'tx-' + index">
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
                            <span class="float-left subtext" style="font-size: 12px;"><b>{{ transaction.txid | truncateTxid }}</b></span>
                            <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                        </div>
                      </div>
                    </div>
                  </div>
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
</template>

<script>
import jsUtils from '../../utils/vanilla.js'
import { getMnemonic, Wallet } from '../../utils/wallet'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import Loader from '../../components/loader'
import Transaction from '../../components/transaction'
import AddNewAsset from '../../pages/transaction/dialog/AddNewAsset'
import RemovePaymetMethod from '../../pages/transaction/dialog/RemovePaymentMethod'

export default {
  name: 'Transaction-page',
  components: { Loader, Transaction },
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
      transactionsLoaded: false,
      balanceLoaded: false,
      wallet: null,
      paymentMethods: null,
      manageAssets: false
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
    }
  },

  methods: {
    toggleManageAssets () {
      this.manageAssets = !this.manageAssets
    },
    removeAsset (asset) {
      const vm = this
      const assetName = asset.name
      vm.$q.dialog({
        component: RemovePaymetMethod,
        parent: vm,
        assetName
      }).onOk(() => {
        vm.$store.commit('assets/removeAsset', asset.id)
      }).onCancel(() => {
      })
    },
    addNewAsset () {
      const vm = this
      vm.$q.dialog({
        component: AddNewAsset,
        parent: vm
      }).onOk((asset) => {
        vm.addAsset(asset)
      }).onCancel(() => {
      })
    },
    addAsset (tokenId) {
      const vm = this
      this.wallet.SLP.getSlpTokenDetails(tokenId).then(function (details) {
        const asset = {
          id: details.id,
          symbol: details.symbol,
          name: details.name,
          logo: details.image_url,
          balance: 0
        }
        if (details.symbol.length > 0 && details.token_type === 1) {
          vm.$store.commit('assets/addNewAsset', asset)
        }
      })
    },
    toggleHideBalances () {
      this.hideBalances = !this.hideBalances
    },
    showTransactionDetails (transaction) {
      const vm = this
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
      vm.transactions = []
      vm.transactionsLoaded = false
      if (id.indexOf('slp/') > -1) {
        const tokenId = id.split('/')[1]
        vm.wallet.SLP.getTransactions(tokenId).then(function (transactions) {
          vm.transactions = transactions
          vm.transactionsLoaded = true
        })
      } else {
        vm.wallet.BCH.getTransactions().then(function (transactions) {
          vm.transactions = transactions
          vm.transactionsLoaded = true
        })
      }
    },

    filterTransactions () {
      const vm = this
      return vm.transactions.filter(function (transaction) {
        if (vm.transactionsFilter === 'all') {
          return transaction
        }
        if (vm.transactionsFilter === 'sent') {
          if (transaction.record_type === 'outgoing') {
            return transaction
          }
        }
        if (vm.transactionsFilter === 'received') {
          if (transaction.record_type === 'incoming') {
            return transaction
          }
        }
      })
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
    },

    selectAsset (event, asset) {
      this.selectedAsset = asset
      this.getBalance()
      this.getTransactions()

      // Scroll by y-axis first then x-axis
      // jsUtils.getScrollableParent(...) 2nd param is whether resolving the scrollable parent with respect to x-axis(true) or y-axis(false)
      // jsUtils.scrollIntoView(...) 3rd param is whether to scroll to view with respect to x-axis(true) or y-axis(false)

      const scrollableParentY = jsUtils.getScrollableParent(event.target, true)
      if (scrollableParentY) jsUtils.scrollIntoView(scrollableParentY, event.target, true)

      const scrollableParentX = jsUtils.getScrollableParent(event.target, false)
      if (scrollableParentX) jsUtils.scrollIntoView(scrollableParentX, event.target, false)
    }
  },

  // created () {
  //   this.assets = [
  //     {
  //       id: 'bch',
  //       symbol: 'BCH',
  //       name: 'Bitcoin Cash',
  //       logo: 'bch-logo.png',
  //       balance: 0
  //     },
  //     {
  //       id: 'slp/4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf',
  //       symbol: 'SPICE',
  //       name: 'SPICE',
  //       logo: 'spice-logo.png',
  //       balance: 0
  //     },
  //     {
  //       id: 'slp/7f8889682d57369ed0e32336f8b7e0ffec625a35cca183f4e81fde4e71a538a1',
  //       symbol: 'HONK',
  //       name: 'HONK',
  //       logo: 'honk-logo.png',
  //       balance: 0
  //     },
  //     {
  //       id: 'slp/a013d636dcadc71f7e11d7880e9e8b62295e772cf1a24180f74d0eca62604136',
  //       symbol: 'ORB',
  //       name: 'ORB',
  //       logo: 'orb-logo.png',
  //       balance: 0
  //     }
  //   ]
  // },

  mounted () {
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
    })
  }
}
</script>

<style lang="scss">
  .fixed-container {
    position: fixed;
    top: 0pt !important;
    right: 0pt;
    left: 0pt;
  }
  #asset-container {
    overflow: scroll;
    -ms-overflow-style: none;  /* Internet Explorer 10+ */
    scrollbar-width: none;  /* Firefox */
  }
  #asset-container::-webkit-scrollbar {
      display: none;  /* Safari and Chrome */
  }
  .fixed-footer {
    position: fixed;
    height: 60px;
    width: 100%;
    background-color: #F9F7FF;
    border-top-right-radius: 20px;
    border-top-left-radius: 20px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    bottom: 0pt;
    z-index: 6;
    .footer-icon {
      font-size: 24px;
      color: #3992EA;
    }
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 50px;
      height: 50px;
      outline: none;
      background-color: transparent;
    }
    .footer-btn-container {
      margin-top: 1px !important;
    }
    .active-switch {
      color: #69CB51;
    }
    .account-options {
      position: absolute;
      display: none !important;
      line-height: 40px;
      top: -100px;
      right: 30px;
      width: 80px;
      text-align: center;
      background-color: #fff;
      border-radius: 10px;
      box-shadow: 1px 1px 2px 1px rgba(99, 103, 103, .2);
      border-radius: 10px;
      vertical-align: middle;
      padding: 8px 0px 8px 0px;
      transition: .3s;
      a {
        display: block;
        text-decoration: none;
        width: 100%;
        padding: 4px 0px 4px 0px;
        color: #000;
      }
    }
    .btn-ellipse:focus .account-options {
      display: block !important;
    }
  }
  .transaction-row {
    position: relative;
    margin-top: 270px;
    z-index: 5;
  }
  .transaction-list {
    height: 440px;
    overflow: auto;
    padding-bottom: 110px;
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
  .btn-add-cash {
    border: none;
    background-color: rgba(206, 38, 38, .5);
    color: #fff;
    padding: 10px 14px 10px 14px;
    margin-right: 26px;
    border-radius: 10px;
    margin-top: 14px;
    right: 2px;
  }
  /*.add-cash {
    margin-top: 60px;
    margin-right: 16px;
    color: #6E94F1;
  }*/
  .payment-methods {
    font-size: 20px;
  }
  .btn-add-payment-method {
    border: 1px solid #2B7ED1;
    background-color: transparent;
    color: #2B7ED1;
    padding: 34px 20px 34px 20px;
    border-radius: 16px;
    font-size: 20px;
    height: 100px;
    margin-left: 15px;
  }
  .method-cards {
    height: 100px;
    min-width: 160px;
    border-radius: 16px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #5f94f8, #df68bb, #ef4f84, #ed5f59);
    box-shadow: 1px 2px 2px 2px rgba(99, 103, 103, .2);
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
    min-height: 350px;
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
