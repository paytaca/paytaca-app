<template>
  <div>
    <sidebar-mode-toggler />
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link to="/"><i class="icon-size-1 material-icons q-mt-sm icon-arrow-left">arrow_back</i></router-link>
          <p class="text-center select q-mt-sm text-token"><b>SELECT AN ASSET</b></p>
        </div>
    </div>
    <template v-if="hasAvailableAssets">
      <router-link :to="{ name: 'transaction-send' }">
        <div class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
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
      </router-link>

      <div v-if="Array.isArray(balance.tokens) && balance.tokens.length">
        <div class="row">
          <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none">
            <p class="slp_tokens q-mb-sm"><b>SLP TOKENS</b></p>
          </div>
        </div>
        <router-link
          v-for="(tokenBalance, index) in balance.tokens"
          :key="index"
          :to="{ name: 'transaction-send', query: { tokenId: tokenBalance.tokenId } }"
        >
          <div class="row q-pl-lg q-pr-lg q-pt-sm q-pb-sm token-link">
            <div><img src="bitcoin-cash-bch-logo.png" width="40"></div>
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
        </router-link>
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
  name: 'Select-token-page',

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
    },
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
    getTokenStats (tokenId) {
      return this.$store.getters['tokenStats/getTokenStats'](tokenId)
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
  .error {
    font-weight: bold;
    color: red;
  }
  .asset {
    color: #B4BABA;
    position: absolute;
  }
  .icon-arrow-left {
    position: absolute;
    left: 20px;
    color: #3992EA;
  }
  .icon-size-1 {
    font-size: 26px;
  }
  .slp_tokens {
    color: #636767;
  }
  .token-link {
    color: #000;
    text-decoration: none;
  }
  .text-token {
    color: #636767;
  }
</style>
