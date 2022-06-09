<template>
  <div style="position: relative !important; background-color: #ECF3F3; min-height: 100vh;" :class="{'pt-dark': darkMode}">
    <header-nav
      :title="'SEND ' + asset.symbol"
      backnavpath="/send/select-asset"
      v-if="!sendData.sent"
    ></header-nav>
    <div class="q-mt-xl">
      <div class="q-pa-md" style="padding-top: 70px;">
        <div v-if="isNFT && image && !sendData.sent" style="width: 150px; margin: 0 auto;">
          <img :src="image" width="150" />
        </div>
        <div v-if="scanner.error" class="text-center bg-red-1 text-red q-pa-lg">
          <q-icon name="error" left/>
          {{ scanner.error }}
        </div>
        <div class="row justify-center q-mt-xl" v-if="!scanner.show && sendData.recipientAddress === ''">
          <div class="col-12" style="text-align: center;">
            <q-input
              bottom-slots
              filled
              :dark="darkMode"
              v-model="manualAddress"
              :label="canUseLNS ? 'Paste address or LNS name here' : 'Paste address here'"
              @input="resolveLnsName"
            >
              <template v-slot:append>
                <q-icon name="arrow_forward_ios" style="color: #3b7bf6;" @click="!lns.loading ? checkAddress(manualAddress) : null" />
              </template>
              <q-menu v-model="lns.show" fit :no-parent-event="!isValidLNSName(manualAddress) && (!lns.name || lns.name !== manualAddress) && !lns.loading" no-focus>
                <q-item v-if="lns.loading">
                  <q-item-section class="items-center">
                    <q-spinner color="black"/>
                    <q-item-label caption>Resolving LNS name address</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-else-if="lns.address" clickable @click="useResolvedLnsName()" class="text-black">
                  <q-item-section>
                    <q-item-label :class="darkMode ? '' : 'text-black'" caption>{{ lns.name }}</q-item-label>
                    <q-item-label style="word-break:break-all;" :class="darkMode ? '' : 'text-black'">{{ lns.address }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-else :class="[darkMode ? 'pt-dark-label' : 'text-grey']">
                  <q-item-section side>
                    <q-icon name="error"/>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>
                      Unable to resolve LNS name address
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-menu>
            </q-input>
          </div>
          <div class="col-12" style="text-align: center; font-size: 15px; color: grey;">
            OR
          </div>
          <div class="col-12 q-mt-lg text-center">
            <q-btn round size="lg" class="btn-scan text-white" icon="mdi-qrcode" @click="scanner.show = !scanner.show" />
          </div>
        </div>
        <div class="row justify-center q-pt-lg" v-show="scanner.show">
          <div ref="scanner" class="q-pa-none qrcode-scanner">
            <q-btn
              icon="close"
              round
              padding="sm"
              unelevated
              class="scanner-close-btn"
              style="z-index:2022;"
              @click="closeQrScanner"
            />
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
              <q-input
                filled
                v-model="sendData.recipientAddress"
                label-slot
                :disabled="disableRecipientInput"
                :readonly="disableRecipientInput"
                :dark="darkMode"
              >
                <template v-slot:label>
                  Recipient
                  <template v-if="Boolean(sendData.lnsName) && sendData.recipientAddress === sendData._lnsAddress">
                    ({{ sendData.lnsName }})
                  </template>
                </template>
              </q-input>
            </div>
          </div>
          <div class="row" v-if="!isNFT">
            <div class="col q-mt-md">
              <q-input
                type="text"
                inputmode="tel"
                ref="amount"
                @focus="readonlyState(true)"
                @blur="readonlyState(false)"
                filled
                v-model="sendData.amount"
                label="Amount"
                :disabled="disableAmountInput"
                :readonly="disableAmountInput"
                :dark="darkMode"
              ></q-input>
              <div v-if="sendAmountMarketValue" class="text-body2 text-grey q-mt-sm q-px-sm">
                ~ {{ sendAmountMarketValue }} {{ String(selectedMarketCurrency).toUpperCase() }}
              </div>
            </div>
          </div>
          <div class="row" v-if="!isNFT">
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
          <div class="row" v-if="sendData.sending">
            <div class="col-12 text-center">
              <ProgressLoader/>
            </div>
          </div>
        </form>
      </div>

      <customKeyboard :custom-keyboard-state="customKeyboardState" v-on:addKey="setAmount" v-on:makeKeyAction="makeKeyAction" />

      <q-list v-if="showSlider" class="absolute-bottom">
        <q-slide-item left-color="blue" @left="slideToSubmit">
          <template v-slot:left>
            <div style="font-size: 15px" class="text-body1">
            <q-icon class="material-icons q-mr-md" size="lg">
              task_alt
            </q-icon>
            Security Check
            </div>
          </template>

          <q-item class="bg-grad text-white q-py-md">
            <q-item-section avatar>
              <q-icon name="mdi-chevron-double-right" size="xl" class="bg-blue" style="border-radius: 50%" />
            </q-item-section>
            <q-item-section class="text-right">
              <h5 class="q-my-sm text-grey-4">SWIPE TO SEND</h5>
            </q-item-section>
          </q-item>
        </q-slide-item>
      </q-list>

      <!--
      <div class="pt-submit-container q-pa-none" :class="[!showSlider ? 'pt-invisible' : '']">
        <p class="text-h5 q-ma-none q-pa-none text-white pt-send-text">
          Swipe to send
        </p>
        <div class="text-center pt-on-process" :class="[!swiped ? 'animate-process' : '']">
          <p class="text-h6 text-white q-my-none q-py-none pt-process-text">
            <span class="q-mr-sm" style="display: flex; align-items: center; height: 100%">{{ submitLabel }}</span>
            <span class="material-icons pt-check-icon">
              task_alt
            </span>
          </p>
        </div>
        <div class="pt-animate-submit text-white text-center" v-touch-pan.horizontal.prevent.mouse="slideToSubmit">
          <q-icon
            v-if="swiped"
            color="white"
            style="border-radius: 50%"
            name="mdi-chevron-double-right"
            size="4em"
          />
        </div>
      </div>
    -->
      <template v-if="!showSlider">
        <footer-menu v-if="!sendData.sending" />
      </template>

      <div class="row" v-if="sendErrors.length > 0">
        <div class="col">
          <ul style="margin-left: -40px; list-style: none;">
            <li v-for="(error, index) in sendErrors" :key="index" class="bg-red-1 text-red q-pa-lg pp-text">
              <q-icon name="error" left/>
              {{ error }}
            </li>
          </ul>
        </div>
      </div>
      <div class="q-px-lg" v-if="sendData.sent" style="text-align: center;">
        <q-icon size="120px" name="check_circle" color="green-5"></q-icon>
        <div style="margin-top: 20px;">
          <p :class="darkMode ? 'text-white' : 'pp-text'" style="font-size: 30px;">Successfully sent</p>
          <p :class="darkMode ? 'text-white' : 'pp-text'" style="font-size: 28px;">{{ sendData.amount }} {{ asset.symbol }}</p>
        </div>
      </div>
    </div>

    <pinDialog :pin-dialog-action="pinDialogAction" v-on:nextAction="sendTransaction" />
    <biometricWarningAttmepts :warning-attempts="warningAttemptsStatus" v-on:closeBiometricWarningAttempts="setwarningAttemptsStatus" />

  </div>
</template>

<script>
import { debounce } from 'quasar'
import { isNameLike } from '../../wallet/lns'
import { getMnemonic, Wallet, Address } from '../../wallet'
import { decodeEIP681URI } from '../../wallet/sbch'
import { QrcodeStream } from 'vue-qrcode-reader'
import ProgressLoader from '../../components/ProgressLoader'
import HeaderNav from '../../components/header-nav'
import pinDialog from '../../components/pin'
import biometricWarningAttmepts from '../../components/authOption/biometric-warning-attempt.vue'
import customKeyboard from '../../pages/transaction/dialog/CustomKeyboard.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Plugins } from '@capacitor/core'

const { SecureStoragePlugin } = Plugins

const sep20IdRegexp = /sep20\/(.*)/
const erc721IdRegexp = /erc721\/(0x[0-9a-f]{40}):(\d+)/i
const sBCHWalletType = 'SmartBCH'

export default {
  name: 'Send-page',
  components: {
    QrcodeStream,
    ProgressLoader,
    HeaderNav,
    pinDialog,
    biometricWarningAttmepts,
    customKeyboard
  },
  props: {
    network: {
      type: String,
      defualt: 'BCH'
    },
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
        lnsName: '',
        _lnsAddress: '', // in case recipient address is edited in form will check if name still matches the address
        fixedRecipientAddress: false
      },
      lns: {
        show: false,
        loading: false,
        name: '',
        address: '',
      },
      sendErrors: [],
      online: true,
      pinDialogAction: '',
      leftX: 0,
      slider: 0,
      counter: 0,
      rightOffset: null,
      swiped: true,
      opacity: 0.1,
      submitStatus: false,
      submitLabel: 'Processing',
      warningAttemptsStatus: 'dismiss',
      amountInputState: false,
      customKeyboardState: 'dismiss',
      sliderStatus: false,
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },

  computed: {
    isSep20 () {
      return this.network === 'sBCH'
    },
    isERC721 () {
      return this.isSep20 && erc721IdRegexp.test(this.assetId)
    },
    isNFT () {
      if (this.isSep20 && erc721IdRegexp.test(this.assetId)) return true

      return this.tokenType === 65
    },
    selectedAssetMarketPrice() {
      if (!this.assetId) return

      return this.$store.getters['market/getAssetPrice'](this.assetId, this.selectedMarketCurrency)
    },
    selectedMarketCurrency() {
      const currency = this.$store.getters['market/selectedCurrency']
      return currency && currency.symbol
    },
    sendAmountMarketValue() {
      const parsedAmount = Number(this.sendData.amount)
      if (!parsedAmount) return ''
      if (!this.selectedAssetMarketPrice) return ''
      const computedBalance = Number(parsedAmount || 0) * Number(this.selectedAssetMarketPrice)
      if (!computedBalance) return ''

      return computedBalance.toFixed(2)
    },
    canUseLNS() {
      if (this.isSep20) return true // if smartchain
      if (this.assetId === 'bch') return true // if not smartchain but BCH only (EIP2304 doesnt seem to support SLP addresses)

      return false
    },
    disableRecipientInput () {
      return this.sendData.sent || this.sendData.fixedRecipientAddress || this.scannedRecipientAddress
    },
    disableAmountInput () {
      return this.sendData.sending || this.sendData.sent || this.sendData.fixedAmount || this.amountInputState
    },
    showSlider () {
      return this.sendData.sending !== true && this.sendData.sent !== true && this.sendErrors.length === 0 && this.sliderStatus === true
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
          this.sliderStatus = true
        }
      }

      if (address && this.isNFT) {
        this.sliderStatus = true
      }
    }
  },

  methods: {
    isValidLNSName: isNameLike,
    readonlyState (state) {
      this.amountInputState = state
      if (this.amountInputState) {
        this.customKeyboardState = 'show'
      }
    },
    resolveLnsName: debounce(function (name) {
      if (!name) return
      if (!this.canUseLNS) return
      if (!this.isValidLNSName(name)) return

      this.lns.loading = true
      this.lns.show = true
      this.clearLnsName()
      this.$store.dispatch('lns/resolveName', { name: name, coinType: this.isSep20 ? 60 : 145 })
        .then(response => {
          if (response && response.address) {
            this.lns.name = name
            this.lns.address = response.address
            this.lns.show = true
          }
        })
        .finally(() => {
          this.lns.loading = false
        })
    }, 500),
    useResolvedLnsName () {
      if (!this.lns.address) return
      this.sendData.lnsName = this.lns.name
      this.sendData.recipientAddress = this.lns.address
      this.sendData._lnsAddress = this.lns.address
    },
    clearLnsName () {
      this.lns.name = ''
      this.lns.address = ''
    },
    setAmount (key) {
      this.sendData.amount = this.sendData.amount === null ? '' : this.sendData.amount
      if (key === '.' && this.sendData.amount === '') {
        this.sendData.amount = 0 + key
      } else {
        let amount = this.sendData.amount.toString()
        const hasPeriod = amount.indexOf('.')
        if (hasPeriod < 1) {
          if (Number(amount) === 0 && Number(key) > 0) {
            amount = key
          } else {
            // Check amount if still zero
            if (Number(amount) === 0 && Number(amount) === Number(key)) {
              amount = 0
            } else {
              amount += key.toString()
            }
          }
        } else {
          amount += key !== '.' ? key.toString() : ''
        }
        // Set the new amount
        this.sendData.amount = amount
      }
    },
    makeKeyAction (action) {
      if (action === 'backspace') {
        // Backspace
        this.sendData.amount = this.sendData.amount.slice(0, -1)
      } else if (action === 'delete') {
        // Delete
        this.sendData.amount = ''
      } else {
        // Enabled submit slider
        this.sliderStatus = true
      }
    },
    slideToSubmit ({ reset }) {
      setTimeout(() => { reset() }, 2000)
      this.executeSecurityChecking()
    },
    // slideToSubmit ({ evt, ...newInfo }) {
    //   const vm = this
    //   const htmlTag = document.querySelector('.pt-animate-submit')
    //   const right = parseInt(document.defaultView.getComputedStyle(htmlTag).right, 10)

    //   let screenX, clientX
    //   if (evt.changedTouches === undefined) {
    //     screenX = evt.screenX
    //     clientX = evt.clientX
    //   } else {
    //     screenX = evt.changedTouches[0].screenX
    //     clientX = evt.changedTouches[0].clientX
    //   }

    //   if (vm.counter === 0) {
    //     vm.slider = parseInt(document.defaultView.getComputedStyle(htmlTag).left, 10)
    //     vm.leftX = Math.round(screenX)
    //   }

    //   if (!newInfo.isFinal) {
    //     vm.counter++
    //     if (window.innerWidth <= (clientX + 100) && right <= 90) {
    //       vm.swiped = false
    //       htmlTag.classList.add('animate-full-width')
    //       document.querySelector('.pt-send-text').style.opacity = 0
    //       vm.submitLabel = 'Security check'
    //       vm.submitStatus = true
    //     } else {
    //       const htmlTag = document.querySelector('.pt-animate-submit')
    //       const newPadding = vm.slider + screenX - vm.leftX

    //       if (newPadding >= 0) {
    //         htmlTag.style.left = newPadding + 'px'
    //         document.querySelector('.pt-send-text').style.opacity = (parseInt(document.defaultView.getComputedStyle(htmlTag).right, 10) / vm.rightOffset) - vm.opacity
    //         vm.opacity += 0.005
    //       }
    //     }
    //   } else {
    //     vm.counter = 0
    //     vm.opacity = 0.1
    //     const htmlTag = document.querySelector('.pt-animate-submit')
    //     const htmlTag2 = document.querySelector('.pt-send-text')
    //     if (vm.submitStatus !== true) {
    //       htmlTag.classList.add('animate-left')
    //       htmlTag2.classList.add('animate-opacity')
    //       setTimeout(() => {
    //         htmlTag.style.left = '30px'
    //         htmlTag2.style.opacity = '10'
    //         htmlTag.classList.remove('animate-left')
    //         htmlTag2.classList.remove('animate-opacity')
    //       }, 500)
    //     } else {
    //       vm.executeSecurityChecking()
    //     }
    //   }
    // },

    executeSecurityChecking () {
      const vm = this
      SecureStoragePlugin.get({ key: 'pin' })
        .then(() => {
          setTimeout(() => {
            if (vm.$q.localStorage.getItem('preferredSecurity') === 'pin') {
              vm.pinDialogAction = 'VERIFY'
            } else {
              vm.verifyBiometric()
            }
          }, 500)
        })
        .catch(() => {
          setTimeout(() => {
            vm.verifyBiometric()
          }, 500)
        })
    },

    verifyBiometric () {
      // Authenticate using biometrics before logging the user in
      NativeBiometric.verifyIdentity({
        reason: 'For ownership verification',
        title: 'Security Authentication',
        subtitle: 'Verify your account using fingerprint.',
        description: ''
      })
        .then(() => {
          // Authentication successful
          this.submitLabel = 'Processing'
          this.customKeyboardState = 'dismiss'
          setTimeout(() => {
            this.sendTransaction('send')
          }, 1000)
        },
        (error) => {
          // Failed to authenticate
          this.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Cancel') || error.message.includes('Authentication cancelled') || error.message.includes('Fingerprint operation cancelled')) {
            this.resetSubmit()
          } else if (error.message.includes('Too many attempts. Try again later.')) {
            this.warningAttemptsStatus = 'show'
          } else {
            this.verifyBiometric()
          }
        }
        )
    },

    setwarningAttemptsStatus () {
      this.verifyBiometric()
    },

    sendTransaction (action) {
      if (action === 'send') {
        this.customKeyboardState = 'dismiss'
        this.handleSubmit()
      } else {
        this.resetSubmit()
      }
    },

    resetSubmit () {
      // const htmlTag = document.querySelector('.animate-full-width')
      // const htmlTag2 = document.querySelector('.pt-animate-submit')
      // htmlTag.classList.add('pt-animate-submit')
      // htmlTag2.classList.remove('animate-full-width')
      // htmlTag2.style.left = '30px'
      this.swiped = true
      this.submitStatus = false
      this.submitLabel = 'Processing'
      // document.querySelector('.pt-send-text').style.opacity = 10
      this.pinDialogAction = ''
    },

    getAsset (id) {
      let getter = 'assets/getAsset'
      if (this.isSep20) {
        getter = 'sep20/getAsset'
      }
      const assets = this.$store.getters[getter](id)
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
      this.sliderStatus = true
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
      console.log('Got content:', content)
      let address = content
      let amount = null
      try {
        console.log('Parsing content as eip681')
        const eip6821data = decodeEIP681URI(content)
        address = eip6821data.target_address
        amount = eip6821data.parsedValue
      } catch (err) {
        console.log('Failed to parse as eip681 uri')
        console.log(err)
      }
      const valid = this.checkAddress(address)
      if (valid) {
        this.sendData.recipientAddress = address
        this.scannedRecipientAddress = true

        if (amount !== null) {
          this.sendData.amount = amount
        }
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
        if (vm.walletType === sBCHWalletType) {
          if (addressObj.isSep20Address()) {
            addressIsValid = true
          }
          if (addressIsValid) {
            formattedAddress = addressObj.address
          }
        }
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
        if (vm.walletType === sBCHWalletType) {
          let promise = null
          if (sep20IdRegexp.test(vm.assetId)) {
            const contractAddress = vm.assetId.match(sep20IdRegexp)[1]
            promise = vm.wallet.sBCH.sendSep20Token(contractAddress, String(vm.sendData.amount), addressObj.address)
          } else if(this.isNFT && erc721IdRegexp.test(vm.assetId)) {
            console.log('sending erc721')
            const contractAddress = vm.assetId.match(erc721IdRegexp)[1]
            const tokenId = vm.assetId.match(erc721IdRegexp)[2]
            promise = vm.wallet.sBCH.sendERC721Token(contractAddress, tokenId, addressObj.address)
          } else {
            promise = vm.wallet.sBCH.sendBch(String(vm.sendData.amount), addressObj.address)
          }
          if (promise) {
            promise.then(function (result) {
              if (result.success) {
                vm.sendData.txid = result.txid
                vm.playSound(true)
                vm.sendData.sending = false
                vm.sendData.sent = true
              } else {
                if (result.error) {
                  vm.sendErrors.push(result.error)
                } else {
                  vm.sendErrors.push('Unknown error')
                }
              }
            })
          }
        } else if (vm.walletType === 'slp') {
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
                vm.sendErrors.push('Not enough BCH to cover for transaction fee')
              } else {
                vm.sendErrors.push(result.error)
              }
            }
          })
        } else if (vm.walletType === 'bch') {
          address = addressObj.toCashAddress()
          const changeAddress = vm.getChangeAddress('bch')
          console.log('jihyo')
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
  },

  mounted () {
    const vm = this
    vm.asset = vm.getAsset(vm.assetId)

    if (vm.isSep20) {
      vm.walletType = sBCHWalletType
    } else if (vm.assetId.indexOf('slp/') > -1) {
      vm.walletType = 'slp'
    } else {
      vm.walletType = 'bch'
    }

    // const sendTag = document.querySelector('.pt-animate-submit')
    // vm.rightOffset = parseInt(document.defaultView.getComputedStyle(sendTag).right, 10)

    // Load wallets
    getMnemonic().then(function (mnemonic) {
      const wallet = new Wallet(mnemonic)
      wallet.sBCH.getOrInitWallet()
        .then(() => {
          vm.wallet = wallet
        })
    })
  },

  created () {
    const vm = this
    if (vm.assetId && vm.amount && vm.recipient) {
      vm.sendData.amount = vm.amount
      vm.sendData.fixedAmount = vm.fixed
      vm.sendData.recipientAddress = vm.recipient
      vm.sendData.fixedRecipientAddress = true
      vm.scanner.show = false
      vm.sliderStatus = true
    }

    if (this.isNFT) {
      vm.sendData.amount = 1
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
  .btn-scan-dark {
    background-image: linear-gradient(to right bottom, #204589, #35538b, #813c6d, #9c3356, #a5403d);
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
  .scanner-close-btn {
    position: absolute;
    top: 0;
    right: 0;
    margin: 10px;
    color: #ef4f84;
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
    left: 20px;
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
    right: 20px;
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
