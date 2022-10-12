<template>
  <div>
    <div v-if="$q.platform.is.mobile || $q.platform.is.android || $q.platform.is.ios" id="qr-scanner-ui" class="qrcode-scanner hide-section">
      <q-btn
        icon="close"
        rounded
        padding="xs"
        flat
        class="scanner-close-btn"
        :style="{'margin-top': $q.platform.is.ios ? '55px' : '0px'}"
        @click="stopScan"
      />
      <ScannerUI />
    </div>

    <div v-show="val && !($q.platform.is.mobile || $q.platform.is.android || $q.platform.is.ios)" class="scanner-container">
      <q-btn
        icon="close"
        rounded
        padding="xs"
        flat
        class="scanner-close-btn"
        @click="val = false"
      />
      <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
        <q-icon name="error" left/>
        {{ error }}
      </div>
      <template v-else>
        <qrcode-stream
          v-if="val"
          :camera="frontCamera ? 'front': 'auto'"
          @decode="onScannerDecode"
          @init="onScannerInit"
          :style="{
            position: 'absolute',
            inset: 0,
          }"
        />
        <ScannerUI />
      </template>
    </div>
  </div>
</template>

<script>
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'
import { QrcodeStream } from 'vue3-qrcode-reader'
import ScannerUI from 'components/scanner-ui/scanner.vue'

export default {
  components: { QrcodeStream, ScannerUI },
  data () {
    return {
      val: this.modelValue,
      error: ''
    }
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    frontCamera: {
      type: Boolean,
      defualt: false
    }

  },
  watch: {
    val () {
      this.$emit('input', this.val)
    },
    modelValue (bool) {
      if (this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios) {
        if (bool) {
          this.prepareScanner()
        }
      } else {
        this.val = bool
      }
    }
  },
  methods: {
    stopScan () {
      this.$emit('input', false)
      BarcodeScanner.showBackground()
      BarcodeScanner.stopScan()
      try {
        document.getElementById('app-container').classList.remove('hide-section')
        document.body.classList.remove('transparent-body')
        document.getElementById('qr-scanner-ui').classList.add('hide-section')
      } catch (err) {
        // console.log(err)
      }

      if (this.$router.currentRoute.path === '/send') {
        this.$router.push({ path: '/' })
      }
    },
    async prepareScanner () {
      BarcodeScanner.prepare()
      const status = await this.checkPermission()
      if (status) {
        this.scanBarcode()
      } else {
        this.$emit('input', false)
      }
    },
    async scanBarcode () {
      BarcodeScanner.hideBackground()
      const appContainer = document.getElementById('app-container')
      const scannerUI = document.getElementById('qr-scanner-ui')
      const hide = 'hide-section'
      const transparent = 'transparent-body'

      appContainer.classList.add(hide)
      document.body.classList.add(transparent)
      scannerUI.classList.remove(hide)

      const res = await BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] })

      if (res.content) {
        BarcodeScanner.showBackground()
        appContainer.classList.remove(hide)
        document.body.classList.remove(transparent)
        scannerUI.classList.add(hide)
        this.$emit('decode', res.content)
      } else {
        appContainer.classList.remove(hide)
        document.body.classList.remove(transparent)
        scannerUI.classList.add(hide)
        this.$emit('input', false)
      }
    },
    async checkPermission () {
      const status = await BarcodeScanner.checkPermission({ force: false })
      // console.log('PERMISSION STATUS: ', JSON.stringify(status))

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
      // console.log('PERMISSION STATUS 2: ', JSON.stringify(statusRequest))

      if (statusRequest.asked) {
        // system requested the user for permission during this call
        // only possible when force set to true
        if (statusRequest.granted) {
          return true
        } else {
          return false
        }
      }

      if (statusRequest.granted) {
        // the user did grant the permission now
        return true
      }

      // user did not grant the permission, so he must have declined the request
      return false
    },
    // DESKTOP
    onScannerDecode (content) {
      this.$emit('decode', content)
    },
    onScannerInit (promise) {
      promise
        .then(() => {
          this.error = ''
        })
        .catch(error => {
          if (error.name === 'NotAllowedError') {
            this.error = this.$t('CameraPermissionErrMsg1')
          } else if (error.name === 'NotFoundError') {
            this.error = this.$t('CameraPermissionErrMsg2')
          } else if (error.name === 'NotSupportedError') {
            this.error = this.$t('CameraPermissionErrMsg3')
          } else if (error.name === 'NotReadableError') {
            this.error = this.$t('CameraPermissionErrMsg4')
          } else if (error.name === 'OverconstrainedError') {
            this.frontCamera = false
            this.error = this.$t('CameraPermissionErrMsg5')
          } else {
            this.error = this.$t('UnknownErrorOccurred') + ': ' + error.message
          }
        })
    }
  },
  deactivated () {
    this.stopScan()
  },
  beforeUnmount () {
    this.stopScan()
  }
}
</script>

<style>
/* DESKTOP */
.scanner-container {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: lightcoral;
  z-index: 999;
  display: flex;
}
.scanner-container > .scanner-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px;
  color: #ef4f84;
  z-index: 2022;
}
.scanner-container > .scanner-error-dialog {
  border-radius: 15px;
  margin-top: 20%;
  margin-bottom: auto;
  margin-left: auto;
  margin-right: auto;
  width: 220px;
  max-width: 90vw;
}
/* MOBILE */
.static-container {
  position: static;
  height: 100% !important;
  width: 100% !important;
}
.hide-section {
  display: none !important;
}
.transparent-body {
  background: transparent !important;
}
.cancel-barcode-button {
  display: block !important;
}
</style>
