<template>
  <div>
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link :to="{ path: '/'}">
            <i class="material-icons q-mt-sm icon-arrow-left" style="font-size: 35px; float: left; color: #3b7bf6;">arrow_back</i>
          </router-link>
          <p class="text-center select q-mt-sm text-token" style="font-size: 22px; color: #3B7BF6;">
            SEND
          </p>
        </div>
    </div>
    <template v-if="assets">
      <div class="row">
        <div class="col q-mt-md q-pl-lg q-pr-lg q-pb-none" style="font-size: 16px; color: #444655;">
          <p class="slp_tokens q-mb-sm">SELECT ASSET TO SEND</p>
        </div>
      </div>
      <div
        v-for="(asset, index) in assets"
        :key="index"
        @click="$router.push({ name: 'transaction-send', query: { assetId: asset.id } })"
        role="button"
        class="row q-pl-lg q-pr-lg token-link"
      >
        <div class="col row group-currency q-mb-sm">
          <div class="row q-pt-sm q-pb-xs q-pl-md group-currency-main">
            <div><img :src="getAssetLogo(asset.id)" width="50"></div>
            <div class="col q-pl-sm q-pr-sm">
              <p class="q-ma-none text-token text-weight-medium" style="font-size: 18px; color: #444655;">
                {{ getAssetStats(asset.id).name }}
              </p>
              <p class="q-ma-none asset" style="font-size: 18px; color: #444655;">
                {{ getBalance(asset.id) | formatAmountPrecision }}
                {{ getAssetStats(asset.id).symbol }}
              </p>
            </div>
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

    <footer-menu />
  </div>
</template>
<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import walletUtils from '../../utils/common.js'

export default {
  name: 'Send-select-asset',
  mixins: [
    walletAssetsMixin
  ],
  data () {
    return {
      activeBtn: 'btn-bch',
      result: '',
      error: ''
    }
  },
  computed: {
    balances () {
      return this.$store.getters['global/balances']
    },
    assets () {
      return this.$store.getters['global/assets']
    }
  },

  filters: {
    satoshisToBCH (val) {
      const bchjs = walletUtils.getBCHJS(walletUtils.NET_MAINNET)
      return bchjs.BitcoinCash.toBitcoinCash(Number(val))
    },

    formatAmountPrecision (val) {
      const number = Number(val)
      return Number(number.toFixed(4)).toLocaleString(undefined, { minimumFractionDigits: 2 })
    }
  },

  methods: {
    getBalance (id) {
      const balance = this.balances.find(bln => bln.id === id)
      return balance ? balance.balance : 0
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
  .group-currency {
    width: 100%;
    border: 2px solid #ed5f59;
    border-radius: 14px;
    margin-top: 5px;
    margin-bottom: 5px;
  }
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
