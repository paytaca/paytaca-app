<template>
  <div style="background-color: #ECF3F3; min-height: 100vh;">
    <header-nav
      :title="'SEND ' + asset.symbol" backnavpath="/send/select-asset"
      v-if="!sendData.sent"
    ></header-nav>
    <div>
      <div class="q-pa-md" style="padding-top: 70px;">
        <div v-if="tokenType === 65 && image" style="width: 150px; margin: 0 auto;">
          <img :src="image" width="150" />
        </div>
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
                <q-icon name="arrow_forward_ios" style="color: #3b7bf6;" @click="checkAddress(manualAddress)" />
              </template>
            </q-input>
          </div>
        </div>
        <div class="row justify-center q-pt-lg" v-show="scanner.show">
          <div ref="scanner" class="q-pa-none qrcode-scanner">
            <span class="material-icons close-scanner" @click="closeQrScanner">
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
      <div class="q-px-lg" v-if="sendData.sent === false && sendData.recipientAddress !== ''">
        <form class="q-pa-sm" @submit.prevent="handleSubmit" style="font-size: 26px !important;">
          <div class="row">
            <div class="col q-mt-sm se">
              <q-input outlined v-model="sendData.recipientAddress" label="Recipient" :disabled="disableRecipientInput" :readonly="disableRecipientInput"></q-input>
            </div>
          </div>
          <div class="row">
            <div class="col q-mt-md">
              <q-input type="text" inputmode="tel" outlined v-model="sendData.amount" label="Amount" :disabled="disableAmountInput" :readonly="disableAmountInput"></q-input>
            </div>
          </div>
          <div class="row">
            <div class="col q-mt-md" style="font-size: 18px; color: gray;">
              Balance: {{ asset.balance }} {{ asset.symbol }}
              <a
                href="#"
                @click.prevent="setMaximumSendAmount"
                style="float: right; text-decoration: none; color: #3b7bf6;"
              >
                MAX
              </a>
            </div>
          </div>
          <div class="row" style="text-align: center;" v-if="sendData.sending">
            <loader></loader>
          </div>
        </form>
      </div>

      <div class="pt-submit-container" :class="[!showSlider ? 'pt-invisible' : '']">
        <p class="text-h6 q-my-none q-py-none text-white pt-send-text">
          Swipe to send
        </p> <!-- v-touch-pan.horizontal.prevent.mouse="slideToSubmit" -->
        <div class="text-center pt-on-process" :class="[!swiped ? 'animate-process' : '']">
          <p class="text-h6 text-white q-my-none q-py-none pt-process-text">
            <span class="q-mr-sm" style="display: flex; align-items: center; height: 100%">Processing</span>
            <span class="material-icons pt-check-icon">
            task_alt
            </span>
          </p>
        </div>
        <div class="pt-animate-submit text-white text-center" v-touch-pan.horizontal.prevent.mouse="slideToSubmit">
          <span v-if="swiped" class="material-icons pt-arrow-right-icon">
          arrow_forward
          </span>
        </div>
      </div>
      <template v-if="!showSlider">
        <footer-menu v-if="!sendData.sending" />
      </template>

      <div class="row" v-if="sendErrors.length > 0">
        <div class="col">
          <ul style="margin-left: -40px; list-style: none;">
            <li v-for="(error, index) in sendErrors" :key="index" class="bg-red-1 text-red q-pa-lg">
              <q-icon name="error" left/>
              {{ error }}
            </li>
          </ul>
        </div>
      </div>
      <div class="q-px-lg" v-if="sendData.sent" style="text-align: center; margin-top: 25%;">
        <q-icon size="120px" name="check_circle" style="color: green;"></q-icon>
        <div style="margin-top: 20px;">
          <p style="font-size: 30px;">Successfully sent</p>
          <p style="font-size: 28px;">{{ sendData.amount }} {{ asset.symbol }}</p>
        </div>
      </div>
      <!-- <div class="confirmation-slider" ref="confirmation-slider" v-if="showSlider" :style="{width: $q.platform.is.bex ? '375px !important' : '100%'}">
        <div id="status" style="text-align: center;">
          <label class="swipe-confrim-label" style="padding-right: 10px;">Swipe to Send </label>
          <input style="z-index: 2001 !important;" id="confirm" type="range" value="0" min="0" max="100" @change="tiggerRange" ref="swipe-submit">
        </div>
        <div id="slider-arrow" v-if="!$q.platform.is.bex">
          <span style="z-index: 2000 !important; color: white; font-size: 22px;" class="mdi mdi-arrow-right"></span>
        </div>
      </div>
      <template v-else>
        <footer-menu v-if="!sendData.sending" />
      </template> -->
    </div>

    <pinDialogComponent :pin-dialog-action="pinDialogAction" :next-action="sendTransaction" />

  </div>
