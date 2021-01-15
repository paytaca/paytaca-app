<template>
  <div>
    <div class="row q-pt-lg">
      <div class="col q-pl-lg">
        <p class="text-light p-label">Your balance</p>
        <p class="text-number-balance default-text-color">30.67</p>
      </div>
      <div class="col q-pr-lg">
        <p class="text-right text-light p-label">08 January 2021</p>
        <img class="float-right q-mt-sm" src="bitcoin-cash-bch-logo.png" width="54">
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
        <!-- <button class="btn-add-payment-method q-ml-lg">+</button> -->
        <div class="method-cards q-pa-md" @click="scrollToView">
          <div class="row items-start no-wrap justify-between">
            <img src="bitcoin-cash-bch-logo.png" width="40" class="q-mr-xs">
            <p class="pay-text q-mb-none float-right ib-tex text-right text-no-wrap" style="overflow:hidden;text-overflow:ellipsis">
              BCH
            </p>
          </div>
          <div class="row">
            <q-space />
            <p class="float-right q-mt-sm text-num-lg text-no-wrap" style="overflow:hidden;text-overflow:ellipsis">
              {{ (balance.confirmed + balance.unconfirmed) | satoshisToBCH }} BCH
            </p>
          </div>
        </div>
        <div
          v-for="(tokenBalance, index) in balance.tokens"
          :key="index"
          class="method-cards q-pa-md"
          @click="scrollToView"
        >
          <div class="row items-start no-wrap justify-between">
            <img src="bitcoin-cash-bch-logo.png" width="40" class="q-mr-xs">
            <p class="pay-text q-mb-none float-right ib-tex text-right text-no-wrap" style="overflow:hidden;text-overflow:ellipsis">
              {{ getTokenStats(tokenBalance.tokenId) && getTokenStats(tokenBalance.tokenId).name }}
            </p>
          </div>
          <div class="row">
            <q-space />
            <p class="float-right q-mt-sm text-num-lg text-no-wrap" style="overflow:hidden;text-overflow:ellipsis">
              {{ Number(Number(tokenBalance.balanceString).toFixed(4)) }}
              {{ getTokenStats(tokenBalance.tokenId) && getTokenStats(tokenBalance.tokenId).symbol }}
            </p>
          </div>
        </div>
    </div>
    <div class="row q-mt-md">
        <div class="col text-center q-gutter-xs">
          <router-link to="select-asset"><button class="float-center btn-send"><b><i class="mdi mdi-send-outline"></i> SEND</b></button></router-link>
          <router-link to="receive"><button class="float-center btn-action btn-receive"><b><i class="mdi mdi-arrow-down-box"></i> RECEIVE</b></button></router-link>
        </div>
    </div>
    <div class="row">
        <div class="col transaction-container">
            <p class="q-ma-lg transaction-wallet"><b>TRANSACTIONS</b></p>
            <div class="col q-gutter-xs q-ml-lg q-mr-lg q-mb-sm q-pa-none q-pl-none text-center btn-transaction">
                <button class="btn-custom q-mt-none active-transaction-btn btn-all" @click="switchActiveBtn('btn-all')" id="btn-all"><b>All</b></button>
                <button class="btn-custom q-mt-none btn-sent" @click="switchActiveBtn('btn-sent')" id="btn-sent"><b>Sent</b></button>
                <button class="btn-custom q-mt-none btn-received" @click="switchActiveBtn('btn-received')" id="btn-received"><b>Received</b></button>
            </div>
            <div class="row">
                <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                  <div class="row">
                    <div class="q-mr-sm">
                      <img src="bitcoin-cash-bch-logo.png" width="40">
                    </div>
                    <div class="col col-transaction">
                      <div>
                        <p class="q-mb-none transactions-wallet ib-text"><b>My BCH wallet</b></p>
                        <p class="q-mb-none transactions-wallet float-right ib-text q-mt-sm"><b>₱0.00</b></p>
                      </div>
                      <div class="col">
                          <span class="float-left subtext"><b>0 BCH</b></span>
                          <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            <div class="row">
                <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                  <div class="row">
                    <div class="q-mr-sm">
                      <img src="bitcoin-cash-bch-logo.png" width="40">
                    </div>
                    <div class="col col-transaction">
                      <div>
                        <p class="q-mb-none transactions-wallet ib-text"><b>My BCH wallet</b></p>
                        <p class="q-mb-none transactions-wallet float-right ib-text q-mt-sm"><b>₱0.00</b></p>
                      </div>
                      <div class="col">
                          <span class="float-left subtext"><b>0 BCH</b></span>
                          <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            <div class="row">
                <div class="col q-mt-md q-mr-lg q-ml-lg q-pt-none q-pb-sm" style="border-bottom: 1px solid #DAE0E7">
                  <div class="row">
                    <div class="q-mr-sm">
                      <img src="bitcoin-cash-bch-logo.png" width="40">
                    </div>
                    <div class="col col-transaction">
                      <div>
                        <p class="q-mb-none transactions-wallet ib-text"><b>My BCH wallet</b></p>
                        <p class="q-mb-none transactions-wallet float-right ib-text q-mt-sm"><b>₱0.00</b></p>
                      </div>
                      <div class="col">
                          <span class="float-left subtext"><b>0 BCH</b></span>
                          <!-- <span class="float-right subtext"><b>12 January 2021</b></span> -->
                      </div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script>
