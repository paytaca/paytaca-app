<template>
  <div>
    <header-nav :title="'RECEIVE ' + asset.symbol" backnavpath="/receive/select-asset"></header-nav>
    <q-icon id="context-menu" size="35px" name="more_vert" style="color: #3b7bf6; z-index: 150;">
      <q-menu>
        <q-list style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section @click="generateNewAddress">Generate new address</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <div style="text-align: center; margin-top: 80px;" v-if="generatingAddress">
      <loader></loader>
    </div>
    <template v-else>
      <div class="row">
        <div class="col qr-code-container">
            <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md" @click="copyAddress">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md">
                  <img :src="asset.logo" height="50" style="position: absolute; margin-top: 73px; background: #fff;">
                  <qr-code :text="address" color="#253933" :size="190" error-level="H" class="q-mb-sm"></qr-code>
                </div>
              </div>
              <div>click to copy</div>
            </div>
            <div style="text-align: center;" v-if="walletType === 'bch'" @click="showOptions = !showOptions">
              <q-btn :icon="showOptions ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" flat round dense />
            </div>
        </div>
      </div>
      <div class="row" v-if="showOptions">
        <q-toggle
          style="margin: auto;"
          v-model="legacy"
          label="Legacy Address"
        />
      </div>
      <div class="row">
        <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;">
          <span class="qr-code-text text-weight-medium">
            <div class="text-nowrap" @click="copyAddress">
              {{ address }}
            </div>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import Loader from '../../components/loader'
import { getMnemonic, Wallet, Address } from '../../wallet'

export default {
  name: 'receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { HeaderNav, Loader },
  data () {
    return {
      activeBtn: 'btn-bch',
      walletType: '',
      asset: {},
      assetLoaded: false,
      showOptions: false,
      legacy: false,
      wallet: null,
      generatingAddress: false
    }
  },
  props: {
    assetId: {
      type: String,
      required: false,
      default: ''
    }
  },
  computed: {
    address () {
      const address = this.getAddress()
      if (this.legacy) {
        return this.convertToLegacyAddress(address)
      } else {
        return address
      }
    }
  },
  methods: {
    generateNewAddress () {
      const vm = this
      vm.generatingAddress = true
      const lastAddressIndex = vm.getLastAddressIndex()
      if (vm.walletType === 'bch') {
        vm.wallet.BCH.getNewAddressSet(lastAddressIndex).then(function (addresses) {
          vm.$store.commit('global/generateNewAddressSet', {
            type: 'bch',
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: lastAddressIndex + 1
          })
          vm.generatingAddress = false
          vm.setupListener()
        })
      }
      if (vm.walletType === 'slp') {
        vm.wallet.SLP.getNewAddressSet(lastAddressIndex).then(function (addresses) {
          vm.$store.commit('global/generateNewAddressSet', {
            type: 'slp',
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: lastAddressIndex + 1
          })
          vm.generatingAddress = false
          vm.setupListener()
        })
      }
    },
    getAddress () {
      if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }
      return this.$store.getters['global/getAddress'](this.walletType)
    },
    getLastAddressIndex () {
      if (this.assetId.indexOf('slp/') > -1) {
        this.walletType = 'slp'
      } else {
        this.walletType = 'bch'
      }
      return this.$store.getters['global/getLastAddressIndex'](this.walletType)
    },
    copyAddress () {
      this.$copyText(this.address)
      this.$q.notify({
        message: 'Copied address',
        timeout: 800
      })
    },
    getAsset (id) {
      const assets = this.$store.getters['assets/getAsset'](id)
      if (assets.length > 0) {
        return assets[0]
      }
    },
    playSound (success) {
      if (success) {
        const audio = new Audio('/audio/send-success.wav')
        audio.play()
      }
    },
    notifyOnReceive (amount, symbol, logo) {
      const vm = this
      vm.playSound(true)
      vm.$q.notify({
        message: `${amount} ${symbol} received!`,
        avatar: logo,
        timeout: 3000
      })
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    setupListener () {
      const vm = this
      let url
      let assetType
      const address = vm.getAddress()
      if (vm.assetId.indexOf('slp/') > -1) {
        assetType = 'slp'
        url = `wss://watchtower.cash/ws/watch/slp/${address}/`
      } else {
        assetType = 'bch'
        url = `wss://watchtower.cash/ws/watch/bch/${address}/`
      }
      vm.$connect(url)
      vm.$options.sockets.onmessage = function (message) {
        const data = JSON.parse(message.data)
        console.log(data)
        if (assetType === 'slp') {
          const tokenId = vm.assetId.split('/')[1]
          if (data.token_id.split('/')[1] === tokenId) {
            vm.notifyOnReceive(
              data.amount,
              vm.asset.symbol,
              vm.asset.logo
            )
          }
        } else {
          vm.notifyOnReceive(
            data.amount,
            vm.asset.symbol,
            vm.asset.logo
          )
        }
      }
    }
  },

  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
    })
  },

  created () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)
    vm.setupListener()
  }
}
</script>

<style lang="scss" scoped>
  body {
    overflow: hidden;
  }
  #context-menu {
    position: fixed;
    top: 20px;
    right: 20px;
  }
  .receive {
    color: #636767;
  }
  .qr-code-container {
    margin-top: 100px;
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
    margin-left: auto;
    margin-right: auto;
    text-align: center;
    width: 300px;
    border-radius: 16px;
    padding: 25px 10px 32px 10px;
    box-shadow: 1px 2px 2px 1px rgba(99, 103, 103, .1);
    border: 4px solid #ed5f59;
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
