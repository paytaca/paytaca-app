<template>
  <div id="app-container" class="shards-view-container sticky-header-container text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('SeedPhraseShards')" backnavpath="/apps/settings" class="header-nav apps-header" />

    <div class="content-wrapper" :style="{ 'margin-top': $q.platform.is.ios ? '0px' : '-30px'}">
      <!-- Loading/Authentication State -->
      <div v-if="!authenticated" class="text-center q-py-xl">
        <q-spinner-dots size="50px" color="primary" />
        <div class="q-mt-md">{{ $t('Authenticating', {}, 'Authenticating') }}...</div>
      </div>

      <!-- Content (shown after authentication) -->
      <template v-else>
        <!-- Info Banner -->
        <div class="info-banner q-mx-lg q-mt-xl q-mb-lg">
          <div class="info-content pt-card" :class="getDarkModeClass(darkMode)">
            <div class="row items-start">
              <q-icon name="info" size="32px" class="info-icon" color="primary" />
              <div class="col q-ml-md">
                <div class="info-title text-weight-bold">{{ $t('ShardsExplanation', {}, 'Shamir\'s Secret Sharing') }}</div>
                <div class="info-text">
                  {{ $t('ShardsExplanationText', {}, 'Using Shamir\'s Secret Sharing Algorithm, your seed phrase is split into 3 shards. Any 2 of the 3 shards can be used to recover your seed phrase. This enhances security by distributing the backup across multiple locations.') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shards Display -->
        <div class="shards-section q-px-lg">
          <div v-if="!isLoading && shards.length > 0">
          <!-- Shard 1 -->
          <div class="shard-accordion-item q-mb-md">
            <div 
              class="shard-header pt-card clickable"
              :class="[getDarkModeClass(darkMode), { 'expanded': expandedShard === 0 }]"
              @click="toggleShard(0)"
            >
              <div class="row items-center no-wrap">
                <div class="shard-number bg-grad">1</div>
                <div class="col q-ml-md">
                  <div class="shard-title">{{ $t('FirstShard', {}, 'First Shard') }}</div>
                  <div class="shard-subtitle">{{ $t('ViewShards1stShardDescription', {}, 'Print, laminate, and store in a safe place') }}</div>
                </div>
                <q-icon 
                  :name="expandedShard === 0 ? 'expand_less' : 'expand_more'" 
                  size="28px"
                />
              </div>
            </div>
            <q-slide-transition>
              <div v-show="expandedShard === 0" class="shard-content pt-card-2" :class="getDarkModeClass(darkMode)">
                <div class="qr-code-container" :id="`qr-shard-0`">
                  <div class="col q-pl-sm q-pr-sm">
                    <div class="row text-center justify-center">
                      <div class="col-auto q-pt-md">
                        <qr-code :qr-id="1" :text="shards[0]" :size="200" class="q-mb-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Action Buttons Below QR -->
                <div class="qr-action-buttons">
                  <q-btn
                    unelevated
                    no-caps
                    :label="$t('SaveQR', {}, 'Save QR')"
                    icon="download"
                    color="primary"
                    class="action-btn"
                    @click="downloadQR(0)"
                  />
                  <q-btn
                    unelevated
                    no-caps
                    :label="showRawText[0] ? $t('HideText', {}, 'Hide Text') : $t('ShowText', {}, 'Show Text')"
                    :icon="showRawText[0] ? 'visibility_off' : 'visibility'"
                    color="primary"
                    class="action-btn"
                    @click="toggleRawText(0)"
                  />
                </div>

                <!-- Raw Text (toggleable) -->
                <q-slide-transition>
                  <div v-show="showRawText[0]">
                    <div class="shard-text-container">
                      <div class="shard-text">{{ shards[0] }}</div>
                    </div>
                    <div class="copy-button-wrapper">
                      <q-btn
                        flat
                        no-caps
                        :label="$t('Copy', {}, 'Copy')"
                        icon="content_copy"
                        color="primary"
                        @click="copyToClipboard(shards[0])"
                      />
                    </div>
                  </div>
                </q-slide-transition>
              </div>
            </q-slide-transition>
          </div>

          <!-- Shard 2 -->
          <div class="shard-accordion-item q-mb-md">
            <div 
              class="shard-header pt-card clickable"
              :class="[getDarkModeClass(darkMode), { 'expanded': expandedShard === 1 }]"
              @click="toggleShard(1)"
            >
              <div class="row items-center no-wrap">
                <div class="shard-number bg-grad">2</div>
                <div class="col q-ml-md">
                  <div class="shard-title">{{ $t('SecondShard', {}, 'Second Shard') }}</div>
                  <div class="shard-subtitle">{{ $t('ViewShards2ndShardDescription', {}, 'Print this out and store somewhere safe') }}</div>
                </div>
                <q-icon 
                  :name="expandedShard === 1 ? 'expand_less' : 'expand_more'" 
                  size="28px"
                />
              </div>
            </div>
            <q-slide-transition>
              <div v-show="expandedShard === 1" class="shard-content pt-card-2" :class="getDarkModeClass(darkMode)">
                <div class="qr-code-container" :id="`qr-shard-1`">
                  <div class="col q-pl-sm q-pr-sm">
                    <div class="row text-center justify-center">
                      <div class="col-auto q-pt-md">
                        <qr-code :qr-id="2" :text="shards[1]" :size="200" class="q-mb-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Action Buttons Below QR -->
                <div class="qr-action-buttons">
                  <q-btn
                    unelevated
                    no-caps
                    :label="$t('SaveQR', {}, 'Save QR')"
                    icon="download"
                    color="primary"
                    class="action-btn"
                    @click="downloadQR(1)"
                  />
                  <q-btn
                    unelevated
                    no-caps
                    :label="showRawText[1] ? $t('HideText', {}, 'Hide Text') : $t('ShowText', {}, 'Show Text')"
                    :icon="showRawText[1] ? 'visibility_off' : 'visibility'"
                    color="primary"
                    class="action-btn"
                    @click="toggleRawText(1)"
                  />
                </div>

                <!-- Raw Text (toggleable) -->
                <q-slide-transition>
                  <div v-show="showRawText[1]">
                    <div class="shard-text-container">
                      <div class="shard-text">{{ shards[1] }}</div>
                    </div>
                    <div class="copy-button-wrapper">
                      <q-btn
                        flat
                        no-caps
                        :label="$t('Copy', {}, 'Copy')"
                        icon="content_copy"
                        color="primary"
                        @click="copyToClipboard(shards[1])"
                      />
                    </div>
                  </div>
                </q-slide-transition>
              </div>
            </q-slide-transition>
          </div>

          <!-- Shard 3 -->
          <div class="shard-accordion-item q-mb-xl">
            <div 
              class="shard-header pt-card clickable"
              :class="[getDarkModeClass(darkMode), { 'expanded': expandedShard === 2 }]"
              @click="toggleShard(2)"
            >
              <div class="row items-center no-wrap">
                <div class="shard-number bg-grad">3</div>
                <div class="col q-ml-md">
                  <div class="shard-title">{{ $t('ExtraShard', {}, 'Third Shard') }}</div>
                  <div class="shard-subtitle">{{ $t('ViewShards3rdShardDescription', {}, 'Print, laminate, and store in another location') }}</div>
                </div>
                <q-icon 
                  :name="expandedShard === 2 ? 'expand_less' : 'expand_more'" 
                  size="28px"
                />
              </div>
            </div>
            <q-slide-transition>
              <div v-show="expandedShard === 2" class="shard-content pt-card-2" :class="getDarkModeClass(darkMode)">
                <div class="qr-code-container" :id="`qr-shard-2`">
                  <div class="col q-pl-sm q-pr-sm">
                    <div class="row text-center justify-center">
                      <div class="col-auto q-pt-md">
                        <qr-code :qr-id="3" :text="shards[2]" :size="200" class="q-mb-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Action Buttons Below QR -->
                <div class="qr-action-buttons">
                  <q-btn
                    unelevated
                    no-caps
                    :label="$t('SaveQR', {}, 'Save QR')"
                    icon="download"
                    color="primary"
                    class="action-btn"
                    @click="downloadQR(2)"
                  />
                  <q-btn
                    unelevated
                    no-caps
                    :label="showRawText[2] ? $t('HideText', {}, 'Hide Text') : $t('ShowText', {}, 'Show Text')"
                    :icon="showRawText[2] ? 'visibility_off' : 'visibility'"
                    color="primary"
                    class="action-btn"
                    @click="toggleRawText(2)"
                  />
                </div>

                <!-- Raw Text (toggleable) -->
                <q-slide-transition>
                  <div v-show="showRawText[2]">
                    <div class="shard-text-container">
                      <div class="shard-text">{{ shards[2] }}</div>
                    </div>
                    <div class="copy-button-wrapper">
                      <q-btn
                        flat
                        no-caps
                        :label="$t('Copy', {}, 'Copy')"
                        icon="content_copy"
                        color="primary"
                        @click="copyToClipboard(shards[2])"
                      />
                    </div>
                  </div>
                </q-slide-transition>
              </div>
            </q-slide-transition>
          </div>
          </div>
          <div v-else class="text-center q-py-xl">
            <q-spinner-dots size="50px" color="primary" />
            <div class="q-mt-md">{{ $t('LoadingShards', {}, 'Loading shards') }}...</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Sticky Confirm Backup button -->
    <StickyBackupConfirmButton :authenticated="authenticated" />

    <pinDialog v-model:pin-dialog-action="pinDialogAction" v-on:nextAction="onPinVerified" />
    <biometricWarningAttempts :warning-attempts="warningAttemptsStatus" />
  </div>
</template>

<script>
import sss from 'shamirs-secret-sharing'
import { toHex } from 'hex-my-bytes'
import { copyToClipboard } from 'quasar'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode-svg'
import HeaderNav from 'src/components/header-nav'
import StickyBackupConfirmButton from 'src/components/wallet-backup/StickyBackupConfirmButton.vue'
import { getMnemonic } from 'src/wallet'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import pinDialog from 'src/components/pin'
import biometricWarningAttempts from 'src/components/authOption/biometric-warning-attempt.vue'
import { NativeBiometric } from 'capacitor-native-biometric'
import { Capacitor } from '@capacitor/core'
import SaveToGallery from 'src/utils/save-to-gallery'
import paytacaLogoHorizontal from '../../../assets/paytaca_logo_horizontal.png'

export default {
  name: 'view-shards',

  components: {
    HeaderNav,
    StickyBackupConfirmButton,
    pinDialog,
    biometricWarningAttempts
  },

  data () {
    return {
      mnemonic: '',
      walletHash: '',
      walletName: '',
      shards: [],
      isLoading: true,
      expandedShard: 0,
      pinDialogAction: '',
      warningAttemptsStatus: 'dismiss',
      authenticated: false,
      showRawText: [false, false, false]
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass,
    toggleShard (index) {
      // Close if clicking on already expanded shard, otherwise open the clicked one
      this.expandedShard = this.expandedShard === index ? null : index
    },
    toggleRawText (index) {
      this.showRawText[index] = !this.showRawText[index]
      this.$forceUpdate() // Force update to ensure reactivity
    },
    copyToClipboard (text) {
      copyToClipboard(text)
        .then(() => {
          this.$q.notify({
            message: this.$t('CopiedToClipboard', {}, 'Copied to clipboard'),
            color: 'positive',
            icon: 'check_circle',
            position: 'top',
            timeout: 2000
          })
        })
        .catch(() => {
          this.$q.notify({
            message: this.$t('FailedToCopy', {}, 'Failed to copy'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 2000
          })
        })
    },
    async downloadQR (shardIndex) {
      const vm = this
      try {
        // Create a beautiful wrapper with gradient background (security/backup theme)
        const wrapper = document.createElement('div')
        wrapper.style.cssText = `
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%);
          padding: 60px 50px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          width: 800px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        `
        
        // Add decorative background elements
        const bgDecoration = document.createElement('div')
        bgDecoration.style.cssText = `
          position: absolute;
          top: -100px;
          right: -100px;
          width: 400px;
          height: 400px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          z-index: 0;
        `
        wrapper.appendChild(bgDecoration)
        
        const bgDecoration2 = document.createElement('div')
        bgDecoration2.style.cssText = `
          position: absolute;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          z-index: 0;
        `
        wrapper.appendChild(bgDecoration2)
        
        // Main content container
        const contentContainer = document.createElement('div')
        contentContainer.style.cssText = `
          position: relative;
          z-index: 1;
          background: white;
          border-radius: 32px;
          padding: 50px 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `
        
        // Header with icon and title
        const header = document.createElement('div')
        header.style.cssText = `
          text-align: center;
          margin-bottom: 40px;
        `
        
        // Security icon and text container
        const iconContainer = document.createElement('div')
        iconContainer.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 30px;
        `
        
        // Security icon
        const securityIcon = document.createElement('div')
        securityIcon.style.cssText = `
          font-size: 48px;
          line-height: 1;
        `
        securityIcon.innerHTML = '🔐'
        iconContainer.appendChild(securityIcon)
        
        // Header text
        const headerText = document.createElement('div')
        headerText.style.cssText = `
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
          line-height: 1.4;
        `
        headerText.textContent = 'Seed Phrase Shard Backup'
        iconContainer.appendChild(headerText)
        header.appendChild(iconContainer)
        
        // Wallet info container with gradient (compact layout)
        const walletInfoContainer = document.createElement('div')
        walletInfoContainer.style.cssText = `
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 30px;
          box-shadow: 0 8px 24px rgba(30, 60, 114, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        `
        
        // Left side: Wallet Name
        const walletNameSection = document.createElement('div')
        walletNameSection.style.cssText = `
          flex: 1;
          text-align: left;
        `
        
        const walletNameLabel = document.createElement('div')
        walletNameLabel.style.cssText = `
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        `
        walletNameLabel.textContent = 'Wallet Name'
        walletNameSection.appendChild(walletNameLabel)
        
        const walletNameValue = document.createElement('div')
        walletNameValue.style.cssText = `
          font-size: 24px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.3px;
          line-height: 1.2;
        `
        walletNameValue.textContent = vm.walletName || 'Paytaca Wallet'
        walletNameSection.appendChild(walletNameValue)
        walletInfoContainer.appendChild(walletNameSection)
        
        // Right side: Shard Number
        const shardSection = document.createElement('div')
        shardSection.style.cssText = `
          text-align: right;
          flex-shrink: 0;
        `
        
        const shardLabel = document.createElement('div')
        shardLabel.style.cssText = `
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        `
        shardLabel.textContent = 'Shard Number'
        shardSection.appendChild(shardLabel)
        
        const shardValue = document.createElement('div')
        shardValue.style.cssText = `
          font-size: 36px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          line-height: 1;
        `
        shardValue.textContent = `${shardIndex + 1}`
        shardSection.appendChild(shardValue)
        walletInfoContainer.appendChild(shardSection)
        
        header.appendChild(walletInfoContainer)
        
        // Wallet hash (smaller, below main info)
        const hashContainer = document.createElement('div')
        hashContainer.style.cssText = `
          text-align: center;
          margin-top: 8px;
          margin-bottom: 20px;
        `
        const hashLabel = document.createElement('div')
        hashLabel.style.cssText = `
          font-size: 12px;
          font-weight: 600;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        `
        hashLabel.textContent = 'Wallet Hash'
        hashContainer.appendChild(hashLabel)
        const hashValue = document.createElement('div')
        hashValue.style.cssText = `
          font-size: 14px;
          color: #4a5568;
          font-family: monospace;
          word-break: break-all;
          line-height: 1.4;
        `
        hashValue.textContent = vm.walletHash
        hashContainer.appendChild(hashValue)
        header.appendChild(hashContainer)
        
        contentContainer.appendChild(header)

        // QR Code container with nice frame
        const qrContainer = document.createElement('div')
        qrContainer.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 30px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 24px;
          margin-bottom: 35px;
          position: relative;
        `
        
        const qrFrame = document.createElement('div')
        qrFrame.style.cssText = `
          background: white;
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          position: relative;
        `

        // Create QR code at native large size
        const qrcode = new QRCode({
          content: vm.shards[shardIndex],
          width: 500,
          height: 500,
          swap: true,
          join: true,
          ecl: 'Q',
          padding: 0
        })
        
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(qrcode.svg(), 'image/svg+xml')
        const svgElement = svgDoc.documentElement
        svgElement.setAttribute('width', '500')
        svgElement.setAttribute('height', '500')
        qrFrame.appendChild(svgElement)
        
        // Add security icon overlay in the center
        const iconOverlay = document.createElement('div')
        iconOverlay.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90px;
          height: 90px;
          background: white;
          border-radius: 50%;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 10;
          font-size: 48px;
        `
        iconOverlay.innerHTML = '🔐'
        qrFrame.appendChild(iconOverlay)
        qrContainer.appendChild(qrFrame)
        contentContainer.appendChild(qrContainer)
        
        // Footer with instructions, logo, and website
        const footer = document.createElement('div')
        footer.style.cssText = `
          text-align: center;
          padding-top: 30px;
        `
        
        // Instruction text
        const instructionText = document.createElement('div')
        instructionText.style.cssText = `
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
          letter-spacing: -0.3px;
          margin-bottom: 16px;
          line-height: 1.4;
        `
        instructionText.textContent = 'Generated using Shamir\'s Secret Sharing Algorithm'
        footer.appendChild(instructionText)
        
        const instructionSubtext = document.createElement('div')
        instructionSubtext.style.cssText = `
          font-size: 20px;
          font-weight: 500;
          color: #4a5568;
          letter-spacing: 0.2px;
          margin-bottom: 24px;
          line-height: 1.5;
        `
        instructionSubtext.innerHTML = 'Any 2 of 3 shards can recover your seed phrase.<br>Store securely in separate locations.'
        footer.appendChild(instructionSubtext)
        
        // Paytaca logo container
        const paytacaLogoContainer = document.createElement('div')
        paytacaLogoContainer.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 16px;
        `
        
        // Load Paytaca logo
        const loadPaytacaLogo = () => {
          return new Promise((resolve) => {
            const logoImg = document.createElement('img')
            logoImg.src = paytacaLogoHorizontal
            logoImg.style.cssText = `
              height: 120px;
              width: auto;
              object-fit: contain;
              display: block;
            `
            logoImg.onload = () => {
              paytacaLogoContainer.appendChild(logoImg)
              resolve()
            }
            logoImg.onerror = () => {
              // If logo fails, just resolve (no logo)
              resolve()
            }
          })
        }
        
        // Website text
        const websiteText = document.createElement('div')
        websiteText.style.cssText = `
          font-size: 26px;
          font-weight: 500;
          color: #718096;
          letter-spacing: 0.2px;
        `
        websiteText.textContent = 'www.paytaca.com'
        footer.appendChild(paytacaLogoContainer)
        footer.appendChild(websiteText)
        contentContainer.appendChild(footer)
        
        wrapper.appendChild(contentContainer)
        document.body.appendChild(wrapper)
        
        try {
          // Wait for logo to load before capturing
          await loadPaytacaLogo()
          
          // Small delay to ensure DOM updates are rendered
          await new Promise(resolve => setTimeout(resolve, 100))

          // Capture with html2canvas
          const canvas = await html2canvas(wrapper, {
            backgroundColor: null,
            scale: 3,
            logging: false,
            useCORS: true,
            allowTaint: true
          })

          // Remove temporary wrapper
          document.body.removeChild(wrapper)

          // Create filename with wallet name, hash, and shard number
          const sanitizedWalletName = (vm.walletName || 'wallet')
            .replace(/[^a-z0-9]/gi, '-')
            .toLowerCase()
          const shortHash = vm.walletHash.substring(0, 8)
          const filename = `${sanitizedWalletName}-${shortHash}-shard-${shardIndex + 1}.png`

          canvas.toBlob(async (blob) => {
            try {
              // Check if running on mobile
              const isMobile = Capacitor.getPlatform() !== 'web'
              
              if (isMobile) {
                // Convert blob to base64
                const reader = new FileReader()
                reader.onloadend = async () => {
                  try {
                    const base64Data = reader.result.split(',')[1]
                    
                    // Save to photo library using our custom plugin
                    const result = await SaveToGallery.saveImage({
                      base64Data: base64Data,
                      filename: filename
                    })
                    
                    vm.$q.notify({
                      message: vm.$t('QRSavedToPhotos', {}, 'QR code saved to Photos'),
                      color: 'positive',
                      icon: 'check_circle',
                      position: 'top',
                      timeout: 2000
                    })
                  } catch (error) {
                    console.error('[SaveQR] Error saving to photos:', error)
                    console.error('[SaveQR] Error details:', {
                      message: error.message,
                      code: error.code,
                      stack: error.stack
                    })
                    vm.$q.notify({
                      message: vm.$t('ErrorSavingQR', {}, 'Error saving QR code. Please ensure photo library permissions are granted.'),
                      color: 'negative',
                      icon: 'error',
                      position: 'top',
                      timeout: 3000
                    })
                  }
                }
                reader.readAsDataURL(blob)
              } else {
                // Desktop/web - use download link
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)

                vm.$q.notify({
                  message: vm.$t('QRSaved', {}, 'QR code saved'),
                  color: 'positive',
                  icon: 'download',
                  position: 'top',
                  timeout: 2000
                })
              }
            } catch (error) {
              console.error('Error in download process:', error)
              vm.$q.notify({
                message: vm.$t('ErrorSavingQR', {}, 'Error saving QR code'),
                color: 'negative',
                icon: 'error',
                position: 'top',
                timeout: 2000
              })
            }
          })
        } catch (error) {
          // Error during logo loading or canvas capture
          // Remove wrapper if it still exists
          if (document.body.contains(wrapper)) {
            document.body.removeChild(wrapper)
          }
          throw error // Re-throw to be caught by outer catch
        }
      } catch (error) {
        console.error('Error downloading QR:', error)
        vm.$q.notify({
          message: vm.$t('ErrorSavingQR', {}, 'Error saving QR code'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 2000
        })
      }
    },
    async generateShards () {
      try {
        const secret = Buffer.from(this.mnemonic)
        const shares = sss.split(secret, { shares: 3, threshold: 2 })
        this.shards = shares.map(share => toHex(share))
      } catch (error) {
        console.error('Error generating shards:', error)
        this.$q.notify({
          message: this.$t('ErrorGeneratingShards', {}, 'Error generating shards'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 3000
        })
      }
    },
    
    executeSecurityChecking () {
      const vm = this
      
      setTimeout(() => {
        const preferredSecurity = vm.$store?.getters?.['global/preferredSecurity']
        if (preferredSecurity === 'pin') {
          vm.pinDialogAction = 'VERIFY'
        } else {
          vm.verifyBiometric()
        }
      }, 300)
    },
    
    verifyBiometric () {
      const vm = this
      NativeBiometric.verifyIdentity({
        reason: this.$t('NativeBiometricReason2', {}, 'For security verification'),
        title: this.$t('SecurityAuthentication', {}, 'Security Authentication'),
        subtitle: this.$t('NativeBiometricSubtitle', {}, 'Verify your identity'),
        description: ''
      })
        .then(() => {
          setTimeout(() => {
            vm.onAuthenticationSuccess()
          }, 300)
        })
        .catch((error) => {
          vm.warningAttemptsStatus = 'dismiss'
          if (error.message.includes('Too many attempts') || error.message.includes(vm.$t('MaxAttempts'))) {
            vm.warningAttemptsStatus = 'show'
          } else if (error.message.includes('Authentication') || error.message.includes('Failed')) {
            vm.verifyBiometric()
          } else {
            // User cancelled or other error
            vm.$router.push('/apps/wallet-backup')
          }
        })
    },
    
    onPinVerified (action) {
      const vm = this
      
      if (action === 'proceed') {
        vm.pinDialogAction = ''
        vm.onAuthenticationSuccess()
      } else if (action === 'cancel') {
        // User explicitly cancelled
        vm.pinDialogAction = ''
        vm.$router.push('/apps/wallet-backup')
      }
      // Ignore undefined/empty actions (from resetAll)
    },
    
    async onAuthenticationSuccess () {
      const vm = this
      vm.authenticated = true
      try {
        const walletIndex = vm.$store.getters['global/getWalletIndex']
        vm.mnemonic = await getMnemonic(walletIndex)
        vm.walletHash = vm.$store.getters['global/getWallet']('bch').walletHash
        
        // Get wallet name from vault
        const vault = vm.$store.getters['global/getVault']
        vm.walletName = vault?.[walletIndex]?.name || ''
        
        // Generate shards
        await vm.generateShards()
        
        // Wait a bit before showing (for smooth UX)
        setTimeout(() => {
          vm.isLoading = false
        }, 500)
      } catch (error) {
        console.error('Error loading wallet data:', error)
        vm.$q.notify({
          message: vm.$t('ErrorLoadingWalletData', {}, 'Error loading wallet data'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 3000
        })
        vm.$router.push('/apps/wallet-backup')
      }
    }
  },

  mounted () {
    this.executeSecurityChecking()
  },
  watch: {
    pinDialogAction () {
      // Watcher for pinDialogAction changes
    }
  }
}
</script>

<style lang="scss" scoped>
  .shards-view-container {
    min-height: 100vh;
    padding-bottom: 100px; // Extra padding for sticky button
  }

  .content-wrapper {
    max-width: 800px;
    margin: 0 auto;
  }

  // Info Banner
  .info-banner {
    .info-content {
      padding: 20px 24px;
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .info-icon {
      flex-shrink: 0;
    }

    .info-title {
      font-size: 18px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .info-text {
      font-size: 14px;
      opacity: 0.85;
      line-height: 1.6;
    }
  }

  // Accordion Shards
  .shards-section {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    
    .shard-accordion-item {
      .shard-header {
        padding: 20px 24px;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        &.expanded {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }

        .shard-number {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .shard-title {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .shard-subtitle {
          font-size: 13px;
          opacity: 0.7;
          line-height: 1.4;
        }
      }

      .shard-content {
        padding: 24px;
        border-top: 1px solid rgba(128, 128, 128, 0.15);
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
        margin-top: -8px;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        overflow-x: hidden; // Prevent horizontal overflow from QR codes
        overflow-y: visible;

        .qr-code-container {
          margin-top: 20px;
          padding-left: 28px;
          padding-right: 28px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          
          // The QR component uses inline styles with fixed size (280px for size 220 + padding 30*2)
          // On small screens, reduce padding to give QR code more room
        }
        
        /* iPhone 5/SE and small screens - reduce padding to fit QR */
        @media (min-width: 280px) and (max-width: 360px) {
          .qr-code-container {
            margin-top: 30px;
            padding-left: 12px;
            padding-right: 12px;
          }
        }
        
        /* Galaxy Fold and very small screens - minimal padding */
        @media (max-width: 280px) {
          .qr-code-container {
            margin-top: 66px;
            padding-left: 8px;
            padding-right: 8px;
          }
        }

        .qr-action-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 16px;
          width: 100%;

          .action-btn {
            flex: 1;
            max-width: 180px;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 500;
            font-size: 14px;
          }
        }

        .shard-text-container {
          background: rgba(128, 128, 128, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
          margin-bottom: 12px;
          
          .shard-text {
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            line-height: 1.6;
            opacity: 0.9;
          }
        }

        .copy-button-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }
      }
    }
  }

  // Responsive Design
  @media (max-width: 600px) {
    .info-banner {
      .info-content {
        padding: 16px 20px;
      }

      .info-icon {
        font-size: 28px !important;
      }

      .info-title {
        font-size: 16px;
      }

      .info-text {
        font-size: 13px;
      }
    }

    .shards-section {
      .shard-accordion-item {
        .shard-header {
          padding: 16px 20px;

          .shard-number {
            width: 42px;
            height: 42px;
            font-size: 18px;
          }

          .shard-title {
            font-size: 16px;
          }

          .shard-subtitle {
            font-size: 12px;
          }
        }

        .shard-content {
          padding: 20px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden; // Prevent horizontal overflow

          .qr-code-container {
            // QR code is 280px, ensure it fits on small screens
          }
          
          .qr-action-buttons {
            flex-direction: column;
            gap: 8px;

            .action-btn {
              max-width: 100%;
              font-size: 13px;
              padding: 8px 16px;
            }
          }

          .shard-text-container {
            padding: 12px;

            .shard-text {
              font-size: 11px;
            }
          }
        }
        
        /* Reduce shard-content padding on very small screens to fit QR */
        @media (max-width: 360px) {
          .shard-content {
            padding: 12px;
          }
        }
      }
    }
  }
</style>

