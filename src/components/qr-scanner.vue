<template>
  <div>
    <div v-if="isMobile" ref="mobileScannerUI" id="qr-scanner-ui" class="qrcode-scanner hide-section">
      <q-btn
        icon="close"
        rounded
        padding="xs"
        size="25px"
        flat
        class="scanner-close-btn"
        :style="{'margin-top': $q.platform.is.ios ? '75px' : '20px'}"
        @click="stopScan"
      />
      <ScannerUI />
    </div>

    <div v-show="val && !isMobile" class="scanner-container">
      <q-btn
        icon="close"
        rounded
        size="25px"
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
import { QrcodeStream } from 'vue-qrcode-reader'
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
    },
    forceDesktopVersion: {
      type: Boolean,
      default: false,
    }

  },
  computed: {
    isMobile() {
      if (this.forceDesktopVersion) return false
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    }
  },
  watch: {
    val () {
      this.$emit('input', this.val)
      this.$emit('update:model-value', this.val)
    },
    modelValue (bool) {
      if (this.isMobile && bool) this.prepareScanner()
      this.val = bool
    }
  },
  methods: {
    async stopScan () {
      this.$emit('input', false)
      this.$emit('update:model-value', false)
      try {
        await BarcodeScanner.showBackground()
        await BarcodeScanner.stopScan()
      } catch {}
      try {
        this.$root.$el.classList.remove('root-hide-section')
        document.body.classList.remove('transparent-body')
        this.$refs.mobileScannerUI.classList.add('hide-section')
      } catch (err) {
        // console.log(err)
      }

      if (this.$route?.name === 'transaction-send') this.$router.push({ path: '/send/select-asset' })
    },
    async prepareScanner () {
      const status = await this.checkPermission()
      if (status) {
        BarcodeScanner.prepare()
        this.scanBarcode()
      } else {
        this.$emit('input', false)
        this.$emit('update:model-value', false)
      }
    },
    async scanBarcode () {
      BarcodeScanner.hideBackground()
      const rootEl = this.$root.$el
      const scannerUI = this.$refs.mobileScannerUI
      const hide = 'hide-section'
      const rootHide = 'root-hide-section'
      const transparent = 'transparent-body'

      rootEl.classList.add(rootHide)
      document.body.classList.add(transparent)
      scannerUI.classList.remove(hide)

      const res = await BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] })

      rootEl.classList.remove(rootHide)
      document.body.classList.remove(transparent)
      scannerUI.classList.add(hide)
      if (res.content) {
        BarcodeScanner.showBackground()
        this.$emit('decode', res.content)
      } else {
        this.$emit('input', false)
        this.$emit('update:model-value', false)
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
  z-index: 9999;
  display: flex;
}
.scanner-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin-right: 15px;
  color: #ef4f84;
  z-index: 2022;
}
.scanner-error-dialog {
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

.root-hide-section {
  display: unset !important;
  visibility: hidden;
}
.transparent-body {
  background: transparent !important;
}
.cancel-barcode-button {
  display: block !important;
}

</style>