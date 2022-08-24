<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;" :class="$store.getters['darkmode/getStatus'] ? 'pt-dark' : ''">
    <header-nav
      :title="'RECEIVE ' + asset.symbol"
      backnavpath="/"
    ></header-nav>
    <q-icon v-if="!isSep20" id="context-menu" size="35px" name="more_vert" :style="{'margin-left': (getScreenWidth() - 45) + 'px', 'margin-top': this.$q.platform.is.ios ? '30px' : '0px'}">
      <q-menu anchor="bottom right" self="top end">
        <q-list :class="{'pt-dark-card': $store.getters['darkmode/getStatus']}" style="min-width: 100px">
          <q-item clickable v-close-popup>
            <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']" @click="generateNewAddress">Generate new address</q-item-section>
          </q-item>
          <q-item clickable v-close-popup>
            <q-item-section :class="[$store.getters['darkmode/getStatus'] ? 'pt-dark-label' : 'pp-text']" @click="copyPrivateKey">
              <template v-if="copying">
                Copying...
              </template>
              <template v-else>
                Copy private key
              </template>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-icon>
    <div style="text-align: center; padding-top: 80px;" v-if="generatingAddress">
      <ProgressLoader/>
    </div>
    <template v-else>
      <div class="row">
        <div class="col qr-code-container">
          <fullscreen v-model="fullscreen" :class="{'img-bg-white': fullscreen}" :teleport="true" :page-only="true">
            <div class="col col-qr-code q-pl-sm q-pr-sm q-pt-md" @click="toggleFullScreen">
              <div class="row text-center">
                <div class="col row justify-center q-pt-md">
                  <img :src="asset.logo || getFallbackAssetLogo(asset)" height="50" class="receive-icon-asset">
                  <qr-code :text="address" color="#253933" :size="200" error-level="H" class="q-mb-sm"></qr-code>
                </div>
              </div>
              <div v-if="!fullscreen" class="text-black">Click to display the QR only</div>
            </div>
          </fullscreen>
        </div>
      </div>
      <div class="row q-mt-md" v-if="walletType === 'bch'">
        <q-toggle
          style="margin: auto;"
          v-model="legacy"
          :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'"
          keep-color
          color="blue-9"
          label="Legacy Address"
        />
      </div>
      <div class="row">
        <div class="col" style="padding: 20px 40px 0px 40px; overflow-wrap: break-word;">
          <span class="qr-code-text text-weight-light text-center">
            <div class="text-nowrap" style="letter-spacing: 1px" @click="copyToClipboard(address)" :class="$store.getters['darkmode/getStatus'] ? 'text-white' : 'pp-text'">
              {{ address }}
              <p style="font-size: 12px; margin-top: 7px;">Click to copy address</p>
            </div>
            <div v-if="lnsName" class="text-center text-caption pp-text">
              {{ lnsName }}
              <q-btn
                type="a"
                size="sm"
                flat
                padding="none"
                icon="open_in_new"
                :href="`https://app.bch.domains/name/${lnsName}/details`"
                target="_blank"
              />
            </div>
          </span>
        </div>
      </div>
    </template>
    <footer-menu />
  </div>
</template>

<script>
import { markRaw } from '@vue/reactivity'
import walletAssetsMixin from '../../mixins/wallet-assets-mixin.js'
import HeaderNav from '../../components/header-nav'
import ProgressLoader from '../../components/ProgressLoader'
import { getMnemonic, Wallet, Address } from '../../wallet'
import { watchTransactions } from '../../wallet/sbch'

const sep20IdRegexp = /sep20\/(.*)/
const sBCHWalletType = 'Smart BCH'

