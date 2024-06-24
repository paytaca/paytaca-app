<template>
  <q-file
    ref="q-file"
    style="display: none;"
    v-model="fileModel"
    accept="image/*"
    :model-value="null"
    @update:model-value="onUploadDetect"
  />
</template>

<script>
import { BarcodeDetector } from 'barcode-detector/pure'

export default {
  name: 'QRUploader',

  emits: [
    'detect-upload'
  ],

  data () {
    return {
      fileModel: null
    }
  },

  methods: {
    async onUploadDetect (file) {
      const vm = this

      try {
        const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] })
        await barcodeDetector.detect(file).then((detectedCode) => {
          if (detectedCode.length > 0) {
            vm.$emit('detect-upload', detectedCode)
          } else {
            vm.$emit('detect-upload', null)
          }
        })
      } catch (_error) {
        vm.$emit('detect-upload', null)
      }
    }
  }
}
</script>
