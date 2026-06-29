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
            <!-- {{ $t('ShareReferralCodeLink') }} -->
            Share Referral Code Link
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
      
      navigator.clipboard.writeText(this.referralCodeFull).then(() => {
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

      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--q-primary').trim() || '#1976d2'

      let wrapper = null

      try {
        wrapper = document.createElement('div')
        wrapper.style.cssText = `
          background: #ffffff;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          width: 400px;
          box-sizing: border-box;
          border: 15px solid ${primaryColor};
        `

        const titleRow = document.createElement('div')
        titleRow.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          padding: 16px 24px 0;
        `

        const titleText = document.createElement('span')
        titleText.style.cssText = `
          font-size: 20px;
          font-weight: 600;
          color: #222;
        `
        titleText.textContent = this.$t(`${this.referralType}ReferralQrTitle`)
        titleRow.appendChild(titleText)
        wrapper.appendChild(titleRow)

        const separator = document.createElement('div')
        separator.style.cssText = `
          height: 1px;
          background: #e0e0e0;
          margin: 16px 0 20px;
        `
        wrapper.appendChild(separator)

        const contentInner = document.createElement('div')
        contentInner.style.cssText = `
          padding: 0 24px;
        `

        const description = document.createElement('div')
        description.style.cssText = `
          font-size: 16px;
          color: #555;
          text-align: left;
          margin-bottom: 24px;
          line-height: 1.5;
        `
        description.textContent = this.$t('ReferralQrDescription')
        contentInner.appendChild(description)

        const qrContainer = document.createElement('div')
        qrContainer.style.cssText = `
          display: flex;
          justify-content: center;
          align-items: center;
          border: 3px solid ${primaryColor};
          border-radius: 10px;
          margin-bottom: 24px;
        `

        const qrcode = new QRCode({
          content: this.referralShareUrl,
          width: 300,
          height: 300,
          swap: true,
          join: true,
          ecl: 'Q',
          padding: 4
        })

        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(qrcode.svg(), 'image/svg+xml')
        const svgElement = svgDoc.documentElement
        svgElement.setAttribute('width', '300')
        svgElement.setAttribute('height', '300')
        qrContainer.appendChild(svgElement)
        contentInner.appendChild(qrContainer)

        const referralLabel = document.createElement('div')
        referralLabel.style.cssText = `
          font-size: 14px;
          font-weight: 600;
          color: #888;
          text-align: center;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
        `
        referralLabel.textContent = this.$t('ReferralCode')
        contentInner.appendChild(referralLabel)

        const referralCodeDisplay = document.createElement('div')
        referralCodeDisplay.style.cssText = `
          font-family: 'Courier New', monospace;
          font-size: 16px;
          font-weight: bolder;
          color: ${primaryColor};
          text-align: center;
          letter-spacing: 1px;
          padding-bottom: 24px;
        `
        referralCodeDisplay.textContent = this.referralCodeFull
        contentInner.appendChild(referralCodeDisplay)

        wrapper.appendChild(contentInner)

        document.body.appendChild(wrapper)

        const canvas = await html2canvas(wrapper, {
          backgroundColor: '#ffffff',
          scale: 3,
          logging: false,
          useCORS: true,
          allowTaint: true
        })

        document.body.removeChild(wrapper)

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) {
          throw new Error('canvas.toBlob() returned null')
        }

        const filename = `referral-code-${this.referralCodeFull}.png`

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
        if (wrapper && wrapper.parentNode === document.body) {
          document.body.removeChild(wrapper)
        }
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
