<template>
  <div>
    <!-- <div class="row">
        <div class="col q-mt-md q-pl-md text-center q-pr-md">
          <router-link :to="{ path: '/'}">
            <i class="material-icons q-mt-sm icon-arrow-left" style="font-size: 35px; float: left; color: #3b7bf6;">arrow_back</i>
          </router-link>
          <p class="text-center select q-mt-sm text-token" style="font-size: 22px;">
            SEND {{ asset.symbol }}
          </p>
        </div>
    </div> -->
    <header-nav :title="'SEND ' + asset.symbol" backnavpath="/send/select-asset"></header-nav>
    <div class="q-pa-md">
      <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
        <q-icon name="error" left/>
        {{ scanner.error }}
      </div>
      <div class="row justify-center" v-if="!scanner.show && sendData.recipientAddress === ''">
        <div class="col-12 q-mt-lg">
          <q-btn class="full-width btn-scan q-py-xs" label="scan qr code" icon="qr_code_scanner" @click="scanner.show = !scanner.show"></q-btn>
        </div>
        <div class="col-12 q-mt-lg" style="text-align: center; font-size: 20px;">
          OR
        </div>
        <div class="col-12 q-mt-lg" style="text-align: center;">
          <q-input outlined bottom-slots v-model="manualAddress" label="Paste address here">
            <template v-slot:append>
              <q-icon name="arrow_forward_ios" style="color: #3b7bf6;" @click="sendData.recipientAddress = manualAddress" />
            </template>
          </q-input>
        </div>
      </div>
      <div class="row justify-center q-pt-lg" v-if="scanner.show">
        <div ref="scanner" class="q-pa-none qrcode-scanner">
          <span class="material-icons close-scanner" @click="scanner.show = !scanner.show">
          close
          </span>
          <div :class="{'scanner-box' : scanner.show}" ref="box">
            <div class="scan-layout-design" v-if="scanner.show">
              <div class="scan-design1">
                <div class="line-design1"></div>
              </div>
              <div class="scan-design2">
                <div class="line-design2"></div>
              </div>
              <div class="scan-design3">
                <div class="line-design3"></div>
              </div>
              <div class="scan-design4">
                <div class="line-design4"></div>
              </div>
            </div>
            <span class="scanner-text text-center full-width">Scan QR code</span>
          </div>
          <qrcode-stream v-if="scanner.show" :camera="scanner.frontCamera ? 'front': 'auto'" @decode="onDecode" @init="onInit"></qrcode-stream>
        </div>
      </div>
      <div class="q-pa-md text-center text-weight-medium">
        {{ scanner.decodedContent }}
      </div>
    </div>
    <div class="q-px-lg" v-if="sendData.recipientAddress !== ''">
      <form class="q-pa-sm" @submit.prevent="handleSubmit">
        <div class="row">
          <div class="col q-mt-sm se">
            <q-input outlined v-model="sendData.recipientAddress" label="Recipient" :disabled="disableRecipientInput"></q-input>
          </div>
        </div>
        <div class="row">
          <div class="col q-mt-md">
            <q-input type="number" step="0.0001" outlined v-model="sendData.amount" label="Amount" :disabled="disableAmountInput"></q-input>
          </div>
        </div>
        <div class="row" v-if="sendError">
          <div class="col q-mt-md" style="color: #da53b2;">
            {{ sendError }}
          </div>
        </div>
        <div class="row" style="text-align: center;" v-if="sendData.sending">
          <loader></loader>
        </div>
      </form>
    </div>
    <div class="confirmation-slider" ref="confirmation-slider" v-if="sendData.amount !== null">
      <div id="status" style="text-align: center;">
        <label class="swipe-confrim-label">Swipe to Send</label>
        <input id="confirm" type="range" value="0" min="0" max="100" @change="tiggerRange" ref="swipe-submit">
        <span class="mdi mdi-arrow-right-circle" style="color: #fff; position: absolute; z-index: 10000; bottom: 20px; right: 20px: "></span>
      </div>
    </div>
  </div>
</template>

