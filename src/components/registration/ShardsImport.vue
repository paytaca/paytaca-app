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

    <div class="row flex flex-center q-gutter-md q-mt-xs">
      <template v-if="retrievedCodes.length === 1">
        <qr-code :text="retrievedCodes[0]" color="#253933" :size="150" error-level="H" />
        <div class="qr-placeholder-div"></div>
      </template>
      <template v-else-if="retrievedCodes.length === 2">
        <qr-code :text="retrievedCodes[0]" color="#253933" :size="150" error-level="H" />
        <qr-code :text="retrievedCodes[1]" color="#253933" :size="150" error-level="H" />
      </template>
      <template v-else>
        <div class="qr-placeholder-div"></div>
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
      retrievedCodes: [],
      areQRCodesValid: false
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
      this.retrievedCodes.push(content)
      this.validateQRCodes()
    },
    triggerUpload () {
      const fileUploadRef = this.$refs['file-upload']
      fileUploadRef.removeUploadedFiles()
      fileUploadRef.removeQueuedFiles()
      fileUploadRef.pickFiles()
    },
    uploadedQrImage (qrFile) {
      const reader = new FileReader()
      reader.onload = () => {
        const image = new Image()
        image.onload = () => {
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          canvas.width = image.width
          canvas.height = image.height
          context.drawImage(image, 0, 0)
          const imageData = context.getImageData(0, 0, image.width, image.height)
          const qrCode = jsqr(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })

          if (qrCode) {
            if (this.retrievedCodes.length < 2) {
              this.retrievedCodes.push(qrCode.data)
            }
            this.validateQRCodes()
          } else {
            this.$q.notify({
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
      if (this.retrievedCodes.length === 2) {
        const recovered = sss.combine([this.retrievedCodes[0], this.retrievedCodes[1]]).toString()
        this.areQRCodesValid = recovered.split(' ').length === 12
        this.$emit('set-seed-phrase', recovered)
      }
    },
    clearQRs () {
      this.retrievedCodes = []
      this.areQRCodesValid = false
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
</style>
