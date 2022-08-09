<template>
  <div class="row">
    <div id="enable-scanner" class="col-12 q-px-md q-mt-md">
      <q-btn class="full-width bg-blue-9 text-white" label="Scan QR code" rounded @click="prepareScanner" />
    </div>
  </div>
</template>

<script>
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'

export default {
  data () {
    return {
      scanning: false
    }
  },
  methods: {
    async prepareScanner () {
      BarcodeScanner.prepare()
      const status = await BarcodeScanner.checkPermission()

      if (status.denied) {
        BarcodeScanner.openAppSettings()
        console.log('Settings applied...')
      } else {
        this.scanBarcode()
      }
    },
    async scanBarcode () {
      console.log('QR CODE SCANNER...')
      BarcodeScanner.hideBackground()
      this.scanning = true
      const appContainer = document.getElementById('app-container')
      const xBarcodeScanner = document.getElementById('x-barcode-scanner')
      const classname = 'hide-app-container'

      appContainer.classList.add(classname)
      document.body.classList.add('transparent-body')
      document.getElementById('q-app').classList.add('transparent-body')
      xBarcodeScanner.classList.remove(classname)

      BarcodeScanner.startScan({ targetedFormats: [SupportedFormat.QR_CODE] }).then(res => {
        console.log('QR code result: ', res.content)
        BarcodeScanner.showBackground()
        this.scanning = false
        appContainer.classList.add(classname)
        document.body.classList.remove('transparent-body')
        document.getElementById('q-app').classList.remove('transparent-body')
        xBarcodeScanner.classList.remove(classname)
      }).catch(err => {
        console.log(err)
        this.scanning = false
        appContainer.classList.add(classname)
        document.body.classList.remove('transparent-body')
        document.getElementById('q-app').classList.remove('transparent-body')
        xBarcodeScanner.classList.remove(classname)
      })
    }
  }
}
</script>

<style>
</style>