<script>
import { getMnemonic, Wallet } from '../../utils/wallet'
import { QrcodeStream } from 'vue-qrcode-reader'
import { fasQrcode, fasWallet } from '@quasar/extras/fontawesome-v5'
import Loader from '../../components/loader'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'Send-page',
  components: {
    QrcodeStream,
    Loader,
    HeaderNav
  },
  props: {
    assetId: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: false
    },
    recipient: {
      type: String,
      required: false
    }
  },
  data () {
    return {
      asset: {},
      wallet: null,

      fetchingTokenStats: false,
      tokenStats: null,

      manualAddress: '',
      scannedRecipientAddress: false,
      scanner: {
        show: false,
        frontCamera: false,
        error: '',
        decodedContent: ''
      },

      sendData: {
        sent: false,
        sending: false,
        success: false,
        error: '',
        txid: '',
        amount: null,
        fixedAmount: false,
        recipientAddress: '',
        fixedRecipientAddress: false
      },
      sendError: null,
      online: true
    }
  },

  computed: {
    disableRecipientInput () {
      return this.sendData.sent || this.sendData.fixedRecipientAddress || this.scannedRecipientAddress
    },
    disableAmountInput () {
      return this.sendData.sending || this.sendData.sent || this.sendData.fixedAmount
    }
  },

  methods: {
    getAsset (id) {
      const assets = this.$store.getters['assets/getAsset'](id)
      if (assets.length > 0) {
        return assets[0]
      }
    },
    onDecode (content) {
      this.sendData.recipientAddress = content
      this.scanner.show = !this.scanner.show
      this.scannedRecipientAddress = true
    },
    onInit (promise) {
      const screenHeight = screen.height
      this.$refs.scanner.setAttribute('style', 'height: ' + screenHeight + 'px !important; width: 100% !important;')
      const screenWidth = screen.width
      const boxRightMargin = screenWidth - (screenWidth / 2) - 110 // 110 is half the scanner box width
      this.$refs.box.setAttribute('style', 'margin-left: ' + boxRightMargin + 'px;')
      promise
        .then(() => {
          console.log('Successfully initilized! Ready for scanning now!')
          this.scanner.error = ''
        })
        .catch(error => {
          this.scanner.show = false
          if (error.name === 'NotAllowedError') {
            this.scanner.error = 'Permission required to access to camera'
            // this.scanner.error = 'Hey! I need access to your camera'
          } else if (error.name === 'NotFoundError') {
            this.scanner.error = 'No camera found on this device'
            // this.scanner.error = 'Do you even have a camera on your device?'
          } else if (error.name === 'NotSupportedError') {
            this.scanner.error = 'Unable to acccess camera in non-secure context'
            // this.scanner.error = 'Seems like this page is served in non-secure context (HTTPS, localhost or file://)'
          } else if (error.name === 'NotReadableError') {
            this.scanner.error = 'Unable to access camera.'
            // this.scanner.error = 'Couldn\'t access your camera. Is it already in use?'
          } else if (error.name === 'OverconstrainedError') {
            this.scanner.frontCamera = false
            this.scanner.error = 'Constraints don\'t match any installed camera. Did you ask for the front camera although there is none?'
          } else {
            this.scanner.error = 'Unknown error: ' + error.message
          }
        })
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },

    handleSubmit () {
      const vm = this
      const address = this.sendData.recipientAddress
      vm.sendData.sending = true
      if (address.indexOf('simpleledger:') > -1) {
        const tokenId = vm.assetId.split('slp/')[1]
        const bchWallet = vm.getWallet('bch')
        const feeFunder = {
          walletHash: bchWallet.walletHash,
          mnemonic: vm.wallet.mnemonic,
          derivationPath: bchWallet.derivationPath
        }
        vm.wallet.SLP.sendSlp(vm.sendData.amount, tokenId, address, feeFunder).then(function (result) {
          console.log(result)
          vm.sendData.sending = false
          if (result.success) {
            vm.sendData.txid = result.txid
            vm.$router.push('/')
          } else {
            vm.sendError = result.error
          }
        })
      } else if (address.indexOf('bitcoincash:') > -1) {
        vm.wallet.BCH.sendBch(vm.sendData.amount, address).then(function (result) {
          console.log(result)
          vm.sendData.sending = false
          if (result.success) {
            vm.sendData.txid = result.txid
            vm.$router.push('/')
          } else {
            vm.sendError = result.error
          }
        })
      }
    },
    tiggerRange () {
      if (this.$refs['swipe-submit'].value > 99) {
        this.handleSubmit()
      }
    }
  },

  mounted () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)

    // Load wallets
    getMnemonic().then(function (mnemonic) {
      vm.wallet = new Wallet(mnemonic)
    })
  },

  created () {
    this.fasQrcode = fasQrcode
    this.fasWallet = fasWallet

    const vm = this
    if (vm.assetId && vm.amount && vm.recipient) {
      vm.sendData.amount = vm.amount
      vm.sendData.fixedAmount = true
      vm.sendData.recipientAddress = vm.recipient
      vm.sendData.fixedRecipientAddress = true
      vm.scanner.show = false
    }
  }
}
</script>

