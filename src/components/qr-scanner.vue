<template>
	<QRCodeScannerUI @cancelScanner="closeScanner" />
</template>

<script>
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'
import QRCodeScannerUI from 'components/Accessories/QRCodeScannerUI.vue'

export default {
  components: { QRCodeScannerUI },
  data () {
    return {
      val: false
    }
  },
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  watch: {	
    // val () {
		// 	console.log('CANCEL SCANNER 2')
    //   this.$emit('input', this.val)
    // },
    value (bool) {
      if (bool) {
				this.prepareScanner()
			}
    }
  },
  methods: {
		closeScanner () {
			// console.log('CANCEL SCANNER 1')
			// this.val = false
			this.$emit('input', false)
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
        // console.log('QR CODE RESULT: ', res.content)
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
        const c = confirm('We need your permission to use your camera to be able to scan QR codes')
        if (!c) {
          return false
        } else {
          BarcodeScanner.openAppSettings()
        }
      }

      if (status.neverAsked) {
        // user has not been requested this permission before
        // it is advised to show the user some sort of prompt
        // this way you will not waste your only chance to ask for the permission
        const c = confirm('We need your permission to use your camera to be able to scan QR codes')
        if (!c) {
          return false
        } else {
          BarcodeScanner.openAppSettings()
        }
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
    }
  }
}
</script>

<style>
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
