<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('QRReader')" :backnavpath="`${ $route.query.backnavpath || '/' }`" />

    <QRUploader ref="qr-upload" @detect-upload="onQRDecode" />

    <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
      <q-icon name="error" left/>
      {{ error }}
    </div>
    <template v-else>
      <qrcode-stream
        :constraints="cameraConstraints"
        :track="paintBoundingBox"
        :formats="['qr_code']"
        :paused="paused"
        @detect="onQRDecode"
        @camera-on="onScannerInit"
        @error="onCameraError"
        class="qr-stream"
        style="margin: auto;"
      />
    </template>

    <div v-if="!error" class="q-mb-lg scanner-box" ref="box">
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

    <!-- Mobile scanner overlay controls -->
    <template v-if="isMobile && !decode && !error">
      <div class="scanner-bottom-controls">
        <!-- Zoom controls — horizontal -->
        <div class="scanner-zoom-controls">
          <q-btn
            icon="remove"
            round
            dense
            color="white"
            text-color="black"
            @click="zoomOut"
          />
          <q-btn
            icon="add"
            round
            dense
            color="white"
            text-color="black"
            class="q-ml-sm"
            @click="zoomIn"
          />
        </div>

        <!-- Torch control -->
        <div class="scanner-torch-control q-ml-md">
          <q-btn
            :icon="torchOn ? 'flash_on' : 'flash_off'"
            round
            dense
            :color="torchOn ? 'yellow' : 'white'"
            text-color="black"
            @click="toggleTorch"
          />
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
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="add"
          :disabled="progress"
          @click="$router.push({ name: 'generate-qr' })"
        />
        <span class="q-mt-sm">{{ $t('GenerateQR') }}</span>
      </div>

      <div v-if="!hideUploadQR" class="column flex flex-center">
        <q-btn
          round
          size="lg"
          class="btn-scan button text-white bg-grad"
          icon="upload"
          :disabled="progress"
          @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
        />
        <span class="q-mt-sm">{{ $t('UploadQR') }}</span>
      </div>
    </div>
    <footer-menu v-if="!hideFooter && !(isMobile && !decode && !error)" />
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
        // width: { min: 640, ideal: 1280, max: 1920 },
        // height: { min: 480, ideal: 720, max: 1080 }
        // width: { ideal: 2560 },
        // height: { ideal: 1440 },
        // frameRate: { ideal: 30 }
        // width: { ideal: 1920 },
        // height: { ideal: 1080 },
        // frameRate: { ideal: 30 }
      }
    },
    progressLabel () {
      return (Math.floor(this.progress * 100)) + '% of Data Fragments Received'
    }
  },

  methods: {
    paintBoundingBox (detectedCodes, ctx) {
      console.log('@track detectedCodes', detectedCodes, ctx)
      for (const detectedCode of detectedCodes) {
        const { x, y, width, height } = detectedCode.boundingBox
        ctx.lineWidth = 4
        ctx.strokeStyle = '#007bff' // Match your app color
        ctx.strokeRect(x, y, width, height)
      }
    },
    getDarkModeClass,

    normalizeUrContent (value = '') {
      return String(value || '').trim().toLowerCase()
    },

    onScannerInit (capabilities) {
      console.log('@zoom onScannerInit', capabilities)
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

      const track = document.querySelector('video')?.srcObject?.getVideoTracks()[0];
      console.log('@track', track)
      console.log('@track', track.getSettings())
      console.log('@track framerate', track.getCapabilities().frameRate)
      const vm = this
      
      // Correct data payload array block unboxing matching vue-qrcode-reader v4 specs
      if (content && content.length > 0) {
        let url 
        try {
          url = new URL(String(content[0].rawValue))
        } catch {}

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
          // vm.paused = true
          // await new Promise((resolve) => {
          //   window.setTimeout(resolve, 250)
          // })

          try {
            vm.paused = true
            await new Promise(resolve => setTimeout(resolve, 250))

            // process QR here

          } finally {
            vm.paused = false
          }
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
        } else if (
          url &&
          (url.host === 'paymenthub.paytaca.com' || url.host === 'chipnet.paymenthub.paytaca.com') &&
          url.pathname.match('/plans')
        ) {
          const shortUuid = url.pathname.match('/plans/([A-Za-z0-9]+)/?')?.[1];
          vm.$router.push({ name: 'payment-hub-subscriptions-index', query: { plan: shortUuid } })
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
    getCameraTrack () {
  return document.querySelector('video')?.srcObject?.getVideoTracks?.()[0] || null
},

    zoomIn () {
  
  const track = this.getCameraTrack()
  const capabilities = track?.getCapabilities?.()

  console.log('@track', track)
  console.log('@capabilities', capabilities)
  console.log('@zoom', capabilities?.zoom)
  console.log('@settings', track?.getSettings?.())
  if (!track || !capabilities.zoom) return

  this.zoomLevel = Math.min(
    zoom.max,
    this.zoomLevel + this.zoomStep
  )

  track.applyConstraints({
    advanced: [{ zoom: this.zoomLevel }]
  }).catch(err => {
    console.log('@zoom err', err)
    console.error('Zoom in failed:', err)
  })
},

zoomOut () {
  const track = this.getCameraTrack()
  console.log('@zoom', track)
  const capabilities = track?.getCapabilities?.()
  console.log('@zoom', capabilities)
  if (!track || !capabilities.zoom) return
  this.zoomLevel = Math.max(
    zoom.min,
    this.zoomLevel - this.zoomStep
  )

  track.applyConstraints({
    advanced: [{ zoom: this.zoomLevel }]
  }).catch(err => {
    console.log('@zoom err', err)
    console.error('Zoom out failed:', err)
  })
},

async toggleTorch () {
  const track = this.getCameraTrack()
  console.log('@zoom torch track', track)
  if (!track) return

  const capabilities = track.getCapabilities?.()

  if (!capabilities?.torch) {
    console.warn('Torch is not supported by this camera')
    return
  }

  const newTorchState = !this.torchOn

  try {
    await track.applyConstraints({
      advanced: [{ torch: newTorchState }]
    })

    this.torchOn = newTorchState
  } catch (err) {
    console.error('Toggle torch failed:', err)
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

  deactivated () {
    this.stopScan()
  },

  beforeUnmount () {
    this.stopScan()
  },

  mounted () {
    this.prepareScanner();
    this.urDecoder = new URDecoder() // Extra safety net
    this.hideFooter = this.$route.query.hideFooter
    this.hideGenerateQR = this.$route.query.hideGenerateQR
    this.hideUploadQR = this.$route.query.hideUploadQR
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
  margin-bottom: 20%;
  margin-left: auto;
  margin-right: auto;
  width: 220px;
  max-width: 90vw;
}

.qr-stream {
  position: fixed !important;
  z-index: -1 !important;
}

// .qr-stream :deep(video) {
//   width: 100vw !important;
//   height: 100vh !important;
//   object-fit: cover !important;
// }

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
  margin-top: 15vh;
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
  border: 3px solid var(--scanner-border, #3b7bf6);
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
  border: 3px solid var(--scanner-border, #3b7bf6);
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
  border: 3px solid var(--scanner-border, #3b7bf6);
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
  border: 3px solid var(--scanner-border, #3b7bf6);
  border-radius: 15%;
}

.scanner-bottom-controls {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom, 24px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  z-index: 2022;
}

.scanner-zoom-controls {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 6px 10px;
}

.scanner-torch-control {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 24px;
  padding: 6px 10px;
}
</style>

<style lang='scss'>
.transparent-body {
  background: transparent !important;
}
</style>