<template>
  <q-dialog persistent ref="dialogRef" seamless class="no-click-outside">
    <q-card class="pt-card-2 text-bow dialog-card" :class="getDarkModeClass(darkMode)">
      <!-- Dialog Title -->
      <div class="row justify-between items-center q-mb-sm q-px-md q-pt-md dialog-title">
        <div class="row items-center q-gutter-sm">
          <q-icon name="qr_code" size="28px" color="primary" />
          <span class="text-h6">{{ $t(`${referralType}ReferralQrTitle`) }}</span>
        </div>
        <q-btn
          flat
          round
          padding="xs"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-separator class="dialog-separator" />

      <!-- Dialog Body -->
      <div class="q-px-md q-py-sm dialog-body">
        <div class="text-subtitle1 q-mb-sm" style="line-height: 1.5rem;">
          {{ $t('ReferralQrDescription') }}
        </div>
  
        <div class="row justify-center q-mb-sm">
          <qr-code
            name="rfp-qr"
            border-width="3px"
            border-color="var(--q-primary)"
            :qr-id="0"
            :text="referralShareUrl"
            :size="180"
          />
        </div>

        <div class="row justify-center q-mb-md">
          <q-btn
            unelevated
            no-caps
            :label="$t('SaveQR')"
            icon="download"
            color="primary"
            class="save-image-btn"
            :loading="savingQR"
            :disable="savingQR"
            @click="saveReferralQRImage"
          >
            <template v-slot:loading>
              <q-spinner-dots color="white" size="24px" />
            </template>
          </q-btn>
        </div>
  
        <!-- Referral Code Display -->
        <div 
          class="referral-code-container q-mb-md"
          :class="[getDarkModeClass(darkMode)]"
        >
          <div class="text-subtitle1 text-bow q-mb-xs" :class="getDarkModeClass(darkMode)">
            {{ $t('ReferralCode') }}
          </div>
          <div class="row justify-center items-center q-gutter-sm">
            <code class="referral-code-text" :class="[getDarkModeClass(darkMode), { 'copy-success': copySuccess, 'copy-failed': copyFailed }]">
              {{ referralCodeFull }}
            </code>
            <q-btn
              flat
              dense
              round
              size="sm"
              :icon="copyButtonIcon"
              :color="copyButtonColor"
              class="copy-btn"
              :class="{ 'copy-success-icon': copySuccess, 'copy-failed-icon': copyFailed }"
              @click="copyReferralCode"
            >
              <q-tooltip>{{ copyTooltip }}</q-tooltip>
            </q-btn>
          </div>

          <q-separator class="q-my-sm" />

          <div class="text-subtitle1 text-bow q-mb-xs" :class="getDarkModeClass(darkMode)">
            {{ $t('ShareReferralCodeLink') }}
          </div>
          <div
            class="row items-center no-wrap q-py-sm q-px-sm rounded-borders"
            :class="{ 'copy-success': linkCopySuccess, 'copy-failed': linkCopyFailed }"
            style="border: 1px solid grey;"
          >
            <div style="overflow-y: auto; white-space: nowrap; flex: 1;">
              {{ referralShareUrl }}
            </div>
            <q-btn
              flat
              dense
              round
              size="sm"
              :icon="linkCopyButtonIcon"
              :color="linkCopyButtonColor"
              class="copy-btn q-ml-sm"
              :class="{ 'copy-success-icon': linkCopySuccess, 'copy-failed-icon': linkCopyFailed }"
              @click="copyReferralShareUrl"
            >
              <q-tooltip>{{ linkCopyTooltip }}</q-tooltip>
            </q-btn>
          </div>
          <div class="q-mt-xs row flex-center no-wrap q-gutter-x-sm" style="overflow-x: auto;">
            <template v-for="shareLink in shareLinks" :key="shareLink.label">
              <q-btn
                flat
                rounded
                padding="md"
                size="md"
                :icon="shareLink.icon"
                :href="shareLink.url"
                target="_blank"
              />
            </template>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import QRCode from 'qrcode-svg'
