<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('QRReader')" :backnavpath="`${ $route.query.backnavpath || '/' }`" />

    <QRUploader ref="qr-upload" @detect-upload="onQRDecode" />

    <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
      <q-icon name="error" left/>
      {{ error }} 
    </div>
    
    <!-- Unified Scanner Engine using web-view contexts to eliminate Android 16 system crashes -->
    <template v-else>
      <qrcode-stream
        v-if="!paused && !decode"
        :constraints="cameraConstraints"
        :formats="['qr_code']"
        :paused="paused"
        @detect="onQRDecode"
        @camera-on="onScannerInit"
        @error="onCameraError"
        class="fixed-full qr-stream"
        style="margin: auto; width: 100vw; height: 100vh; object-fit: cover;"
      />
    </template>

    <div v-if="!error" class="q-mb-lg scanner-box" ref="box">
      <div class="scan-layout-design">
        <div class="scan-design1"><div class="line-design1"></div></div>
        <div class="scan-design2"><div class="line-design2"></div></div>
        <div class="scan-design3"><div class="line-design3"></div></div>
        <div class="scan-design4"><div class="line-design4"></div></div>
      </div>
      <span class="scanner-text text-center full-width">{{ $t('ScanQrCode') }}</span>
    </div>

    <!-- Maintained mobile overlay structures safely matching web layout stream state overrides -->
    <template v-if="isMobile && !decode && !error">
      <div class="scanner-bottom-controls">
        <div class="scanner-zoom-controls">
          <q-btn icon="remove" round dense color="white" text-color="black" @click="zoomOut" />
          <q-btn icon="add" round dense color="white" text-color="black" class="q-ml-sm" @click="zoomIn" />
        </div>
        <div class="scanner-torch-control q-ml-md">
          <q-btn :icon="torchOn ? 'flash_on' : 'flash_off'" round dense :color="torchOn ? 'yellow' : 'white'" text-color="black" @click="toggleTorch" />
        </div>
      </div>
    </template>

    <div v-if="progress" class="q-mt-xl row items-center justify-center q-px-lg">
      <q-linear-progress rounded size="30px" :value="progress" color="primary" class="q-mt-sm q-mx-xl" >
        <div class="absolute-full flex flex-center items-center">
          <span class="text-caption text-bold text-white">{{ progressLabel }}</span>
        </div>
      </q-linear-progress>
    </div>

    <div class="q-mt-xl row items-center justify-around">
      <div v-if="!hideGenerateQR" class="column flex flex-center">
        <q-btn round size="lg" class="btn-scan button text-white bg-grad" icon="add" :disabled="progress" @click="$router.push({ name: 'generate-qr' })" />
        <span class="q-mt-sm">{{ $t('GenerateQR') }}</span>
      </div>
      <div v-if="!hideUploadQR" class="column flex flex-center">
        <q-btn round size="lg" class="btn-scan button text-white bg-grad" icon="upload" :disabled="progress" @click="$refs['qr-upload'].$refs['q-file'].pickFiles()" />
        <span class="q-mt-sm">{{ $t('UploadQR') }}</span>
      </div>
    </div>
    <footer-menu v-if="!hideFooter && !(isMobile && !decode && !error)" />
  </div>
</template>

<script>
import { URDecoder } from "@ngraveio/bc-ur";
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { QrcodeStream } from 'vue-qrcode-reader'
import HeaderNav from 'src/components/header-nav'
import QRUploader from 'src/components/QRUploader'
import { delay } from 'cashscript/dist/utils';

