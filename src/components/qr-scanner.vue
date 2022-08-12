<template>
  <div>
    <div v-if="$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios" id="qr-scanner-ui" class="qrcode-scanner hide-section">
      <q-btn
        icon="close"
        rounded
        padding="xs"
        flat
        class="scanner-close-btn"
        style="z-index:2022;"
        @click="stopScan"
      />
      <div class="scanner-box" ref="box">
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
        <span class="scanner-text text-center full-width">Scan QR code</span>
      </div>
    </div>
  
    <div v-show="val && !(this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios)" class="scanner-container">
      <q-btn
        icon="close"
        rounded
        padding="xs"
        flat
        class="scanner-close-btn"
        style="z-index:2022;"
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
        <div class="scanner-box" ref="box">
          <div class="scan-layout-design" v-if="val">
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
      </template>
    </div>
  </div>
</template>

<script>
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'
import { QrcodeStream } from 'vue-qrcode-reader'

export default {
  components: { QrcodeStream },
  data () {
    return {
      val: this.value,
      error: ''
    }
  },
  props: {
    value: {
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
    value (bool) {
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
      document.getElementById('app-container').classList.remove('hide-section')
      document.body.classList.remove('transparent-body')
      document.getElementById('qr-scanner-ui').classList.add('hide-section')

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
            this.error = 'Permission required to access to camera'
            // this.error = 'Hey! I need access to your camera'
          } else if (error.name === 'NotFoundError') {
            this.error = 'No camera found on this device'
            // this.error = 'Do you even have a camera on your device?'
          } else if (error.name === 'NotSupportedError') {
            this.error = 'Unable to acccess camera in non-secure context'
            // this.error = 'Seems like this page is served in non-secure context (HTTPS, localhost or file://)'
          } else if (error.name === 'NotReadableError') {
            this.error = 'Unable to access camera.'
            // this.error = 'Couldn\'t access your camera. Is it already in use?'
          } else if (error.name === 'OverconstrainedError') {
            this.frontCamera = false
            this.error = 'Constraints don\'t match any installed camera. Did you ask for the front camera although there is none?'
          } else {
            this.error = 'Unknown error: ' + error.message
          }
        })
    }
  },
  deactivated () {
    this.stopScan()
  },
  beforeDestroy () {
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

/* Scanner UI */
.hide-section {
  display: none !important;
}
.qrcode-scanner {
  position: fixed;
  top: 0px;
  right: 0px;
  width: 100% !important;
  height: 100% !important;
  background: transparent;
  display: flex;
}
.qrcode-scanner > .scanner-close-btn {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px;
  color: #ef4f84;
}
.qrcode-scanner > .scanner-error-dialog {
	border-radius: 15px;
	margin-top: 20%;
	margin-bottom: auto;
	margin-left: auto;
	margin-right: auto;
	width: 220px;
	max-width: 90vw;
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
	z-index: 2000 !important;
	align-self: center;
	margin-left: auto;
	margin-right: auto;
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
