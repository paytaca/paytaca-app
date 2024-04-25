<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />

  <!-- hidden q-file -->
  <q-uploader
    ref="file-upload"
    v-model="fileModel"
    accept=".jpg, .png, image/*"
    style="display: none;"
    @added="uploadedQrImage"
  />

  <div class="text-bow q-px-lg" :class="getDarkModeClass(darkMode)">
    <p class="text-center text-subtitle1">
      Restore your Paytaca wallet from the QR code of its shards
    </p>

    <div class="row flex items-center justify-between q-py-md">
      <p class="col-6 q-ma-xs" style="text-wrap: wrap;">
        Scan or upload the wallet's personal QR
      </p>
      <div class="q-gutter-md">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="mdi-qrcode"
          @click="showQrScanner = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          @click="triggerUpload"
        />
      </div>
    </div>
    <!-- TODO revisit -->
    <!-- <canvas ref="canvas" /> -->
    <div class="row flex items-center justify-between q-py-md">
      <p class="col-6 q-ma-xs" style="text-wrap: wrap;">
        Scan or upload the wallet's for sharing QR
      </p>
      <div class="q-gutter-md">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="mdi-qrcode"
          @click="showQrScanner = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          @click="triggerUpload"
        />
      </div>
    </div>

    <!-- request another shard from us -->
  </div>
</template>

<script>
import jsqr from 'jsqr'
import sss from 'shamirs-secret-sharing'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import QrScanner from 'src/components/qr-scanner.vue'

export default {
  name: 'ShardsImport',

  components: {
    QrScanner
  },

  data () {
    return {
      showQrScanner: false,
      fileModel: null,
      retrievedCodes: []
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    onScannerDecode (content) {
      this.showQrScanner = false
      console.log(content)
    },
    triggerUpload () {
      const fileUploadRef = this.$refs['file-upload']
      fileUploadRef.removeUploadedFiles()
      fileUploadRef.removeQueuedFiles()
      fileUploadRef.pickFiles()
    },
    uploadedQrImage (qrFile) {
      // console.log('file', qrFile)
      const reader = new FileReader()
      reader.onload = () => {
        const image = new Image()
        image.onload = () => {
          // console.log('image', image)
          const canvas = document.createElement('canvas')
          // const canvas = this.$refs.canvas
          const context = canvas.getContext('2d')
          canvas.width = image.width
          canvas.height = image.height
          context.drawImage(image, 0, 0)
          const imageData = context.getImageData(0, 0, image.width, image.height)
          const qrCode = jsqr(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })
          // console.log('imagedata', imageData)
          // console.log('qrCode', qrCode)

          if (qrCode) {
            // console.log('QR Code Data:', qrCode.data)
            console.log('QR code data existing.')
            if (this.retrievedCodes.length < 2) {
              this.retrievedCodes.push(qrCode.data)
            }
            // Display the QR code data in your Vue component
          } else {
            console.log('No QR Code found in the image.')
          }
        }
        image.src = reader.result
      }
      reader.readAsDataURL(qrFile[0])

      const fileUploadRef = this.$refs['file-upload']
      fileUploadRef.removeUploadedFiles()
      fileUploadRef.removeQueuedFiles()
      if (this.retrievedCodes.length === 2) {
        console.log('heree', this.retrievedCodes)
        const recovered = sss.combine([this.retrievedCodes[0], this.retrievedCodes[1]])
        console.log('recovered: ', recovered.toString())
      }
    }
  },

  watch: {
    // TODO remove
    fileModel (value) {
      console.log('uploaded file', value)
    }
  }
}
</script>
