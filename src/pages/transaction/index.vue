<template>
  <div>
    <div class="fixed-container">
      <div class="row q-pt-lg">
        <div class="col q-pl-lg">
          <p class="text-light p-label" style="color: #ABA9BB;">
            Your {{ selectedAsset.symbol }} balance
          </p>
          <p class="text-number-balance default-text-color">
            {{ displayBalance(selectedAsset.balance) }}
          </p>
        </div>
        <div class="q-space q-pr-lg">
          <p class="text-right text-light p-label" style="color: #ABA9BB;">{{ today }}</p>
          <img class="float-right q-mt-sm" :src="selectedAsset.logo" height="50">
        </div>
      </div>
      <div class="row">
          <div class="col">
              <p class="q-ml-lg q-mb-sm payment-methods default-text-color">
                Assets
                <q-btn
                  flat
                  padding="none"
                  size="sm"
                  icon="refresh"
                  @click="updateBalance"
                />
              </p>
          </div>
      </div>
      <div class="row no-wrap q-gutter-md q-pl-lg q-pb-md" style="overflow: scroll;" id="asset-container">
          <!-- <button class="btn-add-payment-method q-ml-lg" style="margin-right: 10px !important">+</button> -->
          <div
            v-for="(asset, index) in assets"
            :key="index"
            class="method-cards q-pa-md q-mr-none"
            @click="(e) => {
              scrollToView(e)
              selectedAsset=asset
            }"
          >
            <div class="row items-start no-wrap justify-between">
              <img :src="asset.logo" height="40" class="q-mr-xs">
              <p class="col q-pl-sm" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; font-size: 22px; text-align: right;">
                {{ asset.symbol }}
              </p>
            </div>
            <div class="row">
              <q-space />
              <p class="float-right text-num-lg text-no-wrap" style="overflow: hidden; text-overflow: ellipsis; color: #EAEEFF; margin-top: -5px;">
                {{ displayBalance(asset.balance)  }}
              </p>
            </div>
          </div>
          <button class="q-ml-sm" style="border: none; background-color: transparent"></button>
      </div>
    </div>
    <div class="row transaction-row">
        <div class="col transaction-container">
            <p class="q-ma-lg transaction-wallet">Transactions</p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-mb-sm q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-transaction-btn btn-all" @click="switchActiveBtn('btn-all')" id="btn-all"><b>All</b></button>
                <button class="btn-custom q-mt-none btn-sent" @click="switchActiveBtn('btn-sent')" id="btn-sent"><b>Sent</b></button>
                <button class="btn-custom q-mt-none btn-received" @click="switchActiveBtn('btn-received')" id="btn-received"><b>Received</b></button>
            </div>
            <div class="transaction-list">
              <template v-if="transactionsLoaded && balanceLoaded">
                <div class="row" v-for="(transaction, index) in transactions" :key="'tx-' + index">
                    <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                      <div class="row">
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
                <loader></loader>
              </div>
            </div>
        </div>
    </div>
    <footer-menu />
  </div>
</template>

<script>
import jsUtils from '../../utils/vanilla.js'
import { Wallet } from '../../utils/wallet'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import Loader from '../../components/Loader.vue'

export default {
  name: 'Transaction-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { Loader },
  data () {
    return {
      today: new Date().toDateString(),
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
      wallet: null
    }
  },

  computed: {
    assets () {
      return this.$store.getters['assets/getAssets']
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
    displayBalance (balance) {
      if (this.balanceLoaded) {
        return balance
      } else {
        return '--'
      }
    },
    getBalance (id) {
      const vm = this
      vm.balanceLoaded = false
      let counter = 0
      const balanceCheck = setInterval(function () {
        if (vm.wallet) {
          if (id.indexOf('slp/') > -1) {
            const tokenId = id.split('/')[1]
            vm.wallet.SLP.getBalance(tokenId).then(function (response) {
              vm.balanceLoaded = true
              clearInterval(balanceCheck)
            })
          } else {
            vm.wallet.BCH.getBalance().then(function (response) {
              vm.balanceLoaded = true
              clearInterval(balanceCheck)
              vm.selectedAsset.balance = response.balance
            })
          }
        }
        if (counter > 5) {
          clearInterval(balanceCheck)
        }
        counter++
      }, 1000)
    },

    getTransactions () {
      const vm = this
      vm.wallet.BCH.getTransactions().then(function (transactions) {
        vm.transactions = transactions
        vm.transactionsLoaded = true
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

    scrollToView (evt) {
      // Scroll by y-axis first then x-axis
      // jsUtils.getScrollableParent(...) 2nd param is whether resolving the scrollable parent with respect to x-axis(true) or y-axis(false)
      // jsUtils.scrollIntoView(...) 3rd param is whether to scroll to view with respect to x-axis(true) or y-axis(false)

      const scrollableParentY = jsUtils.getScrollableParent(evt.target, true)
      if (scrollableParentY) jsUtils.scrollIntoView(scrollableParentY, evt.target, true)

      const scrollableParentX = jsUtils.getScrollableParent(evt.target, false)
      if (scrollableParentX) jsUtils.scrollIntoView(scrollableParentX, evt.target, false)
    },

    updateBalance () {
      this.$store.dispatch('global/updatePrivateBalance')
      this.$store.dispatch('global/updateEscrowBalance')
    }
  },

  mounted () {
    if (Array.isArray(this.assets) && this.assets.length > 0) {
      this.selectedAsset = this.assets[0]
    }

    // Load wallets
    const getMnemonic = this.$store.getters['global/getMnemonic']
    const mnemonic = this.$aes256.decrypt(getMnemonic())
    this.wallet = new Wallet(mnemonic)
  },

  created () {
    const vm = this
    const txnCheck = setInterval(function () {
      if (vm.wallet && vm.transactionsLoaded) {
        clearInterval(txnCheck)
      } else {
        vm.getBalance(vm.selectedAsset.id)
        vm.getTransactions()
        const watchtower = vm.wallet.SLP.watchtower
        watchtower.Wallet.getTokens(vm.wallet.SLP.walletHash).then(function (tokens) {
          console.log(tokens)
        })
      }
    }, 1000)
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
    height: 110px;
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