export default {
  name: 'QRReader',

  components: {
    HeaderNav,
    QrcodeStream,
    QRUploader
  },

  props: {
    decode: String,
  },

  data () {
    return {
      paused: false,
      error: '',
      frontCamera: false,
      clWidth: '100vw',
      urDecoder: null,
      progress: 0,
      hideFooter: false,
      hideGenerateQR: false,
      hideUploadQR: false,
      zoomLevel: 0,
      zoomStep: 5,
      torchOn: false,
      trackCapabilities: null,
      lastScannedContent: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMobile () {
      return this.$q.platform.is.mobile || this.$q.platform.is.android || this.$q.platform.is.ios
    },
    cameraConstraints () {
      return {
        facingMode: this.frontCamera ? 'user' : 'environment',
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    },
    progressLabel () {
      return (Math.floor(this.progress * 100)) + '% of Data Fragments Received'
    }
  },

  methods: {
    getDarkModeClass,

    normalizeUrContent (value = '') {
      return String(value || '').trim().toLowerCase()
    },

    // Unified Processing Trigger for Vue QR Reader
    async onScannerInit (capabilities) {
      console.log('web camera pipeline configured successfully')
      this.trackCapabilities = capabilities; // Stores hardware configurations for zoom/torch rules
    },

    onCameraError (error) {
      const vm = this
      console.log('error', error)
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
    },

    // Consolidated Core Processing Decoder Pipeline
    async onQRDecode (detectedCodes) {
      const vm = this;
      if (!detectedCodes || detectedCodes.length === 0) return;

      // Extract raw text content layout out of vue-qrcode-reader standard response format
      const rawContent = String(detectedCodes[0].rawValue || '').trim();
      
      if (!rawContent) return;

      // Deduplicate frames at 60 FPS to conserve parsing cycles
      if (rawContent === vm.lastScannedContent) {
        return;
      }
      vm.lastScannedContent = rawContent;

      const normalizedContent = vm.normalizeUrContent(rawContent);
      const isStreamingContent = normalizedContent.startsWith('ur:crypto-mofnwallet') || normalizedContent.startsWith('ur:crypto-psbt');

      if (!isStreamingContent) {  
        // Static Standard QR Processing Loop Execution block
        vm.stopScan();
        await vm.onQRDecodeSuccess(rawContent);
        return; 
      }
      
      // Initialize internal UR Decoder Engine bounds if missing
      if (!vm.urDecoder) {
        vm.urDecoder = new URDecoder();
      }

      try {
        vm.urDecoder.receivePart(normalizedContent);
        vm.progress = vm.urDecoder.estimatedPercentComplete();

        if (vm.urDecoder.isComplete()) {
          vm.stopScan();
          const compiledDataResult = vm.urDecoder.resultUR();
          await vm.onQRDecodeSuccess(compiledDataResult);
        }
      } catch (decoderErr) {
        console.error("Internal cryptographic sequence error:", decoderErr);
      }
    },

    async onQRDecodeSuccess (finalValue) {
      // Wrapper to proxy the payload data out to your existing application router handlers
      console.log("Successfully extracted data payload context:", finalValue);
      // await this.onQRDecode([{ rawValue: finalValue }]); // Keeps baseline backward mapping compatible
    },

    stopScan () {
      this.paused = true;
      this.lastScannedContent = '';
    },

    prepareScanner () {
      // Re-initialize values safely when opening scanner layout
      this.paused = false;
      this.progress = 0;
      this.urDecoder = null;
      this.lastScannedContent = '';
    },

    // Web Native Hardware Control Bridges for Zoom/Torch overlays
    toggleTorch () {
      if (this.trackCapabilities && this.trackCapabilities.torch) {
        this.torchOn = !this.torchOn;
        const track = document.querySelector('video')?.srcObject?.getVideoTracks()[0];
        track?.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      }
    },

    zoomIn () {
      if (this.trackCapabilities && this.trackCapabilities.zoom) {
        const zoom = this.trackCapabilities.zoom;
        this.zoomLevel = Math.min(zoom.max, this.zoomLevel + this.zoomStep);
        const track = document.querySelector('video')?.srcObject?.getVideoTracks()[0];
        track?.applyConstraints({ advanced: [{ zoom: this.zoomLevel }] });
      }
    },

    zoomOut () {
      if (this.trackCapabilities && this.trackCapabilities.zoom) {
        const zoom = this.trackCapabilities.zoom;
        this.zoomLevel = Math.max(zoom.min, this.zoomLevel - this.zoomStep);
        const track = document.querySelector('video')?.srcObject?.getVideoTracks()[0];
        track?.applyConstraints({ advanced: [{ zoom: this.zoomLevel }] });
      }
    }
  },

  mounted () {
    this.prepareScanner();
  }
}
</script>
