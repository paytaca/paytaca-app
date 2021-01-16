<template>
  <div>
    <sidebar-mode-toggler />
    <div class="row">
      <div class="col q-mt-md">
        <p class="text-center send"><b>RECEIVE</b></p>
      </div>
    </div>
    <template v-if="hasAvailableAssets">
      <div
        role="button"
        class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link"
        @click="$router.push({ name: 'transaction-receive' })"
      >
        <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
        <div class="col q-pl-sm q-pr-sm">
          <p class="q-ma-none text-token text-weight-medium">
            BCH
          </p>
          <p class="q-ma-none asset">
            {{ (balance.confirmed + balance.unconfirmed) | satoshisToBCH }} BCH
          </p>
        </div>
      </div>

      <div v-if="Array.isArray(balance.tokens) && balance.tokens.length">
        <div class="row">
          <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
            <p class="slp_tokens q-mb-sm"><b>SLP TOKENS</b></p>
          </div>
        </div>
        <div
          v-for="(tokenBalance, index) in balance.tokens"
          :key="index"
          @click="$router.push({ name: 'transaction-receive', query: { tokenId: tokenBalance.tokenId } })"
          role="button"
          class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link"
        >
          <div><img :src="getTokenLogo(tokenBalance.tokenId)" width="40"></div>
          <div class="col q-pl-sm q-pr-sm">
            <p class="q-ma-none text-token text-weight-medium">
              {{ getTokenStats(tokenBalance.tokenId) && getTokenStats(tokenBalance.tokenId).name }}
            </p>
            <p class="q-ma-none asset">
              {{ tokenBalance.balanceString | formatBalancePrecision }}
              {{ getTokenStats(tokenBalance.tokenId) && getTokenStats(tokenBalance.tokenId).symbol }}
            </p>
          </div>
        </div>
      </div>
    </template>
    <div
      v-else
      class="q-pa-sm text-grey text-center text-h6"
    >
      No assets available
    </div>
  </div>
</template>
<script>
import walletUtils from '../../utils/common.js'

export default {
  name: 'Receive-page',
  data () {
    return {
      activeBtn: 'btn-bch',
      // address: '',
      result: '',
      error: ''
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
    },
    hasAvailableAssets () {
      if(!this.balance) return false

      const hasBCH = (this.balance.confirmed + this.balance.unconfirmed) > 0
      const hasTokenBalance = Array.isArray(this.balance.tokens) &&
        this.balance.tokens.reduce((total, token) => total + token.balance, 0) > 0

      return hasBCH || hasTokenBalance
    }
  },

  filters: {
    satoshisToBCH (val) {
      const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)
      return bchjs.BitcoinCash.toBitcoinCash(Number(val))
    },

    formatBalancePrecision (val) {
      const precision = 4
      const number = Number(val)
      const multiplier = 10**precision
      if (number*multiplier < multiplier) {
        return number.toPrecision(precision)
      }
      return Number(number.toFixed(precision))
    }
  },

  methods: {
    swtichActiveBtn (btn) {
      var element = document.getElementById(btn)
      var name = 'active-btn'
      var arr = element.className.split(' ')
      if (arr.indexOf(name) === -1) {
        element.className += ' ' + name
      }
      var customBtn = document.getElementById(this.activeBtn)
      customBtn.classList.remove('active-btn')
      this.activeBtn = btn
    },
    getTokenStats (tokenId) {
      return this.$store.getters['tokenStats/getTokenStats'](tokenId)
    },
    getTokenLogo (tokenId) {
      return this.$store.getters['tokenStats/getTokenLogo'](tokenId) || 'bitcoin-cash-bch-logo.png'
    }
  },

  mounted () {
    this.$store.dispatch('global/updatePrivateBalance')
    this.$store.dispatch('global/updateEscrowBalance')
  },

  created () {
    this.$q.localStorage.getItem('active-account') ? this.$q.dark.set(false) : this.$q.dark.set(false)
  }
}
</script>

<style lang="scss">
  .display-none {
    display: none;
  }
  .send {
    color: #636767;
  }
  .receipient-address {
    margin-top: 80px;
    padding-bottom: 50px;
    background-color: #fff;
  }
  .recep-address {
    color: #000;
  }
  .qr-code-container {
    margin-top: 40px;
    padding-left: 28px;
    padding-right: 28px;
    height: 300px;
  }
  .qrcode-scanner {
    margin-top: 70px;
    height: 220px !important;
    width: 100% !important;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 30px
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 40px
    }
  }
  .col-qr-code-recevie {
    width: 100%;
    background-color: #fff;
    border-radius: 16px;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .1);
  }
  .receive-add-amount {
    color: #3992EA;
  }
  .qr-code {
    height: 205px;
    width: 205px;
    background-color: #464747;
    margin: auto;
  }
  .qr-code-text {
    font-size: 12px;
    color: #000;
  }
  .currencies {
    position: fixed;
    height: 100px;
    width: 100%;
    bottom: 0pt;
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    padding-top: 28px;
  }
  .btn-bch {
    margin-left: 0px;
  }
  .btn-custom {
    height: 40px;
    width: 32%;
    border-radius: 20px;
    border: none;
    color: #444646;
    background-color: transparent;
    outline:0;
    cursor: pointer;
    transition: .2s;
  }
  .btn-custom:hover {
    background-color: #fff;
  }
  .btn-custom.active-btn {
    background-color: #fff !important;
    color: #3992EA;
  }
  .btn-transaction {
    background-color: rgba(43, 126, 209, .04);
    border-radius: 24px;
    padding: 4px;
    padding-left: 2px;
    padding-right: 2px;
  }
  .receive__to {
    color: #636767;
  }
  .receive-wallet {
    color: #373939;
  }
  .icon-copy {
    color: #3992EA;
    font-size: 26px;
  }
</style>
