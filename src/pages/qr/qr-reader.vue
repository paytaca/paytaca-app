<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)">
    <header-nav :title="'QR Reader'" backnavpath="/" />

    <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
      <q-icon name="error" left/>
      {{ error }}
    </div>
    <template v-else>
      <qrcode-stream
        :camera="frontCamera ? 'front': 'auto'"
        @detect="onQRDecode"
        @init="onScannerInit"
        class="fixed-full qr-stream"
      />
    </template>

    <div class="q-mb-lg scanner-box" ref="box">
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
      <span class="scanner-text text-center full-width">{{ $t('ScanQrCode') }}</span>
    </div>

    <div class="q-mt-xl row items-center justify-around">
      <div class="column flex flex-center">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="add"
        />
        <span class="q-mt-sm">Generate QR</span>
      </div>

      <div class="column flex flex-center">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
        />
        <span class="q-mt-sm">Upload QR</span>
      </div>
    </div>

    <footer-menu />
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import { QrcodeStream } from 'vue-qrcode-reader'
import HeaderNav from '../../components/header-nav'

export default {
  name: 'QRReader',

  components: {
    HeaderNav,
    QrcodeStream
  },

  data () {
    return {
      showQrScanner: true,
      error: '',
      frontCamera: false
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,

    // DESKTOP
    onScannerInit (promise) {
      const vm = this

      promise
        .then(() => {
          vm.error = ''
        })
        .catch(error => {
          if (error.name === 'NotAllowedError') {
            vm.error = vm.$t('CameraPermissionErrMsg1')
          } else if (error.name === 'NotFoundError') {
            vm.error = vm.$t('CameraPermissionErrMsg2')
          } else if (error.name === 'NotSupportedError') {
            vm.error = vm.$t('CameraPermissionErrMsg3')
          } else if (error.name === 'NotReadableError') {
            vm.error = vm.$t('CameraPermissionErrMsg4')
          } else if (error.name === 'OverconstrainedError') {
            vm.frontCamera = false
            vm.error = vm.$t('CameraPermissionErrMsg5')
          } else {
            vm.error = vm.$t('UnknownErrorOccurred') + ': ' + error.message
          }
        })
    },
    // MOBILE

    onQRDecode (content) {
      const vm = this
      const value = content[0].rawValue

      // add redirection loading

      if (value.includes('gifts.paytaca.com')) {
        // redirect to gifts page
        vm.$router.push({
          name: 'claim-gift',
          query: { code: value }
        })
      } else if (value.includes('bitcoincash:zq')) {
        // redirect to send page (cashtoken)
      } else if (value.includes('bitcoincash:qq')) {
        // redirect to send page (bch)
      } else {
        vm.$q.notify({
          message: 'Unable to identify QR code.',
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  #qr-reader-body {
    background: transparent;
    position: relative !important;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
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
  .qr-stream {
    position: fixed !important;
    z-index: -1 !important;
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
    z-index: -1 !important;
    align-self: center;
    margin-left: auto;
    margin-right: auto;
    margin-top: 50px;
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