export default {
  name: 'receive-page',
  mixins: [
    walletAssetsMixin
  ],
  components: { HeaderNav, ProgressLoader },
  data () {
    return {
      sBCHListener: null,
      activeBtn: 'btn-bch',
      walletType: '',
      asset: {},
      assetLoaded: false,
      legacy: false,
      wallet: null,
      lnsName: '',
      generatingAddress: false,
      fullscreen: false,
      copying: false
    }
  },
  props: {
    network: {
      type: String,
      defualt: 'BCH'
    },
    assetId: {
      type: String,
      required: false,
      default: ''
    }
  },
  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    address () {
      const address = this.getAddress()
      if (this.walletType === sBCHWalletType) {
        return address
      } else if (this.legacy) {
        return this.convertToLegacyAddress(address)
      } else {
        return address
      }
    }
  },
  methods: {
    updateLnsName () {
      if (!this.isSep20) return
      if (!this.address) return

      return this.$store.dispatch('lns/resolveAddress', { address: this.address })
        .then(response => {
          if (response && response.name) {
            this.lnsName = response.name
            return Promise.resolve(response)
          }
          return Promise.reject()
        })
    },
    getFallbackAssetLogo (asset) {
      const logoGenerator = this.$store.getters['global/getDefaultAssetLogo']
      return logoGenerator(String(asset && asset.id))
    },
    getScreenWidth () {
      const divBounds = document.body.getBoundingClientRect()
      return divBounds.width
    },
    generateNewAddress () {
      const vm = this
      vm.generatingAddress = true
      const lastAddressIndex = vm.getLastAddressIndex()
      const newAddressIndex = lastAddressIndex + 1
      if (vm.walletType === 'bch') {
        vm.wallet.BCH.getNewAddressSet(lastAddressIndex).then(function (addresses) {
          vm.$store.commit('global/generateNewAddressSet', {
            type: 'bch',
            lastAddress: addresses.receiving,
            lastChangeAddress: addresses.change,
            lastAddressIndex: newAddressIndex
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
            lastAddressIndex: newAddressIndex
          })
          vm.generatingAddress = false
          vm.setupListener()
        })
      }

      if (vm.walletType === sBCHWalletType) {
        vm.wallet.sBCH.subscribeWallet()
      }
    },
    async copyPrivateKey () {
      this.copying = true
      const lastAddressIndex = this.$store.getters['global/getLastAddressIndex'](this.walletType)
      let privateKey
      if (this.walletType === 'bch') {
        privateKey = await this.wallet.BCH.getPrivateKey('0/' + String(lastAddressIndex))
      } else {
        privateKey = await this.wallet.SLP.getPrivateKey('0/' + String(lastAddressIndex))
      }
      this.copying = false
      this.copyToClipboard(privateKey)
    },
    getAddress () {
      if (this.isSep20) {
        this.walletType = sBCHWalletType
        if (this.wallet) return this.wallet.sBCH._wallet.address
        else return ''
      } else if (this.assetId.indexOf('slp/') > -1) {
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
    toggleFullScreen () {
      this.fullscreen = !this.fullscreen
    },
    copyToClipboard (value) {
      this.$copyText(value)
      this.$q.notify({
        message: 'Copied to clipboard',
        timeout: 800,
        color: 'blue-9',
        icon: 'mdi-clipboard-check'
      })
    },
    getAsset (id) {
      let getter = 'assets/getAsset'
      if (this.isSep20) {
        getter = 'sep20/getAsset'
      }
      const assets = this.$store.getters[getter](id)
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
      vm.fullscreen = false
      vm.playSound(true)
      vm.$confetti.start({
        particles: [
          {
            type: 'heart'
          }
        ],
        size: 3,
        dropRate: 3
      })
      vm.$q.notify({
        classes: 'br-15 text-body1',
        message: `${amount} ${symbol} received!`,
        color: 'blue-9',
        position: 'bottom',
        avatar: logo,
        timeout: 4000
      })
      setTimeout(function () {
        vm.$confetti.stop()
      }, 3000)
    },
    convertToLegacyAddress (address) {
      const addressObj = new Address(address)
      return addressObj.toLegacyAddress()
    },
    setupListener () {
      const vm = this
      if (vm.isSep20) return vm.setupSbchListener()

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
        if (assetType === 'slp') {
          const tokenId = vm.assetId.split('/')[1]
          if (data.token_id.split('/')[1] === tokenId) {
            vm.notifyOnReceive(
              data.amount,
              vm.asset.symbol,
              vm.asset.logo || vm.getFallbackAssetLogo(vm.asset)
            )
          }
        } else {
          vm.notifyOnReceive(
            data.amount,
            vm.asset.symbol,
            vm.asset.logo || vm.getFallbackAssetLogo(vm.asset)
          )
        }
      }
    },

    setupSbchListener () {
      const vm = this
      if (!vm.isSep20) return

      const address = vm.getAddress()
      const opts = { type: 'incoming' }
      if (sep20IdRegexp.test(vm.asset.id)) {
        const contractAddress = vm.asset.id.match(sep20IdRegexp)[1]
        opts.contractAddresses = [contractAddress]
        opts.tokensOnly = true
      } else {
        opts.tokensOnly = false
      }

      // Stop listener if another listener already exists
      vm.stopSbchListener()
      console.log('starting listener')
      watchTransactions(
        address,
        opts,
        function ({ tx }) {
          if (!tx || tx.to !== address) return

          vm.notifyOnReceive(
            tx.amount,
            vm.asset.symbol,
            vm.asset.logo || vm.getFallbackAssetLogo(vm.asset)
          )
        }
      ).then(listener => {
        vm.sBCHListener = listener
      })
    },

    stopSbchListener () {
      if (this.sBCHListener && this.sBCHListener.stop && this.sBCHListener.stop.call) {
        console.log('stopping listener')
        this.sBCHListener.stop()
      }
    }
  },

  watch: {
    address () {
      this.lnsName = ''
      this.updateLnsName()
    }
  },

  beforeDestroy () {
    this.stopSbchListener()
  },

  mounted () {
    const vm = this
    getMnemonic().then(function (mnemonic) {
      const wallet = new Wallet(mnemonic)
      wallet.sBCH.getOrInitWallet()
        .then(() => {
          vm.wallet = markRaw(wallet)
          vm.setupListener()
        })
    })
    this.updateLnsName()
  },

  created () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)
  }
}
</script>

<style lang="scss" scoped>
  body {
    overflow: hidden;
  }
  #context-menu {
    position: fixed;
    top: 16px;
    color: #3b7bf6;
    z-index: 150;
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
    border: 4px solid #ed5f59;
    padding: 25px 10px 32px 10px;
    background: white;
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
  .receive-icon-asset {
    position: absolute;
      margin-top: 73px;
      background: white;
      border-radius: 50%;
      padding: 4px;
  }
  .pp-text {
    color: #000 !important;
  }
  .img-bg-white {
    background: white;
    padding: 100px 20px !important;
    height: 100vh;
  }
</style>
