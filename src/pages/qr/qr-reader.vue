<template>
  <div id="qr-reader-body" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('QRReader')" :backnavpath="`${ $route.query.backnavpath || '/' }`" />
    <QRUploader ref="qr-upload" @detect-upload="decodeQrCode" />
    <div v-if="error" class="scanner-error-dialog text-center bg-red-1 text-red q-pa-lg">
      <q-icon name="error" left/>
      {{ error }} 
    </div>
    <template v-else>
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
        <span class="scanner-text text-center full-width">
          <q-spinner-ios v-if="scannerInitializing && isMobile && !error" color="primary" size="xs" class="q-mt-sm" style="opacity: .7;"/>
          <template v-else>{{ $t('ScanQrCode') }}</template>
        </span>
      </div>
      <template v-if="!decode">
        <qrcode-stream
          v-if="!isMobile"
          :constraints="cameraConstraints"
          :formats="['qr_code']"
          :paused="paused"
          @detect="decodeQrCode"
          @camera-on="onScannerInit"
          @error="onCameraError"
          class="fixed-full qr-stream"
          style="margin: auto;"
        />
        <div v-else class="scanner-bottom-controls">
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

      <div class="q-mt-xl row items-center justify-around" style="z-index: 10">
        <div v-if="!hideGenerateQR" class="column flex flex-center">
          <q-btn
            round
            size="lg"
            class="button text-white bg-grad"
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
            class="button text-white bg-grad"
            icon="upload"
            :disabled="progress"
            @click="$refs['qr-upload'].$refs['q-file'].pickFiles()"
          />
          <span class="q-mt-sm">{{ $t('UploadQR') }}</span>
        </div>
      </div>
    </template>
    
    <footer-menu v-if="!hideFooter && !(isMobile && !decode && !error)" />
  </div>
</template>

<script>
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
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

import 'barcode-detector/polyfill'

