<template>
  <div>
    <div v-if="isMobile" id="qr-scanner-ui" class="qrcode-scanner hide-section">
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

      <!-- Bottom scanner controls -->
      <div class="scanner-bottom-controls">
        <!-- Zoom controls — horizontal -->
        <div class="scanner-zoom-controls">
          <q-btn
            icon="remove"
            round
            dense
            color="white"
            text-color="black"
            @click="zoomOut"
          />
          <q-btn
            icon="add"
            round
            dense
            color="white"
            text-color="black"
            class="q-ml-sm"
            @click="zoomIn"
          />
        </div>

        <!-- Torch control -->
        <div class="scanner-torch-control q-ml-md">
          <q-btn
            :icon="torchOn ? 'flash_on' : 'flash_off'"
            round
            dense
            :color="torchOn ? 'yellow' : 'white'"
            text-color="black"
            @click="toggleTorch"
          />
        </div>
      </div>
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
          :constraints="cameraConstraints"
          :formats="['qr_code']"
          @detect="onScannerDecode"
          @camera-on="onScannerInit"
          @error="onCameraError"
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
      error: '',
      zoomLevel: 0,
      zoomStep: 5,
      torchOn: false
    }
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    frontCamera: {
      type: Boolean,
      default: false
    }

  },
  computed: {
    isMobile() {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    cameraConstraints () {
      return {
        facingMode: this.frontCamera ? 'user' : 'environment',
        width: { min: 640, ideal: 1920, max: 3840 },
        height: { min: 480, ideal: 1080, max: 2160 }
      }
    }
  },
  watch: {
    val () {
      this.$emit('input', this.val)
      this.$emit('update:model-value', this.val)
    },
    modelValue (bool) {
      if (this.isMobile) {
        if (bool) {
          this.prepareScanner()
        }
      } else {
        this.val = bool
      }
    }
  },
  methods: {
    async stopScan () {
      this.$emit('input', false)
      this.$emit('update:model-value', false)
      BarcodeScanner.showBackground()
      BarcodeScanner.stopScan()
      this.adjustComponentsClasslist(false)
      if (this.torchOn) {
        try { await BarcodeScanner.disableTorch() } catch (e) {}
      }
      if (this.zoomLevel > 0) {
        try { await BarcodeScanner.setZoom({ zoom: 0 }) } catch (e) {}
      }
      this.zoomLevel = 0
      this.torchOn = false

      if (this.$route?.name === 'transaction-send') this.$router.push({ path: '/send/select-asset' })
    },
    async prepareScanner () {
      const status = await this.checkPermission()
      if (status) {
        await BarcodeScanner.prepare()
        this.scanBarcode()
      } else {
        this.$emit('input', false)
      }
    },
    async scanBarcode () {
      BarcodeScanner.hideBackground()
      this.adjustComponentsClasslist(true)

      const res = await BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] })

      if (res.content) {
        BarcodeScanner.showBackground()
        this.adjustComponentsClasslist(false)
        if (this.torchOn) {
          try { await BarcodeScanner.disableTorch() } catch (e) {}
        }
        if (this.zoomLevel > 0) {
          try { await BarcodeScanner.setZoom({ zoom: 0 }) } catch (e) {}
        }
        this.zoomLevel = 0
        this.torchOn = false
        this.$emit('decode', res.content)
      } else {
        this.adjustComponentsClasslist(false)
        if (this.torchOn) {
          try { await BarcodeScanner.disableTorch() } catch (e) {}
        }
        if (this.zoomLevel > 0) {
          try { await BarcodeScanner.setZoom({ zoom: 0 }) } catch (e) {}
        }
        this.zoomLevel = 0
        this.torchOn = false
        this.$emit('input', false)
      }
    },
    async zoomIn () {
      this.zoomLevel += this.zoomStep
      try {
        await BarcodeScanner.setZoom({ zoom: this.zoomLevel })
      } catch (err) {
        console.error('Zoom in failed:', err)
      }
    },
    async zoomOut () {
      this.zoomLevel = Math.max(0, this.zoomLevel - this.zoomStep)
      try {
        await BarcodeScanner.setZoom({ zoom: this.zoomLevel })
      } catch (err) {
        console.error('Zoom out failed:', err)
      }
    },
    async toggleTorch () {
      try {
        this.torchOn = !this.torchOn
        if (this.torchOn) {
          await BarcodeScanner.enableTorch()
        } else {
          await BarcodeScanner.disableTorch()
        }
      } catch (err) {
        console.error('Toggle torch failed:', err)
        this.torchOn = false
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
      this.$emit('decode', content[0].rawValue)
    },
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

    adjustComponentsClasslist (isScanning) {
      const appContainer = document.getElementById('app-container')
      const scannerUI = document.getElementById('qr-scanner-ui')
      const registrationContainer = document.getElementById('registration-container')
      const hide = 'hide-section'
      const transparent = 'transparent-body'
      const visibilityHidden = 'visibility-hide'
      const visibilityVisible = 'visibility-visible'

      if (isScanning) {
        try {
          appContainer.classList.add(hide)
        } catch (error) {
          try {
            scannerUI.classList.add(visibilityVisible)
            registrationContainer.classList.add(visibilityHidden)
          } catch (error1) {}
        }
        document.body.classList.add(transparent)
        try {
          scannerUI.classList.remove(hide)
        } catch (error1) {}
      } else {
        try {
          appContainer.classList.remove(hide)
        } catch (error) {
          try {
            scannerUI.classList.remove(visibilityVisible)
            registrationContainer.classList.remove(visibilityHidden)
          } catch (error1) {}
        }
        document.body.classList.remove(transparent)
        try {
          scannerUI.classList.add(hide)
        } catch (error1) {}
      }
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
  background: var(--scanner-bg, lightcoral);
  z-index: 9999;
  display: flex;
}
.scanner-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin-top: max(15px, env(safe-area-inset-top, 15px));
  margin-right: 15px;
  color: var(--scanner-primary, #ef4f84);
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
.transparent-body {
  background: transparent !important;
}
.cancel-barcode-button {
  display: block !important;
}
.visibility-hide {
  visibility: hidden;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
}
.visibility-visible {
  visibility: visible;
  position: fixed !important;
}
.scanner-bottom-controls {
  position: absolute;
  bottom: max(24px, env(safe-area-inset-bottom, 24px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  z-index: 2022;
}
.scanner-zoom-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 6px 10px;
}
.scanner-torch-control {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 6px 10px;
}
</style>
