<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />

  <!-- hidden q-uploader -->
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

    <p class="q-pa-sm text-center" style="border: 3px solid orange;">
      Before uploading a screenshot containing the QR, make sure that you crop
      the image up to the red square containing the QR before uploading.
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
          :disable="disablePersonal"
          @click="showQrScanner = true, isPersonalClicked = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          :disable="disablePersonal"
          @click="triggerUpload(), isPersonalClicked = true"
        />
      </div>
    </div>

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
          :disable="disableForSharing"
          @click="showQrScanner = true, isForSharingClicked = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          :disable="disableForSharing"
          @click="triggerUpload(), isForSharingClicked = true"
        />
      </div>
    </div>

    <div class="row flex flex-center q-gutter-md q-mt-xs">
      <template v-if="retrievedCodes[0] !== null">
        <qr-code
          :text="retrievedCodes[0]"
          color="#253933"
          :size="140"
          error-level="H"
          class="qr-div-code"
          :class="qrCodeDivClass"
        />
      </template>
      <template v-else>
        <div class="qr-placeholder-div"></div>
      </template>
      <template v-if="retrievedCodes[1] !== null">
        <qr-code
          :text="retrievedCodes[1]"
          color="#253933"
          :size="140"
          error-level="H"
          class="qr-div-code"
          :class="qrCodeDivClass"
        />
      </template>
      <template v-else>
        <div class="qr-placeholder-div"></div>
      </template>
    </div>
    <!-- request another shard from us -->

    <div class="flex flex-center">
      <q-btn
        rounded
        class="q-mt-md button"
        label="Clear QR"
        @click="clearQRs"
      />
    </div>

    <q-btn
      rounded
      class="full-width q-mt-lg q-mb-md button"
      @click="$emit('restore-wallet')"
      :disable="!areQRCodesValid"
      :label="$t('RestoreWallet')"
    />
  </div>
</template>

<script>
import jsqr from 'jsqr'
import sss from 'shamirs-secret-sharing'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import QrScanner from 'src/components/qr-scanner.vue'

export default {
  name: 'ShardsImport',

  emits: [
    'set-seed-phrase',
    'restore-wallet'
  ],

  components: {
    QrScanner
  },

  data () {
    return {
      showQrScanner: false,
      fileModel: null,
      retrievedCodes: [null, null],
      areQRCodesValid: false,
      isPersonalClicked: false,
      isForSharingClicked: false,
      disablePersonal: false,
      disableForSharing: false,
      qrCodeDivClass: ''
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
      const vm = this

      vm.showQrScanner = false
      vm.addData(content)
      vm.validateQRCodes()
    },
    triggerUpload () {
      const fileUploadRef = this.$refs['file-upload']
      fileUploadRef.removeUploadedFiles()
      fileUploadRef.removeQueuedFiles()
      fileUploadRef.pickFiles()
    },
    uploadedQrImage (qrFile) {
      const vm = this
      const reader = new FileReader()
      reader.onload = () => {
        const image = new Image()
        image.onload = () => {
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = image.width
          canvas.height = image.height
          context.drawImage(image, 0, 0)
          let imageData = context.getImageData(0, 0, image.width, image.height)

          const cropCoords = vm.processUploadedQr(imageData)
          if (cropCoords) {
            context.clearRect(0, 0, image.width, image.height)
            canvas.width = cropCoords.x1 - cropCoords.x
            canvas.height = cropCoords.y1 - cropCoords.y
            context.drawImage(image, cropCoords.x, cropCoords.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
            imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          }

          const qrCode = jsqr(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })

          if (qrCode) {
            vm.addData(qrCode.data)
            vm.validateQRCodes()
          } else {
            vm.$q.notify({
              message: 'No QR code found in the uploaded image.',
              timeout: 800,
              color: 'red-9',
              icon: 'mdi-qrcode-remove'
            })
          }
        }
        image.src = reader.result
      }
      reader.readAsDataURL(qrFile[0])

      const fileUploadRef = this.$refs['file-upload']
      fileUploadRef.removeUploadedFiles()
      fileUploadRef.removeQueuedFiles()
    },
    validateQRCodes () {
      const vm = this

      if (vm.retrievedCodes[0] && vm.retrievedCodes[1]) {
        const recovered = sss.combine([vm.retrievedCodes[0], vm.retrievedCodes[1]]).toString()
        vm.areQRCodesValid = recovered.split(' ').length === 12
        vm.qrCodeDivClass = vm.areQRCodesValid ? 'match' : 'not-match'
        vm.$emit('set-seed-phrase', recovered)
      }
    },
    clearQRs () {
      this.retrievedCodes = [null, null]
      this.areQRCodesValid = false
      this.isPersonalClicked = false
      this.isForSharingClicked = false
      this.disablePersonal = false
      this.disableForSharing = false
      this.qrCodeDivClass = ''
    },
    addData (data) {
      const vm = this

      if (vm.isPersonalClicked) {
        vm.retrievedCodes[0] = data
        vm.disablePersonal = true
        vm.isPersonalClicked = false
      }

      if (vm.isForSharingClicked) {
        vm.retrievedCodes[1] = data
        vm.disableForSharing = true
        vm.isForSharingClicked = false
      }
    },
    processUploadedQr (imageData) {
      // crop qr code from the image if the image contains the red square with the QR inside
      const data = imageData.data
      let j = 1, k = 1
      let hasDetectedRedSquarePixel = false
      const startingRedSquarePixel = { x: -1, y: -1 }

      for (let i = 0; i < data.length; i += 4) {
        // rgb 237, 95, 89 color of red square
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const rThreshold = r >= 199 && r <= 237
        const gThreshold = g >= 95 && g <= 109
        const bThreshold = b >= 89 && b <= 108

        if (rThreshold && gThreshold && bThreshold && !hasDetectedRedSquarePixel) {
          hasDetectedRedSquarePixel = true
          startingRedSquarePixel.x = k
          startingRedSquarePixel.y = j
        }

        if (i / 4 / j === imageData.width) {
          j += 1
          k = 1
        }

        k++
      }

      console.log(startingRedSquarePixel)
      if (startingRedSquarePixel.x > 5 && startingRedSquarePixel.y > 5) {
        const x = startingRedSquarePixel.x + 15 // border thickness
        const y = startingRedSquarePixel.y + 4 + 45 // border thickness + space occupied by text
        const x1 = x + 225 // width of qr - border thickness - padding
        const y1 = y + 225 // height of qr - border thickness - padding

        return { x, y, x1, y1 }
      }

      return null
    }
  }
}
</script>

<style lang="scss" scoped>
  .qr-placeholder-div {
    height: 150px;
    width: 150px;
    border: 2px solid gray;
  }
  .qr-div-code {
    padding: 5px;
    border: 2px solid gray;

    &.not-match {
      border: 2px solid red;
    }

    &.match {
      border: 2px solid greenyellow;
    }
  }
</style>
