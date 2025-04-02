<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('QRReader')" backnavpath="/" />

    <QRUploader ref="qr-upload" @detect-upload="onQRDecode" />

    <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
      <q-icon name="error" left/>
      {{ error }}
    </div>
    <template v-else>
      <qrcode-stream
        v-if="!isMobile"
        :camera="frontCamera ? 'front': 'auto'"
        :paused="paused"
        @detect="onQRDecode"
        @camera-on="onScannerInit"
        @error="onCameraError"
        class="fixed-full qr-stream"
        style="margin: auto;"
        :style="{width: clWidth}"
      />
    </template>

    <div v-if="!error" class="q-mb-lg scanner-box" ref="box">
      <div class="scan-layout-design">
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
      <span class="scanner-text text-center full-width">{{ $t('ScanQrCode') }}</span>
    </div>

    <div class="q-mt-xl row items-center justify-around">
      <div class="column flex flex-center">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="add"
          @click="$router.push({ name: 'generate-qr' })"
        />
        <span class="q-mt-sm">{{ $t('GenerateQR') }}</span>
      </div>

      <div class="column flex flex-center">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
        />
        <span class="q-mt-sm">{{ $t('UploadQR') }}</span>
      </div>
    </div>

    <footer-menu />
  </div>
</template>

<script>
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { extractWifFromUrl } from 'src/wallet/sweep'
import { parsePayPro } from 'src/utils/pay-pro'
import { QrcodeStream } from 'vue-qrcode-reader'
import HeaderNav from 'src/components/header-nav'
import LoadingWalletDialog from 'src/components/multi-wallet/LoadingWalletDialog'
import QRUploader from 'src/components/QRUploader'
import { parseWalletConnectUri } from 'src/wallet/walletconnect'
import { isTokenAddress } from 'src/utils/address-utils';
import { parseAddressWithoutPrefix } from 'src/utils/send-page-utils'
import base58 from 'bs58'