const MAX_ZOOM = 4.0
const MIN_ZOOM = 1.0
const ZOOM_STEP = 0.5

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
      scannerInitializing: false,
      zoomLevel: 1.0,
      torchOn: false,
      lastScannedContent: ''
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    isMobile () {
      return this.$q.platform.is.nativeMobile
    },
    cameraConstraints () {
      return {
        facingMode: this.frontCamera ? 'user' : 'environment',
        width: { min: 640, ideal: 1920, max: 3840 },
        height: { min: 720, ideal: 1080, max: 2160 }
      }
    },
    progressLabel () {
      const percent = Math.floor(this.progress * 100)
      return this.$t('PercentDataFragmentsReceived', { percent }, `${percent}% of Data Fragments Received`)
    }
  },

  methods: {  

    async openMobileSettings() {
      await BarcodeScanner.openSettings()
    },

    getDarkModeClass,

    normalizeUrContent (value = '') {
      return String(value || '').trim().toLowerCase()
    },

    // DESKTOP
    onScannerInit (promise) {
      console.log('camera set up successfully')
    },
    onCameraError (error) {
      const vm = this
      console.log('error', error)
      if (error.name === 'NotAllowedError') {
        // user denied camera access permission
        vm.error = vm.$t('CameraPermissionErrMsg1')
      } else if (error.name === 'NotFoundError') {
        // no suitable camera device installed
        vm.error = vm.$t('CameraPermissionErrMsg2')
      } else if (error.name === 'NotSupportedError') {
        // page is not served over HTTPS (or localhost)
        vm.error = vm.$t('CameraPermissionErrMsg3')
      } else if (error.name === 'NotReadableError') {
        // maybe camera is already in use
        vm.error = vm.$t('CameraPermissionErrMsg4')
      } else if (error.name === 'OverconstrainedError') {
        vm.frontCamera = false
        // did you request the front camera although there is none?
        vm.error = vm.$t('CameraPermissionErrMsg5')
      } else if (error.name === 'StreamApiNotSupportedError') {
        // browser seems to be lacking features
        console.log(error)
      } else {
        vm.error = vm.$t('UnknownErrorOccurred') + ': ' + error.message
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
    },

    // mlkit methods
    async checkCameraPermission(){
      const { camera } = await BarcodeScanner.checkPermissions()
      return camera
    },

    async requestCameraPermission(){
      const { camera } = await BarcodeScanner.requestPermissions()
      return camera
    },

    setBarcodeScannerActiveClass(){
      document.querySelector('body')?.classList.add('barcode-scanner-active');
      document.documentElement.classList.add('barcode-scanner-active')
    },

    removeBarcodeScannerActiveClass() {
      document.querySelector('body')?.classList.remove('barcode-scanner-active');
      document.documentElement.classList.remove('barcode-scanner-active');
    },


    async startScanner () {
      this.scannerInitializing = true
      let cameraPermission = await this.checkCameraPermission()
      let hasPermission = cameraPermission === 'granted' || cameraPermission === 'limited'
      let cameraPermissionPersistentlyDenied = cameraPermission === 'denied'
      if (!hasPermission) {
        const requestCameraPermission = await this.requestCameraPermission()  
        hasPermission = requestCameraPermission === 'granted' || requestCameraPermission === 'limited'
        // persistently denied on android if both checkPermissions and requestPermissions are both 'denied'
        // this works on ios also, except both are immediately persistently denied if not allowed on camera settings
        cameraPermissionPersistentlyDenied = cameraPermissionPersistentlyDenied && requestCameraPermission === 'denied'
      }
      // prompt use to open settings only if persistently denied
      if (cameraPermissionPersistentlyDenied) {
        this.$q.notify({
          message: this.$t('CameraPermissionDenied'),
          timeout: 800,
          color: 'red-9',
          icon: 'settings_alert'
        }) 
        await new Promise((resolve) => {
          this.$q.dialog({
            title: this.$t('OpenSettingsForCameraPermissionDialogTitle'),
            message: this.$t('OpenSettingsForCameraPermissionPrompt'),
            ok: { label: this.$t('OpenSettings', {}, 'Open Settings'), color: 'primary', rounded: true },
            cancel: { label: this.$t('Cancel'), flat: true },
            class: `br-15 pt-card-2 text-bow ${getDarkModeClass(this.darkMode)}`,
          }).onOk(async () => {
            await BarcodeScanner.openSettings()
            resolve()
          }).onCancel(() => {
            resolve()
          })
        })
        
        const backPath = this.$route.query.backnavpath || '/'
        this.$router.push({ path: backPath })
        return 
      }

      if (hasPermission) {
        await BarcodeScanner.addListener(
          'barcodeScanned',
          async result => {
            this.decodeQrCode([{ rawValue: result?.barcode?.rawValue }])
          },
        );

        await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode]});
        this.setBarcodeScannerActiveClass()
        this.scannerInitializing = false
        return   
      } 
      
      this.scannerInitializing = false
      await this.stopScanner()
      const backPath = this.$route.query.backnavpath || '/'
      this.$router.push({ path: backPath })
      return this.$q.notify({
        message: this.$t('CameraPermissionDenied'),
        timeout: 800,
        color: 'red-9',
        icon: 'settings_alert'
      }) 
    },

    async stopScanner() {
      // Make all elements in the WebView visible again
      this.removeBarcodeScannerActiveClass()

      if (this.isMobile) {
        // Remove all listeners
        await BarcodeScanner.removeAllListeners();
        // Stop the barcode scanner
        await BarcodeScanner.stopScan();
      }
      
    },

    async decodeQrCode(content) {
      const rawValue = String(content?.[0]?.rawValue || '').trim()
      if (!rawValue || rawValue === 'undefined') return
      const normalizedValue = this.normalizeUrContent(rawValue)
      const isStreaming = normalizedValue.startsWith('ur:crypto-mofnwallet') || normalizedValue.startsWith('ur:crypto-psbt')

      if (isStreaming) {
        this.decodeAnimatedQrCode(content)
      } else {
        this.removeBarcodeScannerActiveClass()
        this.decodeStaticQrCode(content)
      }
    },

    async decodeStaticQrCode (content) {
      const vm = this
      if (!content || !content.length) {
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
        return
      }

      const rawValue = String(content[0]?.rawValue || '').trim()

      let url
      try {
        url = new URL(rawValue)
      } catch {}

      // Only parse as prefixless address if content doesn't have query params
      // Query params indicate BIP21 URI that needs full parsing
      const addressValidation = !rawValue.includes('?') ? parseAddressWithoutPrefix(rawValue) : { valid: false }
      const value = addressValidation?.valid ? addressValidation.address : rawValue

      // Paytaca Explorer transaction URL (extract txid)
      // Example: https://explorer.paytaca.com/tx/<txid>
      const explorerTxMatch = String(value || '').match(/^(https?:\/\/)?explorer\.paytaca\.com\/tx\/([0-9a-fA-F]{64})/i)
      if (explorerTxMatch) {
        const txid = explorerTxMatch[2]
        vm.$router.push({
          name: 'transaction-list',
          query: { txid }
        })
        vm.paused = false
        return
      }

      if (value.includes('gifts.paytaca.com')) {
        // redirect to gifts page
        vm.$router.push({
          name: 'claim-gift',
          query: { code: value }
        })
        return
      }

      if (extractWifFromUrl(value)) {
        vm.$router.push({
          name: 'app-sweep',
          query: { w: extractWifFromUrl(value) }
        })
        return
      }

      if (value.includes('bitcoincash:') || value.includes('bchtest:')) {
        vm.processSendPageRedirection(value)
        return
      }

      if (parseWalletConnectUri(value)) {
        vm.$router.push({
          name: 'app-wallet-connect',
          query: { uri: value }
        })
        return
      }

      if (vm.checkifBIP38(value)) {
        // redirect to sweep page for passphrase input
        vm.$router.push({
          name: 'app-sweep',
          query: { w: '', bip38String: value }
        })
        return
      }

      if (value.toLowerCase().startsWith('wiz://')) {
        vm.$router.push({
          name: 'app-wizard-connect',
          query: { uri: value }
        })
        return
      }

      if (
        url &&
        (url.host === 'paymenthub.paytaca.com' || url.host === 'chipnet.paymenthub.paytaca.com') &&
        url.pathname.match('/plans')
      ) {
        const shortUuid = url.pathname.match('/plans/([A-Za-z0-9]+)/?')?.[1];
        vm.$router.push({ name: 'payment-hub-subscriptions-index', query: { plan: shortUuid } })
        return
      }

      // Check for Nostr / npub QR codes
      const nostrMatch = String(value || '').match(/^(nostr:)?(npub1[a-z0-9]{58,})$/i)
      if (nostrMatch) {
        const npub = nostrMatch[2]
        const backPath = vm.$route.query.backnavpath || '/apps/chat'
        vm.$router.push({
          path: backPath,
          query: { npub }
        })
        return
      }

      if (!vm.progress) {
        vm.$q.notify({
          message: vm.$t('UnidentifiedQRCode'),
          timeout: 800,
          color: 'red-9',
          icon: 'mdi-qrcode-remove'
        })
      }
    },

    async decodeAnimatedQrCode(content) {
      if (!this.urDecoder) {
        this.urDecoder = new URDecoder()
      }
      const normalizedValue = String(content[0]?.rawValue || '').trim().toLowerCase()

      this.progress = this.urDecoder.estimatedPercentComplete()

      let resultUR = null

      if (!this.urDecoder.isComplete()) {
        if (normalizedValue && normalizedValue === this.lastScannedContent) return 
        this.urDecoder.receivePart(normalizedValue)
        this.lastScannedContent = normalizedValue
      } else {
        this.paused = true 
        resultUR = this.urDecoder.resultUR()
        await this.stopScanner()
      }

      if (normalizedValue.startsWith('ur:crypto-mofnwallet') && resultUR) {
        const base64 = binToBase64(Buffer.from(resultUR.cbor, 'base64'))
        const decoded = cborDecode(base64ToBin(base64))
        const wallet = MultisigWallet.import(decoded)
        
        wallet.setStore(this.$store)
        wallet.save()
        
        this.$router.push({
          name: 'app-multisig-wallet-view',
          params: { wallethash: wallet.getWalletHash() }
        })
      }

      if (normalizedValue.startsWith('ur:crypto-psbt') && resultUR) {
        const decodedData = Buffer.from(resultUR.cbor, 'base64')
          const pst = Pst.import(binToBase64(decodedData))
          const mValues = [...new Set(pst.inputs?.map(i => {
            if (!i.redeemScript) return null;
            return extractMValue(i.redeemScript)
          }).filter(m => m))]

          for (const m of mValues) {
            const wallet = {
              m,
              signers: pst.wallet.signers
            }
            const walletHash = getWalletHash(wallet)
            const foundWallet = this.$store.getters['multisig/getWalletByHash'](walletHash)
            if (foundWallet) {
              const canonicalPsbt = this.$store.getters['multisig/getPsbtByUnsignedTransactionHash'](pst.unsignedTransactionHash)
              if (canonicalPsbt) {
                const canonicalPst = Pst.import(canonicalPsbt)
                canonicalPst.combine([pst])
                canonicalPst.setStore(this.$store)
                canonicalPst.save()
              } else {
                pst.setStore(this.$store)
                pst.save()
              }                
              this.$router.push({
                name: 'app-multisig-wallet-pst-view',
                params: { 
                  wallethash: walletHash,
                  unsignedtransactionhash: pst.unsignedTransactionHash 
                }
              })
              return
            }

            this.$q.notify({
              message: this.$t('WalletNotFound'),
              timeout: 800,
              color: 'red-9',
              icon: 'mdi-qrcode-remove'
            })
          }
      }
    },

    async applyZoom(value){
      try {
       // Pass the calculated float scale straight to native Capawesome engine
        await BarcodeScanner.setZoomRatio({ zoomRatio: value })
      } catch (error) {
        console.error('Failed to change native hardware zoom level:', error)
      }
    },

    zoomIn() {
      if (this.zoomLevel < MAX_ZOOM) {
        this.zoomLevel = Math.min(this.zoomLevel + ZOOM_STEP, MAX_ZOOM)
        this.applyZoom(this.zoomLevel)
      }
    },

    zoomOut() {
      if (this.zoomLevel > MIN_ZOOM) {
        this.zoomLevel = Math.max(this.zoomLevel - ZOOM_STEP, MIN_ZOOM)
        this.applyZoom(this.zoomLevel)
      }
    },

    async toggleTorch(){
      if (await BarcodeScanner.isTorchAvailable()) {
        await BarcodeScanner.toggleTorch()
        const { enabled } = await BarcodeScanner.isTorchEnabled()
        this.torchOn = enabled
      }
    } 
  },

  created() {
    if (!this.isMobile) {
      this.setBarcodeScannerActiveClass()
    }
  },

  async mounted () {
    this.hideFooter = this.$route.query.hideFooter
    this.hideGenerateQR = this.$route.query.hideGenerateQR
    this.hideUploadQR = this.$route.query.hideUploadQR

    if (this.decode) {
      return await this.decodeQrCode([{ rawValue: this.decode }])
    }

    if (this.isMobile) {
      await this.startScanner()
    }
    
  },

  deactivated () {
    if (this.isMobile) {
      this.scannerInitializing = true
    }
    this.stopScanner()
  },

  beforeUnmount () {
    if (this.isMobile) {
      this.scannerInitializing = true
    }
    this.stopScanner()
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
    z-index: -2 !important
  }

  .qr-stream :deep(video) {
    object-fit: cover;
    height: 100%;
    width: 100%;
  }

  .scanner-text {
    position: absolute;
    bottom: -30px;
    color: white;
  }

  .scanner-box {
    position: relative !important;
    display: flex !important;
    height: 220px !important;
    width: 220px !important;
    border-radius: 16% !important;
    box-shadow: 0px 0px 0px 1000px rgba(0, 0, 0, 0.6);
    vertical-align: middle;
    align-self: center;
    margin-left: auto;
    margin-right: auto;
    margin-top: 15vh;
    z-index: -1 !important;
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
  html.barcode-scanner-active,
  body.barcode-scanner-active,
  body.barcode-scanner-active #q-app,
  body.barcode-scanner-active .q-layout,
  body.barcode-scanner-active .q-page {
    background: transparent !important;
  }
</style>