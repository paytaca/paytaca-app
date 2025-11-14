<template>
  <QrScanner
    v-model="showQrScanner"
    @decode="onScannerDecode"
  />

  <QRUploader ref="qr-upload" @detect-upload="onUploadDetect" />

  <div class="text-bow q-px-lg shards-import-container" :class="getDarkModeClass(darkMode)">
    <p class="text-center text-subtitle1">
      {{ $t('RestoreShardsDescription') }}
    </p>

    <div class="row flex items-center justify-between q-py-md">
      <p class="col-6 q-ma-xs" style="text-wrap: wrap;">
        {{ $t('ScanUploadPersonalQR') }}
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
          @click="isPersonalClicked = true, $refs['qr-upload'].$refs['q-file'].pickFiles()"
        />
      </div>
    </div>

    <div class="row flex items-center justify-between q-py-md">
      <p class="col-6 q-ma-xs" style="text-wrap: wrap;">
        {{ $t('ScanUploadForSharingQR') }}
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
          @click="isForSharingClicked = true, $refs['qr-upload'].$refs['q-file'].pickFiles()"
        />
      </div>
    </div>

    <div class="row flex flex-center q-gutter-md q-mt-xs">
      <template v-if="retrievedCodes[0] !== null">
        <qr-code
          :qr-id="0"
          :text="retrievedCodes[0]"
          color="#253933"
          :size="200"
          class="qr-div-code"
          :class="qrCodeDivClass"
        />
      </template>
      <template v-else>
        <div class="qr-placeholder-div"></div>
      </template>
      <template v-if="retrievedCodes[1] !== null">
        <qr-code
          :qr-id="1"
          :text="retrievedCodes[1]"
          color="#253933"
          :size="200"
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
        :label="$t('ClearQR')"
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import QrScanner from 'src/components/qr-scanner'
import QRUploader from 'src/components/QRUploader'

export default {
  name: 'ShardsImport',

  emits: [
    'set-seed-phrase',
    'restore-wallet'
  ],

  components: {
    QrScanner,
    QRUploader
  },

  data () {
    return {
      showQrScanner: false,
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
    async onUploadDetect (value) {
      const vm = this

      if (value) {
        vm.addData(value[0].rawValue)
      } else {
        vm.$q.notify({
          message: vm.$t('NoQRCodeFound'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }

      vm.validateQRCodes()
    },
    validateQRCodes () {
      const vm = this

      if (vm.retrievedCodes[0] && vm.retrievedCodes[1]) {
        try {
          const recovered = sss.combine([vm.retrievedCodes[0], vm.retrievedCodes[1]]).toString()
          vm.areQRCodesValid = recovered.split(' ').length === 12
          vm.qrCodeDivClass = vm.areQRCodesValid ? 'match' : 'not-match'
          vm.$emit('set-seed-phrase', recovered)
        } catch (error) {
          vm.qrCodeDivClass = 'not-match'
        }
      }

      if (vm.isPersonalClicked && vm.retrievedCodes[0] === null) {
        vm.isPersonalClicked = false
      }

      if (vm.isForSharingClicked && vm.retrievedCodes[1] === null) {
        vm.isForSharingClicked = false
      }
    },
    clearQRs () {
      const vm = this

      vm.retrievedCodes = [null, null]
      vm.areQRCodesValid = false
      vm.isPersonalClicked = false
      vm.isForSharingClicked = false
      vm.disablePersonal = false
      vm.disableForSharing = false
      vm.qrCodeDivClass = ''
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
  .shards-import-container {
    @media (max-width: 768px) {
      padding-top: 20px;
    }
  }
  
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
