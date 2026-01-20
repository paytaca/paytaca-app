<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom" seamless>
    <q-card class="bottom-card" :class="darkMode ? 'pt-card-3' : 'text-black'">
      <div class="row no-wrap items-center justify-center q-pl-md q-mt-sm">
        <div class="text-h6 q-space q-mt-sm">{{ $t('Gift') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height:calc(90vh - 3.5rem);overflow-y:auto" class="q-pt-sm">
        <!-- Show QR code and URL when showQr is true -->
        <template v-if="showQr">
          <div class="text-center text-h5 q-mb-xs">{{ $t('Amount') }}: {{ amount }} BCH</div>
          <div class="text-center text-caption q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="opacity: 0.7;">
            {{ $t('GiftID', {}, 'Gift ID') }}: {{ getGiftId() }}
          </div>
          <div class="row justify-center q-mb-md">
            <qr-code :text="qrCodeContents" :size="200" icon="bch-logo.png"/>
          </div>
          <div
            class="q-py-sm q-px-md q-px-lg q-my-xs row items-center no-wrap rounded-borders q-mb-sm"
            style="border:1px solid grey; position:relative"
            v-ripple
            @click="() => copyToClipboard(qrCodeContents)"
          >
            <div class="ellipsis">{{ qrCodeContents }}</div>
            <q-icon name="content_copy" size="1.25em" class="q-ml-sm"/>
          </div>
          <div class="text-center text-subtitle1 q-mb-md">{{ $t('ScanClaimGift') }}</div>
          <div class="row justify-center q-mt-md">
            <q-btn
              unelevated
              no-caps
              :label="$t('SaveQR', {}, 'Save QR')"
              icon="download"
              color="primary"
              class="save-image-btn"
              :loading="savingGiftQR"
              :disable="savingGiftQR"
              @click="saveGiftQRImage"
            >
              <template v-slot:loading>
                <q-spinner-dots color="white" size="24px" />
              </template>
            </q-btn>
          </div>
        </template>
        
        <!-- Show gift details when showQr is false -->
        <template v-else>
          <div class="q-pa-md">
            <div class="row q-mb-md">
              <div class="col-5 text-grey-7">{{ $t('DateCreated', {}, 'Date Created') }}:</div>
              <div class="col-7 text-right">{{ formattedDateCreated }}</div>
            </div>
            <div class="row q-mb-md">
              <div class="col-5 text-grey-7">{{ $t('Amount') }}:</div>
              <div class="col-7 text-right text-weight-medium">{{ amount }} BCH</div>
            </div>
            <div class="row q-mb-md" v-if="getGiftId()">
              <div class="col-5 text-grey-7">{{ $t('GiftID', {}, 'Gift ID') }}:</div>
              <div class="col-7 text-right text-weight-medium">{{ getGiftId() }}</div>
            </div>
            <div class="row q-mb-md" v-if="formattedDateClaimed">
              <div class="col-5 text-grey-7">{{ $t('DateClaimed', {}, 'Date Claimed') }}:</div>
              <div class="col-7 text-right">{{ formattedDateClaimed }}</div>
            </div>
            <div class="row q-mt-md">
              <div class="col-12 text-center">
                <q-badge
                  :class="getStatusBadgeClass()"
                  class="status-badge-small"
                >
                  <q-icon 
                    :name="getStatusIcon()" 
                    size="12px" 
                    class="q-mr-xs"
                  />
                  {{ getStatusText() }}
                </q-badge>
              </div>
            </div>
            <div class="row q-mt-md" v-if="!props.gift?.encrypted_gift_code">
              <div class="col-12">
                <q-banner 
                  :class="darkMode ? 'old-gift-notice dark' : 'old-gift-notice light'"
                  rounded
                  class="old-gift-notice-banner"
                >
                  <template v-slot:avatar>
                    <q-icon 
                      name="mdi-information-outline" 
                      :color="darkMode ? 'amber-4' : 'amber-8'"
                      size="24px"
                    />
                  </template>
                  <div class="old-gift-notice-text">
                    {{ $t('OldGiftNotice', {}, 'This gift was created from an old version of the app, it can still be claimed by those who got the link, but the link cannot be recreated anymore in this version.') }}
                  </div>
                </q-banner>
              </div>
            </div>
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, inject, ref } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from "vue-i18n"
import { formatDistance } from 'date-fns'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode-svg'
import { Capacitor } from '@capacitor/core'
import SaveToGallery from 'src/utils/save-to-gallery'
import paytacaLogoHorizontal from '../../assets/paytaca_logo_horizontal.png'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { hexToRef } from 'src/utils/reference-id-utils'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $copyText = inject('$copyText')
const { t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  gift: Object,
  showQr: {
    type: Boolean,
    default: false
  }
})

