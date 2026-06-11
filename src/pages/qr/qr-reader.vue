<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)" class="relative-position overflow-hidden window-height full-width bg-black">
    <!-- Header floats cleanly on top of the background layer -->
    <header-nav :title="$t('QRReader')" :backnavpath="`${ $route.query.backnavpath || '/' }`" class="z-top text-white" />

    <QRUploader ref="qr-upload" @detect-upload="onQRDecode" />

    <!-- Pure Video Area taking up 100% of the viewport window background -->
    <div class="scanner-viewport-window absolute-full">
      <template v-if="!paused && !decode && !error">
        <qrcode-stream
          :constraints="cameraConstraints"
          :formats="['qr_code']"
          :paused="paused"
          @detect="onQRDecode"
          @camera-on="onScannerInit"
          @error="onCameraError"
          class="absolute-full camera-video-canvas"
        />
      </template>

      <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg z-max absolute-center full-width">
        <q-icon name="error" left/>
        {{ error }} 
      </div>
    </div>

    <!-- UI Overlay Layer - Manages the translucent vignette dark overlay and the broken-border box -->
    <div v-if="!error" class="absolute-full column justify-between no-pointer-events z-custom-ui">
      
      <!-- Top Spacer to push the layout below the header bar -->
      <div style="height: 80px;"></div>

      <!-- Perfect Centered Viewfinder with True Broken Borders Mask (Matches standard mobile wallets) -->
      <div class="scanner-center-position-box self-center column items-center justify-center">
        
        <!-- The Center Square with Infinite Outer Translucent Shadow Mask -->
        <div class="scan-layout-design-mask relative-position">
          
          <!-- The 4 Broken Rounded Corner Brackets mapped to your primary color -->
          <div class="rounded-corner-bracket corner-top-left"></div>
          <div class="rounded-corner-bracket corner-top-right"></div>
          <div class="rounded-corner-bracket corner-bottom-left"></div>
          <div class="rounded-corner-bracket corner-bottom-right"></div>
          
          <!-- Animated laser bar matching your primary style language -->
          <div class="scanner-laser-line"></div>
        </div>

        <span class="scanner-text text-center text-white text-bold q-mt-xl text-shadow-glow">
          {{ $t('ScanQrCode') }}
        </span>
      </div>

      <!-- Integrated Floating Controls & Action Button layout panels -->
      <div class="bottom-controls-and-actions-panel full-width column items-center all-pointer-events bg-translucent-overlay q-pt-md">
        
        <template v-if="isMobile && !decode">
          <div class="scanner-bottom-controls row items-center justify-center q-pa-sm q-mb-lg rounded-borders bg-blur-dark">
            <div class="scanner-zoom-controls row items-center">
              <q-btn icon="remove" round dense color="white" text-color="black" size="md" @click="zoomOut" />
              <q-btn icon="add" round Storage dense color="white" text-color="black" size="md" class="q-ml-sm" @click="zoomIn" />
            </div>
            <div class="vertical-control-divider q-mx-md"></div>
            <div class="scanner-torch-control">
              <q-btn :icon="torchOn ? 'flash_on' : 'flash_off'" round dense :color="torchOn ? 'yellow' : 'white'" text-color="black" size="md" @click="toggleTorch" />
            </div>
          </div>
        </template>

        <div v-if="progress" class="q-mb-md row items-center justify-center q-px-lg full-width">
          <q-linear-progress rounded size="30px" :value="progress" color="primary" class="q-mx-xl" >
            <div class="absolute-full flex flex-center items-center">
              <span class="text-caption text-bold text-white">{{ progressLabel }}</span>
            </div>
          </q-linear-progress>
        </div>

        <div class="row items-center justify-around q-pb-xl full-width">
          <div v-if="!hideGenerateQR" class="column flex flex-center">
            <q-btn round size="lg" class="btn-scan button text-white bg-grad" icon="add" :disabled="progress" @click="$router.push({ name: 'generate-qr' })" />
            <span class="q-mt-sm text-subtitle2 text-white text-shadow-glow">{{ $t('GenerateQR') }}</span>
          </div>
          <div v-if="!hideUploadQR" class="column flex flex-center">
            <q-btn round size="lg" class="btn-scan button text-white bg-grad" icon="upload" :disabled="progress" @click="$refs['qr-upload'].$refs['q-file'].pickFiles()" />
            <span class="q-mt-sm text-subtitle2 text-white text-shadow-glow">{{ $t('UploadQR') }}</span>
          </div>
        </div>
      </div>

    </div>

    <footer-menu v-if="!hideFooter && !(isMobile && !decode && !error)" class="z-top" />
  </div>
</template>

