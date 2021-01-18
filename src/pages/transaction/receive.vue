<template>
  <div>
    <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link :to="{ name: 'transaction-receive-select-asset' }">
            <i class="material-icons q-mt-sm icon-arrow-left" style="font-size: 35px; float: left; color: #3b7bf6;">arrow_back</i>
          </router-link>
          <p class="text-center select q-mt-sm text-token" style="font-size: 22px;">
            RECEIVE {{ getAssetStats(assetId).symbol }}
          </p>
        </div>
    </div>
    <div class="row">
      <div class="col qr-code-container">
          <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md">
            <div class="row text-center">
              <div class="col row justify-center q-pt-md">
                <img :src="getAssetLogo(assetId)" height="60" style="position: absolute; margin-top: 80px; background: #fff;">
                <qr-code :text="getAddress()" color="#253933" :size="220" error-level="H" class="q-mb-sm"></qr-code>
              </div>
            </div>
          </div>
      </div>
    </div>
    <div class="row">
      <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;">
        <span class="qr-code-text text-weight-medium">
          <div class="text-nowrap">
            {{ getAddress() }}
            <div class="row" style="margin-top: -20px;">
              <div class="col q-ma-sm q-mb-md">
                <i class="eva eva-copy-outline icon-copy float-right q-mr-md" @click="copyAddress"></i>
              </div>
            </div>
          </div>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import walletUtils from '../../utils/common.js'

export default {
  name: 'receive-page',
  mixins: [
    walletAssetsMixin,
  ],
  data () {
    return {
      activeBtn: 'btn-bch'
    }
  },

  props: {
    assetId: {
      type: String,
      required: false,
      default: '',
    }
  },

  computed: {
    address () {
      return this.$store.getters['global/address']
    }
  },
  methods: {
    getAddress () {
      if (!this.assetId) {
        return this.address
      } else {
        return walletUtils.parseAddress(this.address, walletUtils.ADDR_SLP)
      }
    },
    copyAddress () {
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
      })
    }
  }
}
</script>

<style lang="scss">
  .receive {
    color: #636767;
  }
  .qr-code-container {
    margin-top: 66px;
    padding-left: 28px;
    padding-right: 28px;
  }
  /* iPhone 5/SE */
  @media (min-width: 280px) and (max-width: 320px) {
    .qr-code-container {
      margin-top: 30px;
    }
  }
  /* Galaxy Fold */
  @media (min-width: 200px) and (max-width: 280px) {
    .qr-code-container {
      margin-top: 66px;
    }
  }
  .col-qr-code {
    width: 100%;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    border-radius: 16px;
    padding: 25px 10px 32px 10px;
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
    font-size: 18px;
    font-family: monospace;
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