const qrCodeContents = computed(() => {
  const giftCode = props.gift?.qr || props.gift?.giftCode
  if (!giftCode) return ''
  const url = 'https://gifts.paytaca.com/claim/?code='
  return url + giftCode
})
const amount = computed(() => props.gift?.amount)

const isClaimed = computed(() => {
  return props.gift?.date_claimed && props.gift?.date_claimed !== 'None'
})

const isRecovered = computed(() => {
  return props.gift?.recovered === true || props.gift?.recovered === 'true' || props.gift?.recovered === 1
})

const formattedDateCreated = computed(() => {
  if (!props.gift?.date_created) return ''
  try {
    const date = new Date(props.gift.date_created)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) {
      // Show relative time for dates less than 7 days ago
      return formatDistance(date, now, { addSuffix: true })
    } else {
      // Show absolute date for dates 7 days or more ago
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (e) {
    return props.gift.date_created
  }
})

const formattedDateClaimed = computed(() => {
  if (!props.gift?.date_claimed || props.gift?.date_claimed === 'None') return ''
  try {
    const date = new Date(props.gift.date_claimed)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) {
      // Show relative time for dates less than 7 days ago
      return formatDistance(date, now, { addSuffix: true })
    } else {
      // Show absolute date for dates 7 days or more ago
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (e) {
    return props.gift.date_claimed
  }
})

function getStatusBadgeClass() {
  if (isRecovered.value) return 'status-recovered'
  if (isClaimed.value) return 'status-claimed'
  return 'status-unclaimed'
}

function getStatusIcon() {
  if (isRecovered.value) return 'mdi-recycle'
  if (isClaimed.value) return 'mdi-check-circle'
  return 'mdi-clock-outline'
}

function getStatusText() {
  if (isRecovered.value) return t('Recovered', {}, 'RECOVERED')
  if (isClaimed.value) return t('Claimed', {}, 'CLAIMED')
  return t('Unclaimed', {}, 'UNCLAIMED')
}

function copyToClipboard (value, message=t('CopiedToClipboard')) {
  $copyText(value)
  $q.notify({
    message: message,
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

const denomination = computed(() => $store.getters['global/denomination'])
const savingGiftQR = ref(false)

function getGiftId() {
  const giftCode = props.gift?.qr || props.gift?.giftCode
  if (!giftCode) {
    // Fallback to gift_code_hash if available
    const giftCodeHash = props.gift?.hash || props.gift?.gift_code_hash
    if (giftCodeHash && typeof giftCodeHash === 'string') {
      const hex6 = giftCodeHash.substring(0, 6)
      return hexToRef(hex6)
    }
    return ''
  }
  // Use sha256 to get hash from gift code, then convert to ID
  const sha256 = require('js-sha256')
  const hash = sha256(giftCode)
  const hex6 = hash.substring(0, 6)
  return hexToRef(hex6)
}

async function saveGiftQRImage () {
  if (!qrCodeContents.value) {
    return
  }
  if (savingGiftQR.value) return
  savingGiftQR.value = true
  let wrapper = null
  
  try {
    const qrUrl = qrCodeContents.value
    const giftAmount = getAssetDenomination(denomination.value, amount.value)
    
    // Create a beautiful wrapper with gradient background
    wrapper = document.createElement('div')
    wrapper.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
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
    
    // Header with logo and title
    const header = document.createElement('div')
    header.style.cssText = `
      text-align: center;
      margin-bottom: 40px;
    `
    
    // Logo and text container
    const logoContainer = document.createElement('div')
    logoContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 30px;
    `
    
    // Gift icon
    const giftIcon = document.createElement('div')
    giftIcon.style.cssText = `
      font-size: 48px;
      line-height: 1;
    `
    giftIcon.innerHTML = '🎁'
    logoContainer.appendChild(giftIcon)
    
    // Header text with highlighted Bitcoin Cash
    const headerText = document.createElement('div')
    headerText.style.cssText = `
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
      line-height: 1.4;
    `
    
    // Create text with highlighted "Bitcoin Cash"
    const textSpan = document.createElement('span')
    textSpan.textContent = 'You received a '
    headerText.appendChild(textSpan)
    
    const bitcoinCashSpan = document.createElement('span')
    bitcoinCashSpan.style.cssText = `
      background: linear-gradient(135deg, #0ac18e 0%, #00d4aa 100%);
      color: white;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(10, 193, 142, 0.3);
    `
    bitcoinCashSpan.textContent = 'Bitcoin Cash'
    headerText.appendChild(bitcoinCashSpan)
    
    const textSpan2 = document.createElement('span')
    textSpan2.textContent = ' gift!'
    headerText.appendChild(textSpan2)
    
    logoContainer.appendChild(headerText)
    header.appendChild(logoContainer)
    
    // Amount display with beautiful styling
    const amountContainer = document.createElement('div')
    amountContainer.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 40px;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    `
    
    const amountLabel = document.createElement('div')
    amountLabel.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
    `
    amountLabel.textContent = t('Amount', {}, 'Amount')
    amountContainer.appendChild(amountLabel)
    
    const amountValue = document.createElement('div')
    amountValue.style.cssText = `
      font-size: 48px;
      font-weight: 800;
      color: white;
      letter-spacing: -1px;
    `
    amountValue.textContent = giftAmount
    amountContainer.appendChild(amountValue)
    
    header.appendChild(amountContainer)
    
    // Add Gift ID below amount container
    const giftIdValue = getGiftId()
    if (giftIdValue) {
      const giftIdContainer = document.createElement('div')
      giftIdContainer.style.cssText = `
        text-align: center;
        margin-top: 8px;
        margin-bottom: 20px;
      `
      const giftIdLabel = document.createElement('div')
      giftIdLabel.style.cssText = `
        font-size: 18px;
        font-weight: 600;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `
      giftIdLabel.textContent = `${t('GiftID', {}, 'Gift ID')}: ${giftIdValue}`
      giftIdContainer.appendChild(giftIdLabel)
      header.appendChild(giftIdContainer)
    }
    
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
    
    // Add BCH logo overlay in the center
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
    
    // Load BCH PNG logo
    const loadBchLogo = () => {
      return new Promise((resolve) => {
        const logoImg = document.createElement('img')
        logoImg.src = 'bch-logo.png'
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
            background: linear-gradient(135deg, #0ac18e 0%, #00d4aa 100%);
            color: white;
            font-size: 28px;
            font-weight: 800;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            letter-spacing: 1px;
          `
          logoInner.textContent = 'BCH'
          logoOverlay.appendChild(logoInner)
          resolve()
        }
      })
    }
    
    qrFrame.appendChild(logoOverlay)
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
      font-size: 28px;
      font-weight: 600;
      color: #2d3748;
      letter-spacing: -0.3px;
      margin-bottom: 24px;
      line-height: 1.4;
    `
    instructionText.textContent = 'To claim the gift, scan the QR using Paytaca app.'
    footer.appendChild(instructionText)
    
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
        // Use the imported logo path (webpack will resolve it)
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
      color: #4a5568;
      letter-spacing: 0.2px;
    `
    websiteText.textContent = 'www.paytaca.com'
    footer.appendChild(paytacaLogoContainer)
    footer.appendChild(websiteText)
    contentContainer.appendChild(footer)
    
    wrapper.appendChild(contentContainer)
    document.body.appendChild(wrapper)
    
    try {
      // Wait for logos to load before capturing
      await Promise.all([
        loadBchLogo(),
        loadPaytacaLogo()
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

      // Remove temporary wrapper (success path - wrapper no longer needed)
      document.body.removeChild(wrapper)

      // Create filename with gift amount and code
      const sanitizedAmount = giftAmount.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      const shortCode = qrCodeContents.value.substring(qrCodeContents.value.length - 8)
      const filename = `bch-gift-${sanitizedAmount}-${shortCode}.png`

      const blobToBase64Data = async (blob) => {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            try {
              if (typeof reader.result !== 'string') {
                return reject(new Error('FileReader result is not a string'))
              }
              const base64Data = reader.result.split(',')[1]
              if (!base64Data) {
                return reject(new Error('Failed to extract base64 data from data URL'))
              }
              resolve(base64Data)
            } catch (e) {
              reject(e)
            }
          }
          reader.onerror = (event) => reject(reader.error || event)
          reader.onabort = () => reject(new Error('FileReader aborted'))
          try {
            reader.readAsDataURL(blob)
          } catch (e) {
            reject(e)
          }
        })
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) {
        throw new Error('canvas.toBlob() returned null')
      }

      // Check if running on mobile
      const isMobile = Capacitor.getPlatform() !== 'web'

      if (isMobile) {
        const base64Data = await blobToBase64Data(blob)
        try {
          await SaveToGallery.saveImage({
            base64Data,
            filename
          })

          $q.notify({
            message: t('QRSavedToPhotos', {}, 'QR code saved to Photos'),
            color: 'positive',
            icon: 'check_circle',
            position: 'top',
            timeout: 2000
          })
        } catch (error) {
          console.error('[SaveGiftQR] Error saving to photos:', error)
          $q.notify({
            message: t('ErrorSavingQR', {}, 'Error saving QR code. Please ensure photo library permissions are granted.'),
            color: 'negative',
            icon: 'error',
            position: 'top',
            timeout: 3000
          })
        }
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

        $q.notify({
          message: t('QRDownloaded', {}, 'QR code downloaded'),
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
    console.error('[SaveGiftQR] Error creating image:', error)
    $q.notify({
      message: t('ErrorSavingQR', {}, 'Error saving QR code'),
      color: 'negative',
      icon: 'error',
      position: 'top',
      timeout: 3000
    })
  } finally {
    savingGiftQR.value = false
  }
}
</script>

<style scoped>
.status-badge-small {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;
}

.status-badge-small.status-claimed {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.status-badge-small.status-recovered {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.status-badge-small.status-unclaimed {
  background: rgba(33, 150, 243, 0.15);
  color: #2196f3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.old-gift-notice-banner {
  border-left: 3px solid #ff9800;
  padding: 12px 16px;
  margin-top: 8px;
}

.old-gift-notice.dark {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.12) 0%, rgba(255, 193, 7, 0.12) 100%);
  border-left-color: #ff9800;
  color: rgba(255, 255, 255, 0.9);
}

.old-gift-notice.light {
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(255, 193, 7, 0.08) 100%);
  border-left-color: #ff9800;
  color: rgba(0, 0, 0, 0.85);
}

.old-gift-notice-text {
  font-size: 13px;
  line-height: 1.5;
  font-weight: 400;
}
</style>