import jsUtils from '../../utils/vanilla.js'
import walletUtils from '../../utils/common.js'

export default {
  name: 'Transaction-page',
  data () {
    return {
      activeBtn: 'btn-all'
    }
  },

  computed: {
    isPrivateMode () {
      return this.$store.getters['global/isPrivateMode']
    },
    address () {
      return this.$store.getters['global/address']
    },
    balance () {
      return this.$store.getters['global/balance']
    }
  },

  filters: {
    satoshisToBCH (val) {
      const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)

      return bchjs.BitcoinCash.toBitcoinCash(Number(val))
    }
  },

  methods: {
    getTokenStats (tokenId) {
      return this.$store.getters['tokenStats/getTokenStats'](tokenId)
    },

    chooseAsset (scrollX) {
      var el = document.getElementById('asset-container')
      el.scrollTo({
        top: 0,
        left: scrollX,
        behavior: 'smooth'
      })
    },
    switchActiveBtn (btn) {
      var customBtn = document.getElementById(this.activeBtn)
      customBtn.classList.remove('active-btn')

      var element = document.getElementById(btn)
      var name = 'active-btn'
      var arr = element.className.split(' ')
      if (arr.indexOf(name) === -1) {
        element.className += ' ' + name
      }
      this.activeBtn = btn
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
  created () {
    console.log(this)
    this.$q.localStorage.getItem('active-account') ? this.$q.dark.set(false) : this.$q.dark.set(false)
  }
}
</script>

<style lang="scss">
  .p-label {
    margin-bottom: 0px !important;
  }
  .default-text-color {
    color: #3992EA;
  }
  .text-light {
    color: #BAC2C2;
  }
  .text-number-balance {
    font-size: 52px;
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
    height: 110px;
    min-width: 180px;
    border-radius: 16px;
    background-color: #3992EA;
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
  .btn-send {
    height: 40px;
    width: 32%;
    color: #4C4F4F;
    border: none;
    border-radius: 20px;
    background-color: #fff;
    outline: 0;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .1);
  }
  .btn-receive {
    height: 40px;
    width: 32%;
    color: #fff;
    background-color: #E6BC4B;
    border-radius: 20px;
    border: none;
    outline: 0;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .18);
  }
  .transaction-container {
    min-height: 350px;
    border-top-left-radius: 36px;
    border-top-right-radius: 36px;
    background-color: #fff;
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
    background-color: rgba(206, 38, 38, .8) !important;
    color: #fff;
  }
  .btn-transaction {
    background-color: rgba(43, 126, 209, .04);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
</style>