<style lang="scss">
  .q-field--outlined .q-field__control:before {
    border: 2px solid #3b7bf6;
  }
  .btn-scan {
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
    color: white;
  }
  .qrcode-scanner {
    position: fixed;
    margin-top: 0;
    border: 0;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: lightcoral;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
  }
  .close-scanner {
    position: absolute;
    top: 24px;
    right: 24px;
    font-size: 38px;
    color: #ef4f84;
    z-index: 2500;
  }
  .scanner-text {
    position: absolute;
    bottom: -30px;
    color: white;
    z-index: 1000;
  }
  .scanner-box {
    position: absolute !important;
    display: flex !important;
    margin-bottom: 10%;
    height: 220px !important;
    width: 220px !important;
    border-radius: 16% !important;
    box-shadow: 0px 0px 0px 1000px rgba(0, 0, 0, 0.6);
    vertical-align: middle;
    z-index: 2000 !important
  }
  .scan-design1 {
    position: absolute;
    height: 24px;
    width: 24px;
    left: 10px;
    top: 10px;
    overflow: hidden;
  }
  .line-design1 {
    height: 150px;
    width: 150px;
    border: 3px solid #3b7bf6;
    border-radius: 15%;
    animation-name: example;
  }
  .scan-design2 {
    position: absolute;
    height: 24px;
    width: 24px;
    right: 10px;
    top: 10px;
    overflow: hidden;
  }
  .line-design2 {
    position: absolute;
    height: 150px;
    width: 150px;
    right: 0px;
    top: 0px;
    border: 3px solid #3b7bf6;
    border-radius: 15%;
  }
  .scan-design3 {
    position: absolute;
    height: 24px;
    width: 24px;
    right: 10px;
    bottom: 10px;
    overflow: hidden;
  }
  .line-design3 {
    position: absolute;
    height: 150px;
    width: 150px;
    right: 0px;
    bottom: 0px;
    border: 3px solid #3b7bf6;
    border-radius: 15%;
  }
  .scan-design4 {
    position: absolute;
    height: 24px;
    width: 24px;
    left: 10px;
    bottom: 10px;
    overflow: hidden;
  }
  .line-design4 {
    position: absolute;
    height: 150px;
    width: 150px;
    left: 0px;
    bottom: 0px;
    border: 3px solid #3b7bf6;
    border-radius: 15%;
  }
  .swipe-confrim-label {
    position: absolute;
    color: #fff !important;
    margin-top: 5px;
    display: block;
    font-size: 18px;
    top: 12px;
    right: 16px;
  }
  .confirmation-slider {
    position: fixed;
    bottom: 0px;
    width: 100%;
    border: 0;
    text-align: center;
  }
  #status {
    height:62px;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
  }

  @keyframes fadein {
    from{ opacity:0; }
    to{ opacity:1; }
  }

  .delete-notice { display:none; user-select:none; font-size:20px; line-height:50px; color:#ED4545; animation:fadein 4s ease; }

  #confirm {
    appearance: none !important;
    background: transparent;
    height: 62px;
    padding: 0 5px;
    width: 100%;
  }

  #confirm::-webkit-slider-thumb {
    appearance:none!important;
    height:48px;
    width:160px;
    border:3px solid rgba(60, 100, 246, .6);
    border-radius: 18px;
    cursor: e-resize;
    background: no-repeat no-repeat;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84, #ed5f59);
   }

  #confirm:hover::-webkit-slider-thumb {
    border:3px solid rgba(60, 100, 246, .5);
  }
  .form-input {
    width: 100%;
    height: 38px;
    border-radius: 18px;
    border: 1px solid #008BF1;
    outline: 0;
    text-overflow: ellipsis;
  }
  .form-input:focus {
    border-color: #89BFF4;
    box-shadow: 0px 0px 2px 2px rgba(137, 191, 244, .5);
  }
  .form-input-amount {
    padding-right: 14px;
  }
  .send-input-fields {
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    background-color: #fff;
    /*display: none;*/
  }
  .color-light-gray {
    color: #444646;
  }
  .icon-size {
    font-size: 18px;
  }
  .token-name-container {
    padding-top: 2px;
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
    color: #444646;
  }
</style>