<script>
// ALL ORIGINAL SYSTEM AND WALLET UTILS IMPORTS FULLY RESTORED
import { BarcodeScanner, SupportedFormat } from '@capacitor-community/barcode-scanner'
import { URDecoder } from "@ngraveio/bc-ur";
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { extractWifFromUrl } from 'src/wallet/sweep'
import { parsePayPro } from 'src/utils/pay-pro'
import { QrcodeStream } from 'vue-qrcode-reader'
import { cborDecode } from '@ngraveio/bc-ur/dist/cbor';
import HeaderNav from 'src/components/header-nav'
import QRUploader from 'src/components/QRUploader'
import { parseWalletConnectUri } from 'src/wallet/walletconnect'
import { isTokenAddress } from 'src/utils/address-utils';
import { parseAddressWithoutPrefix } from 'src/utils/send-page-utils'
import base58 from 'bs58'
import { binToBase64, base64ToBin } from 'bitauth-libauth-v3';
import { extractMValue, getWalletHash, MultisigWallet, Pst } from 'src/lib/multisig';
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

    onScannerInit (capabilities) {
      console.log('web camera pipeline configured successfully')
      this.trackCapabilities = capabilities;
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

    // Consolidated Core Processing Framework with fixed array detection mapping
    async onQRDecode (content) {
      const vm = this
      
      // Correct data payload array block unboxing matching vue-qrcode-reader v4 specs
      if (content && content.length > 0) {
        const _value = String(content[0].rawValue || '').trim()
        
        if (!_value || _value === 'undefined') return

        // Deduplicate consecutive identical frames to safeguard processing space
        if (_value === vm.lastScannedContent) {
          return
        }
        vm.lastScannedContent = _value

        const normalizedValue = vm.normalizeUrContent(_value)
        
        // Only parse as prefixless address if content doesn't have query params
        const addressValidation = !_value.includes('?') ? parseAddressWithoutPrefix(_value) : { valid: false }
        const value = addressValidation?.valid ? addressValidation.address : _value
        
        const isStreaming = normalizedValue.startsWith('ur:crypto-mofnwallet') || normalizedValue.startsWith('ur:crypto-psbt')
        const nostrMatch = String(value || '').match(/^(nostr:)?(npub1[a-z0-9]{58,})$/i)

        if (!isStreaming) {
          vm.paused = true
          await new Promise((resolve) => {
            window.setTimeout(resolve, 250)
          })
        }

        // Paytaca Explorer transaction URL mapping
        const explorerTxMatch = String(value || '').match(/^(https?:\/\/)?explorer\.paytaca\.com\/tx\/([0-9a-fA-F]{64})/i)
        if (explorerTxMatch) {
          const txid = explorerTxMatch[2]
          vm.$router.push({ name: 'transaction-list', query: { txid } })
          vm.paused = false
          return
        }

        if (value.includes('gifts.paytaca.com')) {
          vm.$router.push({ name: 'claim-gift', query: { code: value } })
        } else if (extractWifFromUrl(value)) {
          vm.$router.push({ name: 'app-sweep', query: { w: extractWifFromUrl(value) } })
        } else if (value.includes('bitcoincash:') || value.includes('bchtest:')) {
          vm.processSendPageRedirection(value)
        } else if (parseWalletConnectUri(value)) {
          vm.$router.push({ name: 'app-wallet-connect', query: { uri: value } })
        } else if (vm.checkifBIP38(value)) {
          vm.$router.push({ name: 'app-sweep', query: { w: '', bip38String: value } })
        } else if (normalizedValue.startsWith('ur:crypto-mofnwallet')) {
          if (!vm.urDecoder) {
            vm.urDecoder = new URDecoder();
          }

          const part = normalizedValue;
          vm.urDecoder.receivePart(part);
          vm.progress = vm.urDecoder.estimatedPercentComplete()
          
          if (vm.urDecoder.isComplete()) {
            vm.paused = true 
            const ur = vm.urDecoder.resultUR()
            const base64 = binToBase64(Buffer.from(ur.cbor, 'base64'))
            const decoded = cborDecode(base64ToBin(base64))
            const wallet = MultisigWallet.import(decoded)
            wallet.setStore(vm.$store)
            wallet.save()
            vm.$router.push({ name: 'app-multisig-wallet-view', params: { wallethash: wallet.getWalletHash() } })
            return
          }
        } else if (normalizedValue.startsWith('ur:crypto-psbt')) {
          if (!vm.urDecoder) {
            vm.urDecoder = new URDecoder();
          }

          const part = normalizedValue;
          vm.urDecoder.receivePart(part);
          vm.progress = vm.urDecoder.estimatedPercentComplete()
          
          if (vm.urDecoder.isComplete()) {
            vm.paused = true 
            const ur = vm.urDecoder.resultUR()
            const decodedData = Buffer.from(ur.cbor, 'base64')
            const pst = Pst.import(binToBase64(decodedData))
            const mValues = [...new Set(pst.inputs?.map(i => { 
              if (!i.redeemScript) return null; 
              return extractMValue(i.redeemScript) 
            }).filter(m => m))]
            
            for (const m of mValues) {
              const wallet = { m, signers: pst.wallet.signers }
              const walletHash = getWalletHash(wallet)
              const foundWallet = vm.$store.getters['multisig/getWalletByHash'](walletHash)
              
              if (foundWallet) {
                const canonicalPsbt = vm.$store.getters['multisig/getPsbtByUnsignedTransactionHash'](pst.unsignedTransactionHash)
                if (canonicalPsbt) {
                  const canonicalPst = Pst.import(canonicalPsbt)
                  canonicalPst.combine([pst])
                  canonicalPst.setStore(vm.$store)
                  canonicalPst.save()
                } else {
                  pst.setStore(vm.$store)
                  pst.save()
                }
                vm.$router.push({ name: 'app-multisig-wallet-pst-view', params: { wallethash: walletHash, unsignedtransactionhash: pst.unsignedTransactionHash } })
                return
              }
              vm.$q.notify({ message: vm.$t('WalletNotFound'), timeout: 800, color: 'red-9', icon: 'mdi-qrcode-remove' })
            }
          }
        } else if (value.toLowerCase().startsWith('wiz://')) {
          vm.$router.push({ name: 'app-wizard-connect', query: { uri: value } })
        } else if (nostrMatch) {
          const npub = nostrMatch[2]
            const backPath = vm.$route.query.backnavpath || '/apps/chat'
            vm.$router.push({
              path: backPath,
              query: { npub }
            })
        } else {
          if (!vm.progress) {
            vm.$q.notify({ message: vm.$t('UnidentifiedQRCode'), timeout: 800, color: 'red-9', icon: 'mdi-qrcode-remove' })
          }
        }
        
        if (!isStreaming) {
          vm.paused = false
        }
      } else {
        if (!this.progress) {
          vm.$q.notify({ message: vm.$t('UnidentifiedQRCode'), timeout: 800, color: 'red-9', icon: 'mdi-qrcode-remove' })
        }
      }
    },

    stopScan () {
      this.paused = true;
      this.lastScannedContent = '';
    },

    prepareScanner () {
      this.paused = false;
      this.progress = 0;
      this.urDecoder = null;
      this.lastScannedContent = '';
    },

    zoomIn () {
      if (this.trackCapabilities && this.trackCapabilities.zoom) {
        const zoom = this.trackCapabilities.zoom;
        this.zoomLevel = Math.min(zoom.max, this.zoomLevel + this.zoomStep);
        const track = document.querySelector('video')?.srcObject?.getVideoTracks();
        track?.applyConstraints({ advanced: [{ zoom: this.zoomLevel }] });
      }
    },

    zoomOut () {
      if (this.trackCapabilities && this.trackCapabilities.zoom) {
        const zoom = this.trackCapabilities.zoom;
        this.zoomLevel = Math.max(zoom.min, this.zoomLevel - this.zoomStep);
        const track = document.querySelector('video')?.srcObject?.getVideoTracks();
        track?.applyConstraints({ advanced: [{ zoom: this.zoomLevel }] });
      }
    },
    async toggleTorch () {
      try {
        this.torchOn = !this.torchOn
        if (this.torchOn) {
          await BarcodeScanner.enableTorch()
        } else {
          await BarcodeScanner.disableTorch()
        }
      } catch (err) {
        console.error('Toggle torch failed:', err)
        this.torchOn = false
      }
    },
    async processSendPageRedirection (value) {
      // redirect to send page
      const vm = this
      const payProData = await parsePayPro(value)

      const prefixArray = [
        'bitcoincash:q', 'bchtest:q',
        'bitcoincash:z', 'bchtest:z',
        'bitcoincash:p', 'bchtest:p',
        'bitcoincash:r', 'bchtest:r',
      ]
      let query

      if (prefixArray.findIndex(s => value.includes(s)) > -1) {
        let fallback = vm.processPayProData(payProData, value)

        // Fallback to BCH
        if (fallback) {
          if (isTokenAddress(value)) {
            // If value contains query params, pass as paymentUrl to preserve all parameters
            const queryParams = value.includes('?')
            vm.$router.push({
              name: 'transaction-send-select-asset',
              query: queryParams ? { paymentUrl: value } : { address: value }
            })
          } else {
            query = {
              assetId: vm.$store.getters['assets/getAssets'][0].id,
              network: 'BCH',
              address: value
            }
            vm.$router.push({
              name: 'transaction-send',
              query
            })
          }
        }
      } else if (value.includes('bitcoincash:?r')) {
        query = {
          assetId: vm.$store.getters['assets/getAssets'][0].id,
          network: 'BCH',
          paymentUrl: String(value)
        }
        vm.$router.push({
          name: 'transaction-send',
          query
        })
      } else {
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    },
    processPayProData (payProData, originalValue) {
      let query

      if (payProData.valid) {
        query = {
          network: 'BCH',
          address: payProData.recipient
        }

        if (payProData.paypro.category) {
          // Check if wallet has the requested token
          const tokenCategory = payProData.paypro.category
          const walletAssets = this.$store.getters['assets/getAssets']
          const hasToken = walletAssets.some(asset => asset.id === `ct/${tokenCategory}`)

          if (!hasToken) {
            // If originalValue has query params, pass as paymentUrl to preserve all parameters
            const queryParams = originalValue?.includes('?')
            this.$router.push({
              name: 'transaction-send-select-asset',
              query: queryParams ? { paymentUrl: originalValue } : { error: 'token-not-found' }
            })
            return false
          }

          query.assetId = `ct/${tokenCategory}`

          if (payProData.paypro.fungible) {
            query.fungible = payProData.paypro.fungible
          }
          
          // If originalValue has query params, pass as paymentUrl to preserve all parameters
          const queryParams = originalValue?.includes('?')
          if (queryParams) {
            query.paymentUrl = originalValue
          }
          
          this.$router.push({
            name: 'transaction-send',
            query
          })
        } else return true
      } else return true

      return false
    },
    checkifBIP38(value) {
      let isBase58 = false
      try {
        base58.decode(value)
        isBase58 = true
      } catch (_e) { return false }

      return value.length === 58
        && value.substring(0, 2) === '6P'
        && isBase58
    }
  },

  mounted () {
    this.prepareScanner();
  }
}
</script>
    