import html2canvas from 'html2canvas'
import SaveToGallery from 'src/utils/save-to-gallery'
import paytacaLogoHorizontal from '../../../assets/paytaca_logo_horizontal.png'
import paytacaLogo from '../../../assets/paytaca_logo.png'

export default {
  name: 'ReferralQrDialog',

  props: {
    code: { type: String, default: '' },
    promoId: { type: Number, default: -1 },
    promoType: { type: String, default: '' },
    referralType: { type: String, default: '' }
  },

  inject: ['$copyText'],

  data () {
    return {
      copyTooltip: this.$t('Copy'),
      copySuccess: false,
      copyFailed: false,
      savingQR: false,
      linkCopySuccess: false,
      linkCopyFailed: false,
      linkCopyTooltip: this.$t('Copy')
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    referralCodeFull () {
      return `${this.promoType.toUpperCase()}-${this.code}-${this.promoId}`
    },
    referralShareUrl () {
      const code = this.referralCodeFull
      return `https://rewards.paytaca.com/referral?code=${code}`
    },
    shareLinks () {
      const encodedUrl = encodeURI(this.referralShareUrl)
      const fbAppId = 438643061338284
      const isMobile = this.$q.platform.is.mobile
      const links = {}

      links.fb = {
        label: 'facebook',
        icon: 'fab fa-facebook',
        url: `https://www.facebook.com/dialog/share?app_id=${fbAppId}&href=${encodedUrl}&display=popup`
      }

      if (isMobile) {
        links.messenger = {
          label: 'messenger',
          icon: 'fab fa-facebook-messenger',
          url: `fb-messenger://share/?link=${encodedUrl}&app_id=${fbAppId}`
        }
      }

      links.twitter = {
        label: 'twitter',
        icon: 'fab fa-twitter',
        url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=Paytaca%20Referral&via=_paytaca_&related=_paytaca_`
      }

      links.telegram = {
        label: 'telegram',
        icon: 'telegram',
        url: isMobile
          ? `tg://msg_url?url=${encodedUrl}&text=Paytaca%20Referral`
          : `https://t.me/share?url=${encodedUrl}&text=Paytaca%20Referral`
      }

      links.whatsapp = {
        label: 'whatsapp',
        icon: 'fab fa-whatsapp',
        url: `https://wa.me/?text=Paytaca%20Referral%0A${encodedUrl}`
      }

      links.email = {
        label: 'email',
        icon: 'email',
        url: `mailto:?body=Paytaca%20Referral:%20${encodedUrl}`
      }

      return links
    },
    linkCopyButtonIcon () {
      if (this.linkCopySuccess) return 'check'
      if (this.linkCopyFailed) return 'close'
      return 'content_copy'
    },
    linkCopyButtonColor () {
      if (this.linkCopySuccess) return 'positive'
      if (this.linkCopyFailed) return 'negative'
      return undefined
    },
    copyButtonIcon () {
      if (this.copySuccess) return 'check'
      if (this.copyFailed) return 'close'
      return 'content_copy'
    },
    copyButtonColor () {
      if (this.copySuccess) return 'positive'
      if (this.copyFailed) return 'negative'
      return undefined
    }
  },

  methods: {
    getDarkModeClass,

    copyReferralShareUrl () {
      this.linkCopySuccess = false
      this.linkCopyFailed = false

      this.$copyText(this.referralShareUrl).then(() => {
        this.linkCopySuccess = true
        this.linkCopyTooltip = this.$t('CopiedToClipboard')

        setTimeout(() => {
          this.linkCopySuccess = false
          this.linkCopyTooltip = this.$t('Copy')
        }, 2000)
      }).catch(() => {
        this.linkCopyFailed = true
        this.linkCopyTooltip = this.$t('FailedToCopyCode')

        setTimeout(() => {
          this.linkCopyFailed = false
          this.linkCopyTooltip = this.$t('Copy')
        }, 2000)
      })
    },
    
    copyReferralCode () {
      if (!this.referralCodeFull) return
      
      // Reset states first
      this.copySuccess = false
      this.copyFailed = false
      
      this.$copyText(this.referralCodeFull).then(() => {
        // Success state
        this.copySuccess = true
        this.copyTooltip = this.$t('CodeCopied')
        
        setTimeout(() => {
          this.copySuccess = false
          this.copyTooltip = this.$t('Copy')
        }, 2000)
      }).catch(() => {
        // Failed state
        this.copyFailed = true
        this.copyTooltip = this.$t('FailedToCopyCode')
        
        setTimeout(() => {
          this.copyFailed = false
          this.copyTooltip = this.$t('Copy')
        }, 2000)
      })
    },

    async saveReferralQRImage () {
      if (!this.referralCodeFull) return
      if (this.savingQR) return
      this.savingQR = true
      let wrapper = null

      try {
        const qrUrl = this.referralShareUrl
        const referralCode = this.referralCodeFull

        // Create a beautiful wrapper with gradient background
        wrapper = document.createElement('div')
        wrapper.style.cssText = `
          background: linear-gradient(135deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%);
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

        // Icon and text container
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 30px;
        `

        // Referral icon
        const referralIcon = document.createElement('div')
        referralIcon.style.cssText = `
          font-size: 48px;
          line-height: 1;
        `
        referralIcon.innerHTML = '👥'
        logoContainer.appendChild(referralIcon)

        // Header text with highlighted Referral Code
        const headerText = document.createElement('div')
        headerText.style.cssText = `
          font-size: 28px;
          font-weight: 700;
          color: #2d3748;
          line-height: 1.4;
        `

        const textSpan = document.createElement('span')
        textSpan.textContent = 'Join with my '
        headerText.appendChild(textSpan)

        const referralCodeSpan = document.createElement('span')
        referralCodeSpan.style.cssText = `
          background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
          color: white;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
        `
        referralCodeSpan.textContent = 'Referral Code'
        headerText.appendChild(referralCodeSpan)

        const textSpan2 = document.createElement('span')
        textSpan2.textContent = '!'
        headerText.appendChild(textSpan2)

        logoContainer.appendChild(headerText)
        header.appendChild(logoContainer)

        // Referral code display with beautiful styling
        const codeContainer = document.createElement('div')
        codeContainer.style.cssText = `
          background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 40px;
          box-shadow: 0 8px 24px rgba(25, 118, 210, 0.3);
        `

        const codeLabel = document.createElement('div')
        codeLabel.style.cssText = `
          font-size: 14px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
        `
        codeLabel.textContent = this.$t('ReferralCode', {}, 'Referral Code')
        codeContainer.appendChild(codeLabel)

        const codeValue = document.createElement('div')
        codeValue.style.cssText = `
          font-family: 'Courier New', monospace;
          font-size: 48px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
        `
        codeValue.textContent = referralCode
        codeContainer.appendChild(codeValue)

        header.appendChild(codeContainer)
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
          content: qrUrl,
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

        // Add Paytaca logo overlay in the center
        const logoOverlay = document.createElement('div')
        logoOverlay.style.cssText = `
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
        `

        // Load Paytaca logo
        const loadPaytacaLogo = () => {
          return new Promise((resolve) => {
            const logoImg = document.createElement('img')
            logoImg.src = paytacaLogo
            logoImg.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            `
            logoImg.onload = () => {
              logoOverlay.appendChild(logoImg)
              resolve()
            }
            logoImg.onerror = () => {
              // Fallback to styled badge if image fails
              const logoInner = document.createElement('div')
              logoInner.style.cssText = `
                background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
                color: white;
                font-size: 18px;
                font-weight: 800;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                letter-spacing: 1px;
              `
              logoInner.textContent = 'P'
              logoOverlay.appendChild(logoInner)
              resolve()
            }
          })
        }

        qrFrame.appendChild(logoOverlay)
        qrContainer.appendChild(qrFrame)
        contentContainer.appendChild(qrContainer)

        // Footer with instructions and logo
        const footer = document.createElement('div')
        footer.style.cssText = `
          text-align: center;
          padding-top: 30px;
        `

        // Instruction text
        const instructionText = document.createElement('div')
        instructionText.style.cssText = `
          font-size: 28px;
          font-weight: 600;
          color: #2d3748;
          letter-spacing: -0.3px;
          margin-bottom: 24px;
          line-height: 1.4;
        `
        instructionText.textContent = 'Join Paytaca with my referral code.'
        footer.appendChild(instructionText)

        // Paytaca logo container
        const paytacaLogoContainer = document.createElement('div')
        paytacaLogoContainer.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 16px;
        `

        // Load Paytaca horizontal logo
        const loadPaytacaHorizontalLogo = () => {
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
              resolve()
            }
          })
        }

        footer.appendChild(paytacaLogoContainer)
        contentContainer.appendChild(footer)

        wrapper.appendChild(contentContainer)
        document.body.appendChild(wrapper)

        try {
          // Wait for logos to load before capturing
          await Promise.all([
            loadPaytacaLogo(),
            loadPaytacaHorizontalLogo()
          ])

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

          // Remove temporary wrapper (success path)
          document.body.removeChild(wrapper)

          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
          if (!blob) {
            throw new Error('canvas.toBlob() returned null')
          }

          const filename = `referral-code-${referralCode}.png`

          const isMobile = Capacitor.getPlatform() !== 'web'

          if (isMobile) {
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => {
                try {
                  if (typeof reader.result !== 'string') {
                    return reject(new Error('FileReader result is not a string'))
                  }
                  const data = reader.result.split(',')[1]
                  if (!data) {
                    return reject(new Error('Failed to extract base64 data'))
                  }
                  resolve(data)
                } catch (e) {
                  reject(e)
                }
              }
              reader.onerror = (event) => reject(reader.error || event)
              reader.onabort = () => reject(new Error('FileReader aborted'))
              reader.readAsDataURL(blob)
            })

            try {
              await SaveToGallery.saveImage({ base64Data, filename })
              this.$q.notify({
                message: this.$t('QRSavedToPhotos'),
                color: 'positive',
                icon: 'check_circle',
                position: 'top',
                timeout: 2000
              })
            } catch (error) {
              console.error('[SaveReferralQR] Error saving to photos:', error)
              this.$q.notify({
                message: this.$t('ErrorSavingQR'),
                color: 'negative',
                icon: 'error',
                position: 'top',
                timeout: 3000
              })
            }
          } else {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            this.$q.notify({
              message: this.$t('QRSavedToPhotos'),
              color: 'positive',
              icon: 'check_circle',
              position: 'top',
              timeout: 2000
            })
          }
        } finally {
          // Ensure wrapper is always removed, even if an error occurred
          if (wrapper && wrapper.parentNode === document.body) {
            document.body.removeChild(wrapper)
          }
        }
      } catch (error) {
        console.error('[SaveReferralQR] Error creating image:', error)
        this.$q.notify({
          message: this.$t('ErrorSavingQR'),
          color: 'negative',
          icon: 'error',
          position: 'top',
          timeout: 3000
        })
      } finally {
        this.savingQR = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.referral-code-container {
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.1);
  transition: all 0.3s ease;
}

.copy-success {
  background: rgba(76, 175, 80, 0.2) !important;
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.4);
  animation: successPulse 0.5s ease;
}

.copy-failed {
  background: rgba(244, 67, 54, 0.2) !important;
  box-shadow: 0 0 12px rgba(244, 67, 54, 0.4);
  animation: failShake 0.5s ease;
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes failShake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.referral-code-text {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.15);
  transition: all 0.3s ease;
  
  &.dark {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.light {
    color: #000;
    background: rgba(0, 0, 0, 0.05);
  }
}

.copy-btn {
  opacity: 0.7;
  transition: all 0.3s ease;
  
  &:hover {
    opacity: 1;
  }
  
  &.copy-success-icon {
    opacity: 1;
    animation: iconPop 0.3s ease;
  }
  
  &.copy-failed-icon {
    opacity: 1;
    animation: iconPop 0.3s ease;
  }
}

@keyframes iconPop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}

.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.dialog-title {
  flex-shrink: 0;
}

.dialog-separator {
  flex-shrink: 0;
}

.dialog-body {
  overflow-y: auto;
  flex: 1 1 auto;
}
</style>
