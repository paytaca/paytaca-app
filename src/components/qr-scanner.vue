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
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { QrcodeStream } from 'vue-qrcode-reader'
import ScannerUI from 'components/scanner-ui/scanner.vue'

const MAX_ZOOM = 4.0
const MIN_ZOOM = 1.0
const ZOOM_STEP = 0.5

export default {
  components: { QrcodeStream, ScannerUI },
  data () {
    return {
      val: this.modelValue,
      error: '',
      zoomLevel: 1.0,
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
      return this.$q.platform.is.nativeMobile
    },
    cameraConstraints () {
      return {
        facingMode: this.frontCamera ? 'user' : 'environment',
        width: { min: 640, ideal: 1920, max: 3840 },
        height: { min: 480, ideal: 1080, max: 2160 }
      }
    },
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
      this.removeBarcodeScannerActiveClass()
      if (this.torchOn) {
        try { await BarcodeScanner.disableTorch() } catch (e) {}
      }
      if (this.$route?.name === 'transaction-send') this.$router.push({ path: '/send/select-asset' })
    },
    async prepareScanner () {
      const status = await this.checkPermission()
      if (status) {
        this.scanBarcode()
      } else {
        this.$emit('input', false)
      }
    },
    async scanBarcode () {
      this.setBarcodeScannerActiveClass()

      const listener = await BarcodeScanner.addListener('barcodeScanned', async result => {
        await listener.remove()
        this.removeBarcodeScannerActiveClass()
        await BarcodeScanner.stopScan()
        this.$emit('decode', result?.barcode?.rawValue)
      })

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] })
    },
    async applyZoom (value) {
      try {
        // Pass the calculated float scale straight to native Capawesome engine
        await BarcodeScanner.setZoomRatio({ zoomRatio: value })
      } catch (error) {
        console.error('Failed to change native hardware zoom level:', error)
      }
    },

    zoomIn () {
      if (this.zoomLevel < MAX_ZOOM) {
        this.zoomLevel = Math.min(this.zoomLevel + ZOOM_STEP, MAX_ZOOM)
        this.applyZoom(this.zoomLevel)
      }
    },

    zoomOut () {
      if (this.zoomLevel > MIN_ZOOM) {
        this.zoomLevel = Math.max(this.zoomLevel - ZOOM_STEP, MIN_ZOOM)
        this.applyZoom(this.zoomLevel)
      }
    },

    async toggleTorch () {
      if (await BarcodeScanner.isTorchAvailable()) {
        await BarcodeScanner.toggleTorch()
        const { enabled } = await BarcodeScanner.isTorchEnabled()
        this.torchOn = enabled
      }
    },

    async checkPermission () {
      const { camera } = await BarcodeScanner.checkPermissions()
      if (camera === 'granted') {
        return true
      }

      const req = await BarcodeScanner.requestPermissions()
      return req.camera === 'granted'
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

    setBarcodeScannerActiveClass () {
      const scannerUI = document.getElementById('qr-scanner-ui')

      // Teleport scannerUI to body so its fixed overlay isn't constrained inside a page/dialog stacking context
      if (scannerUI) {
        scannerUI._origParent = scannerUI.parentNode
        scannerUI._origNextSibling = scannerUI.nextSibling
        document.body.appendChild(scannerUI)
      }

      document.documentElement.classList.add('barcode-scanner-active')
      document.querySelector('body')?.classList.add('barcode-scanner-active')

      // Hide all direct children of body except the scannerUI and dialog backdrops
      Array.from(document.body.children).forEach(child => {
        if (child !== scannerUI && !child.classList.contains('q-dialog__backdrop')) {
          child._scannerWasHidden = true
          child.classList.add('hide-section')
        }
      })

      if (scannerUI) { try { scannerUI.classList.remove('hide-section') } catch (e) {} }
    },

    removeBarcodeScannerActiveClass () {
      const scannerUI = document.getElementById('qr-scanner-ui')

      // Restore all hidden body children
      document.querySelectorAll('body > .hide-section').forEach(child => {
        if (child._scannerWasHidden) {
          child.classList.remove('hide-section')
          delete child._scannerWasHidden
        }
      })

      document.querySelector('body')?.classList.remove('barcode-scanner-active')
      document.documentElement.classList.remove('barcode-scanner-active')

      // Return scannerUI to its original DOM position
      if (scannerUI && scannerUI._origParent) {
        try {
          if (scannerUI._origNextSibling) {
            scannerUI._origParent.insertBefore(scannerUI, scannerUI._origNextSibling)
          } else {
            scannerUI._origParent.appendChild(scannerUI)
          }
        } catch (e) {}
        delete scannerUI._origParent
        delete scannerUI._origNextSibling
      }

      if (scannerUI) { try { scannerUI.classList.add('hide-section') } catch (e) {} }
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
html.barcode-scanner-active,
body.barcode-scanner-active,
body.barcode-scanner-active #q-app,
body.barcode-scanner-active .q-layout,
body.barcode-scanner-active .q-page {
  background: transparent !important;
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