</template>

<script>
import { getMnemonic, Wallet, Address } from '../../wallet'
import { QrcodeStream } from 'vue-qrcode-reader'
import { fasQrcode, fasWallet } from '@quasar/extras/fontawesome-v5'
import Loader from '../../components/loader'
import HeaderNav from '../../components/header-nav'
import pinDialogComponent from '../../pages/pin'

export default {
  name: 'Send-page',
  components: {
    QrcodeStream,
    Loader,
    HeaderNav,
    pinDialogComponent
  },
  props: {
    assetId: {
      type: String,
      required: true
    },
    tokenType: {
      type: Number,
      required: false,
      default: 1
    },
    symbol: {
      type: String,
      required: false
    },
    amount: {
      type: Number,
      required: false
    },
    fixed: {
      type: Boolean,
      required: false
    },
    recipient: {
      type: String,
      required: false
    },
    image: {
      type: String,
      required: false
    }
  },
  data () {
    return {
      asset: {},
      wallet: null,
      walletType: '',

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
      sendErrors: [],
      online: true,
      pinDialogAction: '',
      leftX: 0,
      slider: 0,
      counter: 0,
      xDown: null,
      yDown: null,
      rightOffset: null,
      swiped: true,
      opacity: 0.1,
      submitStatus: false
    }
  },

  computed: {
    disableRecipientInput () {
      return this.sendData.sent || this.sendData.fixedRecipientAddress || this.scannedRecipientAddress
    },
    disableAmountInput () {
      return this.sendData.sending || this.sendData.sent || this.sendData.fixedAmount
    },
    showSlider () {
      return this.sendData.sending !== true && this.sendData.sent !== true && this.sendData.amount !== null && this.sendErrors.length === 0
    }
  },

  watch: {
    'sendData.recipientAddress': function (address) {
      let amount
      const addressParse = new URLSearchParams(address.split('?')[1])
      if (addressParse.has('amount')) {
        amount = parseFloat(addressParse.get('amount'))

        if (amount !== null) {
          this.sendData.amount = amount
          this.sendData.fixedAmount = true
          this.sendData.recipientAddress = address.split('?')[0]
          this.sendData.fixedRecipientAddress = true
        }
      }
    }
  },

  methods: {
    slideToSubmit ({ evt, ...newInfo }) {
      const vm = this
      const htmlTag = document.querySelector('.pt-animate-submit')
      const right = parseInt(document.defaultView.getComputedStyle(htmlTag).right, 10)
      if (vm.counter === 0) {
        vm.slider = parseInt(document.defaultView.getComputedStyle(htmlTag).left, 10)
        vm.leftX = Math.round(evt.changedTouches[0].screenX)
      }

      if (!newInfo.isFinal) {
        vm.counter++
        if (window.innerWidth <= (evt.changedTouches[0].clientX + 100) && right <= 90) {
          vm.swiped = false
          htmlTag.classList.add('animate-full-width')
          document.querySelector('.pt-send-text').style.opacity = 0
          vm.submitStatus = true
          setTimeout(() => {
            vm.pinDialogAction = 'VERIFY'
          }, 1000)
        } else {
          const htmlTag = document.querySelector('.pt-animate-submit')
          const newPadding = vm.slider + evt.changedTouches[0].screenX - vm.leftX

          if (newPadding >= 0) {
            htmlTag.style.left = newPadding + 'px'
            document.querySelector('.pt-send-text').style.opacity = (parseInt(document.defaultView.getComputedStyle(htmlTag).right, 10) / vm.rightOffset) - vm.opacity
            vm.opacity += 0.005
          }
        }
      } else {
        vm.counter = 0
        vm.opacity = 0.1
        const htmlTag = document.querySelector('.pt-animate-submit')
        const htmlTag2 = document.querySelector('.pt-send-text')
        if (vm.submitStatus !== true) {
          htmlTag.classList.add('animate-left')
          htmlTag2.classList.add('animate-opacity')
          setTimeout(() => {
            htmlTag.style.left = '30px'
            htmlTag2.style.opacity = '10'
            htmlTag.classList.remove('animate-left')
            htmlTag2.classList.remove('animate-opacity')
          }, 500)
        }
      }
    },

    sendTransaction (action) {
      if (action === 'send') {
        this.handleSubmit()
      } else {
        this.submitStatus = false
        this.resetSubmit()
      }
    },

    resetSubmit () {
      const htmlTag = document.querySelector('.animate-full-width')
      const htmlTag2 = document.querySelector('.pt-animate-submit')
      htmlTag.classList.add('pt-animate-submit')
      htmlTag2.classList.remove('animate-full-width')
      htmlTag2.style.left = '30px'
      this.swiped = true
      document.querySelector('.pt-send-text').style.opacity = 10
      this.pinDialogAction = ''
    },

    getAsset (id) {
      const assets = this.$store.getters['assets/getAsset'](id)
      if (assets.length > 0) {
        return assets[0]
      } else {
        return {
          id: this.assetId,
          symbol: this.symbol
        }
      }
    },
    setMaximumSendAmount () {
      this.sendData.amount = this.asset.balance
    },
    checkAddress (address) {
      if (address.indexOf('?') > -1) {
        address = address.split('?')[0]
      }
      const addressValidation = this.validateAddress(address)
      if (addressValidation.valid) {
        this.sendData.recipientAddress = addressValidation.address
        this.sendErrors = []
        return true
      } else {
        this.sendErrors.push('Invalid address')
        return false
      }
    },
    onDecode (content) {
      const valid = this.checkAddress(content)
      if (valid) {
        this.sendData.recipientAddress = content
        this.scannedRecipientAddress = true
      }
      this.scanner.show = !this.scanner.show
    },
    onInit (promise) {
      const bodyBounds = document.body.getBoundingClientRect()
      const screenWidth = bodyBounds.width
      const screenHeight = screen.height
      this.$refs.scanner.setAttribute('style', 'height: ' + screenHeight + 'px !important; width: 100% !important;')

      const leftLoc = (screenWidth - (screenWidth / 2) - 110) // 110 is half the scanner box width
      const topLoc = screenHeight * 0.3
      this.$refs.box.setAttribute('style', 'top: ' + topLoc + 'px; ' + 'left: ' + leftLoc + 'px;')
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

    closeQrScanner () {
      this.$router.push({
        path: '/'
      })
    },

    getWallet (type) {
      return this.$store.getters['global/getWallet'](type)
    },

    validateAddress (address) {
      const vm = this
      const addressObj = new Address(address)
      let addressIsValid = false
      let formattedAddress
      try {
        if (vm.walletType === 'bch') {
          if (addressObj.isLegacyAddress()) {
            addressIsValid = true
          }
          if (addressObj.isCashAddress()) {
            addressIsValid = true
          }
          if (addressObj.isMainnetCashAddress()) {
            addressIsValid = true
          } else {
            addressIsValid = false
          }
          if (addressIsValid) {
            formattedAddress = addressObj.toCashAddress(address)
          }
        }
        if (vm.walletType === 'slp') {
          if (addressObj.isLegacyAddress()) {
            // If legacy address is given, reject it as invalid SLP address
            addressIsValid = false
          } else {
            if (addressObj.isSLPAddress()) {
              addressIsValid = true
            } else {
              addressIsValid = false
            }
            if (addressObj.isMainnetSLPAddress()) {
              addressIsValid = true
            } else {
              addressIsValid = false
            }
          }
          if (addressIsValid) {
            formattedAddress = addressObj.toSLPAddress(address)
          }
        }
      } catch (err) {
        addressIsValid = false
        console.log(err)
      }
      return {
        valid: addressIsValid,
        address: formattedAddress
      }
    },

    validateAmount (amount) {
      let valid = false
      if (amount > 0) {
        valid = true
      }
      return valid
    },

    playSound (success) {
      if (success) {
        const audio = new Audio('/audio/send-success.wav')
        audio.play()
      }
    },

    getChangeAddress (walletType) {
      return this.$store.getters['global/getChangeAddress'](walletType)
    },

    handleSubmit () {
      const vm = this
      let address = this.sendData.recipientAddress
      const addressObj = new Address(address)
      const addressValidation = this.validateAddress(address)
      const addressIsValid = addressValidation.valid
      const amountIsValid = this.validateAmount(this.sendData.amount)
      if (addressIsValid && amountIsValid) {
        vm.sendData.sending = true
        if (vm.walletType === 'slp') {
          const tokenId = vm.assetId.split('slp/')[1]
          const bchWallet = vm.getWallet('bch')
          const feeFunder = {
            walletHash: bchWallet.walletHash,
            mnemonic: vm.wallet.mnemonic,
            derivationPath: bchWallet.derivationPath
          }
          address = addressObj.toSLPAddress()
          const changeAddresses = {
            bch: vm.getChangeAddress('bch'),
            slp: vm.getChangeAddress('slp')
          }
          vm.wallet.SLP.sendSlp(vm.sendData.amount, tokenId, this.tokenType, address, feeFunder, changeAddresses).then(function (result) {
            vm.sendData.sending = false
            if (result.success) {
              vm.sendData.txid = result.txid
              vm.playSound(true)
              vm.sendData.sending = false
              vm.sendData.sent = true
            } else {
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.sendErrors.push('Not enough balance to cover the send amount')
              } else if (result.error.indexOf('not enough balance in fee funder') > -1) {
                vm.sendErrors.append('Not enough BCH to cover for transaction fee')
              } else {
                vm.sendErrors.push(result.error)
              }
            }
          })
        } else if (vm.walletType === 'bch') {
          address = addressObj.toCashAddress()
          const changeAddress = vm.getChangeAddress('bch')
          vm.wallet.BCH.sendBch(vm.sendData.amount, address, changeAddress).then(function (result) {
            vm.sendData.sending = false
            if (result.success) {
              vm.sendData.txid = result.txid
              vm.playSound(true)
              vm.sendData.sending = false
              vm.sendData.sent = true
            } else {
              if (result.error.indexOf('not enough balance in sender') > -1) {
                vm.sendErrors.push('Not enough balance to cover the send amount and transaction fee')
              } else if (result.error.indexOf('has insufficient priority') > -1) {
                vm.sendErrors.push('Not enough balance to cover the transaction fee')
              } else {
                vm.sendErrors.push(result.error)
              }
            }
          })
        }
      } else {
        vm.sendData.sending = false
        if (!addressIsValid) {
          vm.sendErrors.push(`Recipient should be a valid ${vm.walletType.toUpperCase()} address`)
        }
        if (!amountIsValid) {
          vm.sendErrors.push('Send amount should be greater than zero')
        }
      }
    }
    // async tiggerRange () {
    //   if (this.$refs['swipe-submit'].value > 95) {
    //     this.pinDialogAction = 'VERIFY'
    //   }
    // },
  },

  mounted () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)

    if (vm.assetId.indexOf('slp/') > -1) {
      vm.walletType = 'slp'
    } else {
      vm.walletType = 'bch'
    }

    const sendTag = document.querySelector('.pt-animate-submit')
    // sendTag.addEventListener('touchstart', vm.handleTouchStart, false)
    // sendTag.addEventListener('touchmove', vm.handleTouchMove, false)
    // sendTag.addEventListener('touchend', vm.handleTouchEnd, false)
    vm.rightOffset = parseInt(document.defaultView.getComputedStyle(sendTag).right, 10)

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
      vm.sendData.fixedAmount = vm.fixed
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
  #slider-arrow {
    z-index: 2000 !important;
    position: fixed;
    width: 40px;
    bottom: 13px;
    left: 175px;
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
  .pt-submit-container {
    position: fixed;
    display: flex;
    align-items: center;
    height: 80px;
    width: 100%;
    bottom: 0pt;
    // background: #da53b2;
    background-image: linear-gradient(to right bottom, #3b7bf6, #a866db, #da53b2, #ef4f84);
  }
  .pt-animate-submit {
    position: absolute;
    width: 150px;
    height: 65px;
    width: 65px;
    left: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3b7bf6;
    border: 2px solid #346ddc;
    overflow: hidden;
    // border: 3px solid rgba(60, 100, 246, .5);
    -webkit-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    -moz-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    -o-transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
    transition: background 0.3s ease, left 0.3s ease, width 0.3s ease;
  }
  .pt-animate-submit .pt-arrow-right-icon {
    font-size: 38px;
  }
  .pt-check-icon {
    font-size: 28px;
  }
  .animate-left {
    left: 30px !important;
  }
  .animate-full-width {
    width: 100%;
    left: 0px !important;
    height: 100% !important;
    border: none;
    border-radius: 0px !important;
    // background: #3b7bf6;
    background: transparent;
  }
  .pt-send-text {
    position: absolute;
    right: 40px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .pt-on-process {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    left: 0;
    width: 100%;
    opacity: 0;
  }
  .pt-process-text {
    position: absolute;
    display: flex;
    align-items: center;
    height: 100%;
  }
  .animate-opacity {
    opacity: 10 !important;
  }
  .animate-process {
    opacity: 10 !important;
    -webkit-transition: all 1s ease;
    -moz-transition: all 1s ease;
    -o-transition: all 1s ease;
    transition: all 1s ease;
  }
  .pt-invisible {
    opacity: 0;
  }
</style>