export default {
  name: 'QRReader',

  components: {
    HeaderNav,
    QrcodeStream,
    // eslint-disable-next-line vue/no-unused-components
    LoadingWalletDialog,
    QRUploader
  },

  data () {
    return {
      paused: false,
      error: '',
      frontCamera: false,
      clWidth: '0px'
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    }
  },

  methods: {
    getDarkModeClass,

    // DESKTOP
    onScannerInit (promise) {
      console.log('camera set up successfully')
    },
    onCameraError (error) {
      const vm = this
      console.log('error', error)
      if (error.name === 'NotAllowedError') {
        // user denied camera access permission
        vm.error = vm.$t('CameraPermissionErrMsg1')
      } else if (error.name === 'NotFoundError') {
        // no suitable camera device installed
        vm.error = vm.$t('CameraPermissionErrMsg2')
      } else if (error.name === 'NotSupportedError') {
        // page is not served over HTTPS (or localhost)
        vm.error = vm.$t('CameraPermissionErrMsg3')
      } else if (error.name === 'NotReadableError') {
        // maybe camera is already in use
        vm.error = vm.$t('CameraPermissionErrMsg4')
      } else if (error.name === 'OverconstrainedError') {
        vm.frontCamera = false
        // did you request the front camera although there is none?
        vm.error = vm.$t('CameraPermissionErrMsg5')
      } else if (error.name === 'StreamApiNotSupportedError') {
        // browser seems to be lacking features
        console.log(error)
      } else {
        vm.error = vm.$t('UnknownErrorOccurred') + ': ' + error.message
      }
    },

    // MOBILE
    async prepareScanner () {
      const vm = this

      const status = await vm.checkPermission()
      if (status) {
        BarcodeScanner.prepare()
        vm.scanBarcode()
      } else {
        vm.$q.notify({
          message: vm.$t('CameraPermissionDenied'),
          timeout: 800,
          color: 'red-9',
          icon: 'settings_alert'
        })
      }
    },
    async checkPermission () {
      const status = await BarcodeScanner.checkPermission({ force: false })

      if (status.granted) {
        // user granted permission
        return true
      }

      if (status.denied) {
        // user denied permission
        return false
      }

      if (status.asked) {
        // system requested the user for permission during this call
        // only possible when force set to true
        BarcodeScanner.openAppSettings()
      }

      if (status.neverAsked) {
        // user has not been requested this permission before
        // it is advised to show the user some sort of prompt
        // this way you will not waste your only chance to ask for the permission
        // const c = confirm('We need your permission to use your camera to be able to scan QR codes')
        BarcodeScanner.openAppSettings()
      }

      if (status.restricted || status.unknown) {
        // ios only
        // probably means the permission has been denied
        return false
      }

      // user has not denied permission
      // but the user also has not yet granted the permission
      // so request it
      const statusRequest = await BarcodeScanner.checkPermission({ force: true })

      if (statusRequest.asked) {
        // system requested the user for permission during this call
        // only possible when force set to true
        return statusRequest.granted
      }

      if (statusRequest.granted) {
        // the user did grant the permission now
        return true
      }

      // statusRequest.granted = true; the user did grant the permission now
      // statusRequest.granted = false; user did not grant the permission,
      // so he must have declined the request
      return statusRequest.granted
    },
    async scanBarcode () {
      const vm = this

      BarcodeScanner.hideBackground()
      document.body.classList.add('transparent-body')

      const res = await BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] })

      if (res.content) {
        BarcodeScanner.showBackground()
        BarcodeScanner.stopScan()
        document.body.classList.remove('transparent-body')
        vm.onQRDecode([{ rawValue: res.content }])
      } else {
        BarcodeScanner.stopScan()
        document.body.classList.remove('transparent-body')
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
        BarcodeScanner.prepare()
        vm.scanBarcode()
      }
    },
    stopScan () {
      BarcodeScanner.showBackground()
      BarcodeScanner.stopScan()
    },

    async onQRDecode (content) {
      const vm = this

      if (content) {
        const _value = content[0].rawValue
        const addressValidation = parseAddressWithoutPrefix(_value)
        const value = addressValidation?.valid ? addressValidation.address : _value

        vm.paused = true
        // quick timeout to allow qrcode stream cache to reset after pausing
        await new Promise((resolve) => { window.setTimeout(resolve, 250) })

        if (value.includes('gifts.paytaca.com')) {
          // redirect to gifts page
          const loadingDialog = vm.loadingDialog()
          setTimeout(() => {
            loadingDialog.hide()
          }, 700)
          vm.$router.push({
            name: 'claim-gift',
            query: { code: value }
          })
        } else if (extractWifFromUrl(value)) {
          vm.$router.push({
            name: 'app-sweep',
            query: { w: extractWifFromUrl(value) }
          })
        } else if (value.includes('bitcoincash:') || value.includes('bchtest:')) {
          vm.processSendPageRedirection(value)
        } else if (parseWalletConnectUri(value)) {
          const loadingDialog = vm.loadingDialog()
          setTimeout(() => {
            loadingDialog.hide()
          }, 700)
          vm.$router.push({
            name: 'app-wallet-connect',
            query: { uri: value }
          })
        } else if (vm.checkifBIP38(value)) {
          // redirect to sweep page for passphrase input
          vm.$router.push({
            name: 'app-sweep',
            query: { w: '', bip38String: value }
          })
        } else {
          vm.$q.notify({
            message: vm.$t('UnidentifiedQRCode'),
            timeout: 800,
            color: 'red-9',
            icon: 'mdi-qrcode-remove'
          })
        }

        vm.paused = false
      } else {
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    },

    async processSendPageRedirection (value) {
      // redirect to send page
      const vm = this
      const payProData = await parsePayPro(value)
      const loadingDialog = vm.loadingDialog()

      setTimeout(() => { loadingDialog.hide() }, 700)

      const prefixArray = [
        'bitcoincash:q', 'bchtest:q',
        'bitcoincash:z', 'bchtest:z',
        'bitcoincash:p', 'bchtest:p',
        'bitcoincash:r', 'bchtest:r',
      ]
      let query

      if (prefixArray.findIndex(s => value.includes(s)) > -1) {
        let fallback = vm.processPayProData(payProData)

        // Fallback to BCH
        if (fallback) {
          if (isTokenAddress(value)) {
            vm.$router.push({
              name: 'transaction-send-select-asset',
              query: { address: value }
            })
          } else {
            query = {
              assetId: vm.$store.getters['assets/getAssets'][0].id,
              network: 'BCH',
              address: value
            }
            vm.$router.push({
              name: 'transaction-send',
              query
            })
          }
        }
      } else if (value.includes('bitcoincash:?r')) {
        query = {
          assetId: vm.$store.getters['assets/getAssets'][0].id,
          network: 'BCH',
          paymentUrl: String(value)
        }
        vm.$router.push({
          name: 'transaction-send',
          query
        })
      } else {
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    },
    processPayProData (payProData) {
      let query

      if (payProData.valid) {
        query = {
          network: 'BCH',
          address: payProData.recipient
        }

        if (payProData.paypro.category) {
          query.assetId = `ct/${payProData.paypro.category}`

          if (payProData.paypro.fungible) {
            query.fungible = payProData.paypro.fungible
          }
          vm.$router.push({
            name: 'transaction-send',
            query
          })
        } else return true
      } else return true

      return false
    },
    checkifBIP38(value) {
      let isBase58 = false
      try {
        base58.decode(value)
        isBase58 = true
      } catch (_e) { return false }

      return value.length === 58
        && value.substring(0, 2) === '6P'
        && isBase58
    },

    loadingDialog () {
      return this.$q.dialog({
        component: LoadingWalletDialog,
        componentProps: {
          loadingText: this.$t('Redirecting')
        }
      })
    }
  },

  mounted () {
    const vm = this

    if (vm.isMobile) {
      vm.prepareScanner()
    }
    window.scan = val => vm.onQRDecode([{ rawValue: val }])

    vm.clWidth = `${document.body.clientWidth}px`
  },

  deactivated () {
    this.stopScan()
  },

  beforeUnmount () {
    this.stopScan()
  }
}
</script>

<style lang="scss" scoped>
  #qr-reader-body {
    background: transparent;
    position: relative !important;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .scanner-error-dialog {
    border-radius: 15px;
    margin-top: 20%;
    margin-bottom: 20%;
    margin-left: auto;
    margin-right: auto;
    width: 220px;
    max-width: 90vw;
  }
  .qr-stream {
    position: fixed !important;
    z-index: -1 !important;
  }
  .scanner-text {
    position: absolute;
    bottom: -30px;
    color: white;
    z-index: 1000;
  }
  .scanner-box {
    position: relative !important;
    display: flex !important;
    height: 220px !important;
    width: 220px !important;
    border-radius: 16% !important;
    box-shadow: 0px 0px 0px 1000px rgba(0, 0, 0, 0.6);
    vertical-align: middle;
    z-index: -1 !important;
    align-self: center;
    margin-left: auto;
    margin-right: auto;
    margin-top: 15vh;
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
</style>

<style lang='scss'>
  .transparent-body {
    background: transparent !important;
  }
</style>
