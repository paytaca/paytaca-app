<template>
  <div class="jpp-payment-container text-bow" :class="getDarkModeClass(darkMode)">
    <div class="q-px-md q-pb-md">
      <!-- Memo Section -->
      <div v-if="jpp?.parsed?.memo" class="memo-section q-mb-md">
        <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
          {{$t('Memo')}}
        </div>
        <div class="memo-text">
          {{ jpp.parsed?.memo }}
        </div>
      </div>

      <!-- Expiration Countdown -->
      <div v-if="jpp?.parsed?.expires" class="expiration-countdown q-mb-lg">
        <div class="row items-center q-gutter-xs">
          <q-icon 
            :name="isExpired ? 'error_outline' : 'schedule'" 
            size="18px" 
            :class="isExpired ? 'text-red' : (darkMode ? 'text-grey-5' : 'text-grey-7')"
          />
          <div class="text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
            {{ isExpired ? $t('Expired') : $t('ExpiresIn', {}, 'Expires in') }}:
          </div>
          <div class="countdown-text" :class="isExpired ? 'text-red' : ''">
            {{ expirationCountdown }}
          </div>
        </div>
      </div>

      <!-- Recipients Section -->
      <div class="recipients-section q-mb-lg">
        <div class="section-header q-mb-md">
          <q-icon name="people_outline" size="20px" class="q-mr-sm" />
          <span class="text-body1 text-weight-medium">
            {{ jpp?.parsed?.outputs?.length === 1 ? $t('Recipient') : $t('Recipients') }}
          </span>
        </div>

        <div class="recipients-list">
          <div
            v-for="(output, index) in jpp?.parsed?.outputs"
            :key="index"
            class="recipient-card"
            :class="getDarkModeClass(darkMode)"
          >
            <div class="recipient-header">
              <div class="recipient-number">#{{ index + 1 }}</div>
              <div class="recipient-amount">
                <div class="amount-primary">{{ formatRecipientAmount(output.amount) }} {{ denomination }}</div>
                <div v-if="selectedAssetMarketPrice" class="amount-secondary">
                  {{ formatRecipientFiatAmount(output.amount) }} {{ String(currentSendPageCurrency()).toUpperCase() }}
                </div>
              </div>
            </div>

            <div class="recipient-address-section" @click="copyToClipboard(output.address)">
              <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('Address') }}
              </div>
              <div class="recipient-address">
                {{ ellipsisText(output.address, {start: 12, end: 8}) }}
                <q-icon name="content_copy" size="14px" class="copy-icon" />
              </div>
            </div>

            <div v-if="output?.description" class="recipient-description q-mt-sm">
              <div class="text-caption q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                {{ $t('Description') }}
              </div>
              <div class="description-text">{{ output.description }}</div>
            </div>

            <div v-if="output?.token?.category" class="recipient-token q-mt-sm">
              <q-icon name="token" size="16px" class="q-mr-xs"/>
              <span v-if="output?.token?.nft" class="text-brandblue">
                NFT
              </span>
              <span v-else>
                {{ formatRecipientToken(output) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Total Section -->
        <q-separator spaced class="q-mt-md" />
        <div class="total-section q-mt-md">
          <div class="row items-center justify-between">
            <div class="text-body1 text-weight-medium">{{ $t('Total') }}</div>
            <div class="total-amounts">
              <div class="total-amount-primary">{{ amountFormatted }} {{ denomination }}</div>
              <div v-if="selectedAssetMarketPrice" class="total-amount-secondary">
                {{ fiatFormatted }} {{ String(currentSendPageCurrency()).toUpperCase() }}
              </div>
            </div>
          </div>
          <template v-if="jpp?.tokenAmounts?.length">
            <div v-for="(tokenData, index) in jpp?.tokenAmounts" :key="index" class="total-token q-mt-xs text-right">
              {{ formatTokenAmount(tokenData) }}
            </div>
          </template>
          <div v-if="jpp?.nfts?.length" class="total-token q-mt-xs text-right">
            {{ jpp?.nfts?.length }}
            {{ jpp?.nfts?.length === 1 ? 'NFT' : 'NFTs' }}
          </div>
        </div>
      </div>

      <!-- Loading State - Prominent Display -->
      <div v-if="loading" ref="loadingStateRef" class="loading-state q-mt-lg">
        <div class="column items-center q-pa-lg">
          <q-spinner size="3em" color="primary" />
          <div class="text-body1 text-weight-medium q-mt-md">{{ loadingMsg }}</div>
        </div>
      </div>

      <!-- Transactions -->
      <div v-if="jpp.txids.length" class="q-mt-md">
        <div class="text-body2 text-weight-medium q-mb-sm">
              <template v-if="jpp.txids.length > 1">
                {{ $t('Transactions') }}
              </template>
              <template v-else>
                {{ $t('Transaction') }}
              </template>
            </div>
        <q-list separator>
          <q-item v-for="(txid, index) in jpp.txids" :key="index">
            <q-item-section>
              <div class="ellipsis">{{ ellipsisText(txid, {start: 10, end: 10 }) }}</div>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-x-sm">
                <q-btn flat dense round icon="content_copy" size="sm" @click="copyToClipboard(txid)"/>
                <q-btn flat dense round icon="open_in_new" size="sm" target="_blank" :href="txLink(txid)"/>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
            </div>

      <!-- Expiration Warning -->
      <div
        v-if="isExpired"
        class="expiration-banner q-mt-md"
        :class="getDarkModeClass(darkMode)"
      >
        <div class="row items-start q-gutter-sm">
          <q-icon 
            name="error_outline" 
            size="24px" 
            class="expiration-icon"
          />
          <div class="col">
            <div class="text-body2 text-weight-medium expiration-title">
              {{ $t('InvoiceExpired', {}, 'This invoice has expired and cannot be paid') }}
            </div>
            <div v-if="jpp?.parsed?.expires" class="text-caption q-mt-xs expiration-subtitle">
              {{ $t('ExpiredAt', {}, 'Expired at') }}: {{ formatTimestampToText(jpp.parsed.expires) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <q-banner v-if="errorMsg && !loading" class="bg-red text-white rounded-borders q-mt-md">
        {{ errorMsg }}
      </q-banner>
      <div v-if="!showDragSlide && !loading && !isExpired" class="q-mt-md">
            <q-btn
              no-caps
              :label="$t('Confirm')"
          class="full-width"
              @click="showDragSlide = true"
            />
          </div>
    </div>
    <DragSlide
      v-if="showDragSlide && !loading && !isExpired"
      @swiped="onSwipe"
      class="fixed-bottom drag-slide"
    />
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ellipsisText, formatTimestampToText } from "src/wallet/anyhedge/formatters";
import { JSONPaymentProtocol } from "src/wallet/payment-uri"
import { Wallet } from "src/wallet/index"
import DragSlide from "./drag-slide.vue";
import { useQuasar } from "quasar";
import { useStore } from "vuex"
import { computed, inject, ref, watch, onMounted, onUnmounted, nextTick } from "vue"
import { useI18n } from "vue-i18n"
import SecurityCheckDialog from "./SecurityCheckDialog.vue";
import { formatWithLocale, getDenomDecimals } from 'src/utils/denomination-utils'
import { convertToFiatAmount } from 'src/utils/send-page-utils'

const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const $emit = defineEmits([
  'paid',
])

const props = defineProps({
  jpp: {
    type: JSONPaymentProtocol,
    required: true,
  },
  wallet: {
    type: Wallet,
    required: true,
  }
})

// Computed properties for send page form styling
const denomination = computed(() => $store.getters['global/denomination'] || 'BCH')

const currentSendPageCurrency = computed(() => {
  const currency = $store.getters['market/selectedCurrency']
  return () => currency?.symbol || 'USD'
})

const selectedAssetMarketPrice = computed(() => {
  const currency = currentSendPageCurrency.value()
  return $store.getters['market/getAssetPrice']('bch', currency)
})

const totalBCHAmount = computed(() => props.jpp?.total / 10 ** 8 || 0)

const amountFormatted = computed(() => {
  if (!totalBCHAmount.value) return '0'
  const { convert, decimal } = getDenomDecimals(denomination.value)
  const calculatedAmount = (totalBCHAmount.value * convert).toFixed(decimal)
  return formatWithLocale(calculatedAmount, { max: decimal })
})

const fiatFormatted = computed(() => {
  if (!totalBCHAmount.value || !selectedAssetMarketPrice.value) return ''
  const fiatAmount = convertToFiatAmount(totalBCHAmount.value, selectedAssetMarketPrice.value)
  if (!fiatAmount) return ''
  return formatWithLocale(fiatAmount, { min: 2, max: 2 })
})

function formatRecipientAmount(amount) {
  const bchAmount = amount / 10 ** 8
  if (!bchAmount) return '0'
  const { convert, decimal } = getDenomDecimals(denomination.value)
  const calculatedAmount = (bchAmount * convert).toFixed(decimal)
  return formatWithLocale(calculatedAmount, { max: decimal })
}

function formatRecipientToken(output) {
  if (output?.token?.nft) {
    return 'NFT'
  }
  if (output?.token?.category) {
    return formatTokenAmount({ category: output.token.category, amount: output.token.amount })
  }
  return ''
}

function formatRecipientFiatAmount(amount) {
  const bchAmount = amount / 10 ** 8
  if (!bchAmount || !selectedAssetMarketPrice.value) return ''
  const fiatAmount = convertToFiatAmount(bchAmount, selectedAssetMarketPrice.value)
  if (!fiatAmount) return ''
  return formatWithLocale(fiatAmount, { min: 2, max: 2 })
}

const isNFT = computed(() => {
  return props.jpp?.nfts?.length > 0 || 
         props.jpp?.parsed?.outputs?.some(output => output?.token?.nft)
})

const isExpired = computed(() => {
  if (!props.jpp) return false
  // Check if JPP has expired getter
  if (typeof props.jpp.expired === 'boolean') {
    return props.jpp.expired
  }
  // Fallback: check expiration date directly
  if (props.jpp?.parsed?.expires) {
    const expires = new Date(props.jpp.parsed.expires).getTime()
    return Date.now() > expires
  }
  return false
})

function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

function txLink(txid) {
  return `https://explorer.paytaca.com/tx/${txid}`
}


const showDragSlide = ref(true)
const expirationCountdown = ref('')
const loadingStateRef = ref(null)
let countdownInterval = null

function formatCountdown(timeLeft) {
  if (timeLeft <= 0) {
    return $t('Expired', {}, 'Expired')
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days} ${days === 1 ? $t('Day', {}, 'day') : $t('Days', {}, 'days')}, ${hours} ${hours === 1 ? $t('Hour', {}, 'hour') : $t('Hours', {}, 'hours')}`
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? $t('Hour', {}, 'hour') : $t('Hours', {}, 'hours')}, ${minutes} ${minutes === 1 ? $t('Minute', {}, 'minute') : $t('Minutes', {}, 'minutes')}`
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? $t('Minute', {}, 'minute') : $t('Minutes', {}, 'minutes')}, ${seconds} ${seconds === 1 ? $t('Second', {}, 'second') : $t('Seconds', {}, 'seconds')}`
  } else {
    return `${seconds} ${seconds === 1 ? $t('Second', {}, 'second') : $t('Seconds', {}, 'seconds')}`
  }
}

function updateCountdown() {
  if (!props.jpp?.parsed?.expires) {
    expirationCountdown.value = ''
    return
  }

  const expires = new Date(props.jpp.parsed.expires).getTime()
  const now = Date.now()
  const timeLeft = expires - now

  expirationCountdown.value = formatCountdown(timeLeft)

  if (timeLeft <= 0 && countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

onMounted(() => {
  if (props.jpp?.parsed?.expires) {
    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000)
  }
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

watch(() => props.jpp?.parsed?.expires, () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  if (props.jpp?.parsed?.expires) {
    updateCountdown()
    countdownInterval = setInterval(updateCountdown, 1000)
  }
})

function onSwipe(reset = () => {}) {
  // Prevent payment if expired
  if (isExpired.value) {
    $q.notify({
      message: $t('InvoiceExpired', {}, 'This invoice has expired and cannot be paid'),
      color: 'red',
      icon: 'error',
      timeout: 3000
    })
    reset()
    return
  }
  
  $q.dialog({ component: SecurityCheckDialog })
    .onOk(() => completePayment())
    .onDismiss(() => reset())
}


watch(() => [props.jpp?.parsed?.paymentId], () => {
  errorMsg.value = ''
})
const loading = ref(false)
const loadingMsg = ref('')
const errorMsg = ref('')
function completePayment() {
  // Double-check expiration before proceeding
  if (isExpired.value) {
    errorMsg.value = $t('InvoiceExpired', {}, 'This invoice has expired and cannot be paid')
    return
  }
  
  errorMsg.value = ''
  loading.value = true
  loadingMsg.value = 'Completing payment'
  
  // Scroll to loading state to make it visible
  nextTick(() => {
    if (loadingStateRef.value) {
      loadingStateRef.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
  Promise.resolve({ skip: false })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Preparing transaction'
      await props.jpp.prepareTransaction(props.wallet)
      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in preparing transaction'
      }
      return {skip: true}
    })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Verifying transaction'
      await props.jpp.verifyPayment()

      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in verifying transaction'
      }
      return {skip: true}
    })
    .then(async ({skip}) => {
      if (skip) return {skip}
      loadingMsg.value = 'Completing payment'
      await props.jpp.pay()
      $emit('paid', props.jpp.txids)
      return { skip: false }
    })
    .catch(error => {
      console.error(error)
      if (error?.name === 'JsonPaymentProtocolError' && typeof error?.message === 'string') {
        errorMsg.value = error.message
      } else {
        errorMsg.value = 'Encountered error in completing payment'
      }
      return {skip: true}
    })
    .finally(() => {
      loading.value = false
      loadingMsg.value = ''
    })
}

function formatTokenAmount(tokenData) {
  const category = tokenData?.category
  const asset = $store.getters['assets/getAssets']?.find(asset => asset?.id === `ct/${category}`)
  if (!asset) return tokenData?.amount

  const decimals = parseInt(asset?.decimals) || 0
  const parsedAmount = tokenData?.amount / 10 ** decimals
  if (!parsedAmount) return tokenData?.amount
  const symbol = asset?.symbol
  return `${parsedAmount} ${symbol}`
}
</script>

<style lang="scss" scoped>
  .jpp-payment-container {
    min-height: 100%;
  }

  .memo-section {
    .memo-text {
      font-size: 15px;
      line-height: 1.5;
      word-break: break-word;
      padding: 12px 0;
    }
  }

  .expiration-countdown {
    .countdown-text {
      font-size: 13px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }
  }

  .loading-state {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .section-header {
    display: flex;
    align-items: center;
  }

  .recipients-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .recipient-card {
    padding: 16px;
    border-radius: 12px;
    transition: all 0.2s ease;
    
    &.dark {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    &.light {
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
  }

  .recipient-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .recipient-number {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.7;
    padding: 4px 8px;
    border-radius: 6px;
    
    .dark & {
      background: rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.7);
    }
    
    .light & {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.7);
    }
  }

  .recipient-amount {
    text-align: right;
    
    .amount-primary {
      font-size: 16px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      color: #3b7bf6;
      line-height: 1.3;
    }
    
    .amount-secondary {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 2px;
      line-height: 1.3;
    }
  }

  .recipient-address-section {
    cursor: pointer;
    padding: 10px;
      border-radius: 8px;
    transition: background-color 0.2s ease;
    
    .dark & {
      background: rgba(255, 255, 255, 0.02);
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
    
    .light & {
      background: rgba(0, 0, 0, 0.02);
      
      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }
    }
  }

  .recipient-address {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    word-break: break-all;
      display: flex;
    align-items: center;
      gap: 6px;
    line-height: 1.4;
    
    .copy-icon {
      opacity: 0.5;
      transition: opacity 0.2s ease;
      flex-shrink: 0;
    }
    
    &:hover .copy-icon {
      opacity: 1;
    }
  }

  .recipient-description {
    .description-text {
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
      padding: 8px 0;
    }
    }

    .recipient-token {
      display: flex;
      align-items: center;
    font-size: 13px;
    opacity: 0.8;
    padding: 6px 0;
  }

  .total-section {
    padding: 16px;
    border-radius: 12px;
    
    .dark & {
      background: rgba(59, 123, 246, 0.08);
      border: 1px solid rgba(59, 123, 246, 0.2);
    }
    
    .light & {
      background: rgba(59, 123, 246, 0.05);
      border: 1px solid rgba(59, 123, 246, 0.15);
    }
  }

  .total-amounts {
    text-align: right;
    
    .total-amount-primary {
      font-size: 20px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: #3b7bf6;
      line-height: 1.3;
    }
    
    .total-amount-secondary {
      font-size: 14px;
      opacity: 0.8;
      margin-top: 4px;
      line-height: 1.3;
    }
    }

    .total-token {
      font-size: 13px;
      opacity: 0.85;
      font-weight: 500;
  }

  .info-item {
    display: flex;
    flex-direction: column;
  }

  .info-value {
    font-size: 14px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.4;
    flex: 1;
    min-width: 0;
  }

  // Expansion Items - Minimal styling
  .details-expansion {
    :deep(.q-item) {
      padding: 8px 0;
      min-height: auto;
    }

    :deep(.q-expansion-item__content) {
      padding: 0;
    }

    :deep(.q-focusable) {
      border-radius: 0;
    }
  }

  .drag-slide {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1500;
  }

  .address-popup {
    max-width: 80vw;
    border-radius: 12px;
  }

  .expiration-banner {
    padding: 16px;
    border-radius: 16px;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 20px rgba(244, 67, 54, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &.dark {
      background: linear-gradient(
        to right bottom,
        rgba(244, 67, 54, 0.25),
        rgba(229, 57, 53, 0.25),
        rgba(211, 47, 47, 0.25)
      );
      border: 1px solid rgba(244, 67, 54, 0.3);
      
      .expiration-icon {
        color: #ff6b6b;
      }
      
      .expiration-title {
        color: #ffcdd2;
      }
      
      .expiration-subtitle {
        color: rgba(255, 205, 210, 0.8);
      }
    }
    
    &.light {
      background: linear-gradient(
        to right bottom,
        rgba(244, 67, 54, 0.15),
        rgba(229, 57, 53, 0.15),
        rgba(211, 47, 47, 0.15)
      );
      border: 1px solid rgba(244, 67, 54, 0.25);
      
      .expiration-icon {
        color: #d32f2f;
      }
      
      .expiration-title {
        color: #c62828;
      }
      
      .expiration-subtitle {
        color: rgba(198, 40, 40, 0.8);
      }
    }
  }
</style>