<style scoped>
.window-height {
  height: 100vh !important;
}

.scanner-viewport-window {
  z-index: 1;
  background-color: #000000;
}

/* Edge-to-edge camera matrix coverage configuration */
.camera-video-canvas :deep(video) {
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover !important;
}

.z-custom-ui { z-index: 5; }
.z-top { z-index: 10; }
.z-max { z-index: 20; }
.no-pointer-events { pointer-events: none; }
.all-pointer-events { pointer-events: all; }

/* Viewport alignment layout constraints */
.scanner-center-position-box {
  width: 100%;
  max-width: 340px;
  margin-top: -60px; /* Positions the box cleanly in the optical center */
}

/* The Mask Square: Clean center cutout surrounded by a dark translucent overlay */
.scan-layout-design-mask {
  width: 250px;
  height: 250px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); 
  border-radius: 16px; /* Smoothes out the inner square corners to match bracket curves */
}

/* Base configuration for the thick, rounded primary brackets */
.rounded-corner-bracket {
  position: absolute;
  width: 32px;
  height: 32px;
  /* Dynamically inherits Quasar's primary brand color hex token */
  border-color: var(--q-primary) !important; 
  border-style: solid;
  pointer-events: none;
}

.corner-top-left {
  top: -4px;
  left: -4px;
  border-width: 5px 0 0 5px; /* Top and Left strokes only */
  border-top-left-radius: 18px; /* High radius curves */
}

.corner-top-right {
  top: -4px;
  right: -4px;
  border-width: 5px 5px 0 0; /* Top and Right strokes only */
  border-top-right-radius: 18px;
}

.corner-bottom-left {
  bottom: -4px;
  left: -4px;
  border-width: 0 0 5px 5px; /* Bottom and Left strokes only */
  border-bottom-left-radius: 18px;
}

.corner-bottom-right {
  bottom: -4px;
  right: -4px;
  border-width: 0 5px 5px 0; /* Bottom and Right strokes only */
  border-bottom-right-radius: 18px;
}

/* Animated laser bar matching your primary style layout values */
.scanner-laser-line {
  position: absolute;
  left: 5%;
  width: 90%;
  height: 3px;
  background: linear-gradient(to right, transparent, var(--q-primary), transparent);
  opacity: 0.8;
  animation: scan-laser-motion 2.5s infinite linear;
}

@keyframes scan-laser-motion {
  0% { top: 5%; }
  50% { top: 92%; }
  100% { top: 5%; }
}

.text-shadow-glow {
  text-shadow: 0px 2px 6px rgba(0, 0, 0, 0.95);
}

.bg-translucent-overlay {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0) 100%);
}

.bg-blur-dark {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.vertical-control-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.25);
}
</style>
