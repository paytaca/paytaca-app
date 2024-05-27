<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />

  <qrcode-capture
    ref="qr-upload"
    capture="null"
    style="display: none;"
    @detect="onUploadDetect"
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
          :disable="disablePersonal"
          @click="showQrScanner = true, isPersonalClicked = true"
        />
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          :disable="disablePersonal"
          @click="isPersonalClicked = true, $refs['qr-upload'].$el.click()"
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
          @click="isForSharingClicked = true, $refs['qr-upload'].$el.click()"
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
import sss from 'shamirs-secret-sharing'
import { QrcodeCapture } from 'vue-qrcode-reader'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import QrScanner from 'src/components/qr-scanner.vue'

export default {
  name: 'ShardsImport',

  emits: [
    'set-seed-phrase',
    'restore-wallet'
  ],

  components: {
    QrScanner,
    QrcodeCapture
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
    onUploadDetect (detectedCode) {
      if (detectedCode.length > 0) {
        this.addData(detectedCode[0].rawValue)
        this.validateQRCodes()
      } else {
        this.$q.notify({
          message: 'No QR code found in the uploaded image.',
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    },
    validateQRCodes () {
      const vm = this

      if (vm.retrievedCodes[0] && vm.retrievedCodes[1]) {
        const recovered = sss.combine([vm.retrievedCodes[0], vm.retrievedCodes[1]]).toString()
        vm.areQRCodesValid = recovered.split(' ').length === 12
        vm.qrCodeDivClass = vm.areQRCodesValid ? 'match' : 'not-match'
        vm.$emit('set-seed-phrase', recovered)
      }

      if (vm.isPersonalClicked && vm.retrievedCodes[0] === null) {
        vm.isPersonalClicked = false
      }

      if (vm.isForSharingClicked && vm.retrievedCodes[1] === null) {
        vm.isForSharingClicked = false
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
