<template>
  <div>
    <q-card class="pt-card text-bow payment-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pb-none" style="margin-top: -3.5em;">
          <div class="text-h5 text-weight-bold q-mb-md">{{$t('Payment')}}</div>
          
          <!-- Collapsible Technical Details Section -->
          <q-expansion-item
            v-model="showDetails"
            :label="$t('PaymentDetails', {}, 'Payment Details')"
            :caption="showDetails ? '' : $t('TapToViewDetails', {}, 'Tap to view details')"
            header-class="details-header"
            :class="darkMode ? 'details-expansion-dark' : 'details-expansion-light'"
            dense
            dense-toggle
            class="q-mb-md details-expansion"
          >
            <template v-slot:header>
              <div class="row items-center full-width">
                <q-icon name="info_outline" size="sm" class="q-mr-sm" />
                <div class="col">
                  <div class="text-caption text-weight-medium" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                    {{ showDetails ? $t('PaymentDetails', {}, 'Payment Details') : $t('ShowPaymentDetails', {}, 'Show payment details') }}
                  </div>
                </div>
                <q-icon :name="showDetails ? 'expand_less' : 'expand_more'" size="sm" />
              </div>
            </template>

            <div class="info-section q-mt-sm q-mb-md">
              <!-- Payment ID -->
              <div class="info-item">
                <div class="info-label" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                  {{$t('PaymentID')}}
                </div>
                <div class="info-value row items-center no-wrap">
                  <div class="ellipsis-multiline">#{{ jpp?.parsed?.paymentId }}</div>
                  <q-btn
                    flat
                    dense
                    round
                    icon="content_copy"
                    size="sm"
                    class="q-ml-xs"
                    @click="copyToClipboard(jpp?.parsed?.paymentId, $t('PaymentIdCopied'))"
                  />
                </div>
              </div>

              <!-- Payment URL -->
              <div v-if="jpp?.parsed?.paymentUrl" class="info-item">
                <div class="info-label" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                  {{$t('URL')}}
                </div>
                <div class="info-value row items-center no-wrap">
                  <div class="ellipsis-multiline">{{ jpp?.parsed?.paymentUrl }}</div>
                  <q-btn
                    flat
                    dense
                    round
                    icon="content_copy"
                    size="sm"
                    class="q-ml-xs"
                    @click="copyToClipboard(jpp?.parsed?.paymentUrl, $t('LinkCopied'))"
                  />
                </div>
              </div>

              <!-- Created & Expires -->
              <div class="row q-col-gutter-md">
                <div v-if="jpp?.parsed?.time" class="col-6">
                  <div class="info-item">
                    <div class="info-label" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{$t('Created')}}
                    </div>
                    <div class="info-value-small">{{ formatTimestampToText(jpp?.parsed?.time) }}</div>
                  </div>
                </div>
                <div v-if="jpp?.parsed?.expires" class="col-6">
                  <div class="info-item">
                    <div class="info-label" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{$t('Expires')}}
                    </div>
                    <div class="info-value-small">{{ formatTimestampToText(jpp?.parsed?.expires) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </q-expansion-item>

          <!-- Memo Section -->
          <div v-if="jpp?.parsed?.memo" class="memo-section q-mb-md">
            <div class="info-label q-mb-xs" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{$t('Memo')}}
            </div>
            <div class="memo-content" :class="darkMode ? 'memo-dark' : 'memo-light'">
              {{ jpp.parsed?.memo }}
            </div>
          </div>
          <!-- Recipients Section -->
          <div class="recipients-section q-mb-md">
            <!-- Recipient Summary (Always Visible) -->
            <div class="recipient-summary q-mb-sm" :class="darkMode ? 'summary-dark' : 'summary-light'">
              <div class="row items-center no-wrap">
                <q-icon name="people_outline" size="sm" class="q-mr-sm" />
                <div class="col">
                  <div class="summary-text">
                    {{ jpp?.parsed?.outputs?.length }} 
                    {{ jpp?.parsed?.outputs?.length === 1 ? $t('Recipient', {}, 'Recipient') : $t('Recipients', {}, 'Recipients') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Expandable Recipient Details -->
            <q-expansion-item
              v-model="showRecipients"
              :label="$t('Recipients', {}, 'Recipients')"
              header-class="recipients-header"
              :class="darkMode ? 'recipients-expansion-dark' : 'recipients-expansion-light'"
              dense
              dense-toggle
              class="recipients-expansion"
            >
              <template v-slot:header>
                <div class="row items-center full-width">
                  <div class="col">
                    <div class="text-caption text-weight-medium" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                      {{ showRecipients ? $t('HideRecipientAddresses', {}, 'Hide recipient addresses') : $t('ShowRecipientAddresses', {}, 'Show recipient addresses') }}
                    </div>
                  </div>
                  <q-icon :name="showRecipients ? 'expand_less' : 'expand_more'" size="sm" />
                </div>
              </template>

              <div class="recipients-list q-mt-sm">
                <div
                  v-for="(output, index) in jpp?.parsed?.outputs?.slice(0,10)"
                  :key="index"
                  class="recipient-item"
                  :class="darkMode ? 'recipient-dark' : 'recipient-light'"
                >
                  <div class="recipient-header">
                    <span class="recipient-number">#{{ index+1 }}</span>
                    <span class="recipient-amount">{{ output.amount / 10 ** 8 }} BCH</span>
                  </div>
                  <div class="recipient-address">
                    {{ ellipsisText(output.address, {start: 20, end: 8 }) }}
                  </div>
                  <div v-if="output?.token?.category" class="recipient-token">
                    <q-icon name="token" size="xs" class="q-mr-xs"/>
                    <span v-if="output?.token?.nft" class="text-brandblue">
                      NFT
                    </span>
                    <span v-else>
                      {{ formatTokenAmount(output?.token) }}
                    </span>
                  </div>
                  <q-popup-proxy :breakpoint="0">
                    <div
                      class="text-body2 pt-card pt-label address-popup q-pa-md"
                      :class="getDarkModeClass(darkMode)"
                    >
                      <div class="text-caption text-grey">Recipient:</div>
                      <div class="q-mb-sm" style="word-break: break-all;">{{ output.address }}</div>

                      <div v-if="output?.token?.category" class="q-mt-sm">
                        <div class="text-caption text-grey">Token:</div>
                        <div v-ripple style="position: relative; word-break: break-all;" class="cursor-pointer q-pa-xs" @click="copyToClipboard(output?.token?.category)">
                          {{ output?.token?.category }}
                          <q-icon name="content_copy" size="xs" class="q-ml-xs"/>
                        </div>
                        
                        <div v-if="output?.token?.amount" class="q-mt-sm">
                          <div class="text-caption text-grey">Token amount:</div>
                          <div>{{ formatTokenAmount(output?.token) }}</div>
                        </div>

                        <div v-if="output?.token?.nft" class="q-mt-sm">
                          <div class="text-caption text-grey">
                            NFT:
                            <q-badge>{{ output?.token?.nft?.capability }}</q-badge>
                          </div>
                          <div style="word-break: break-all;">{{ output?.token?.nft?.commitment }}</div>
                        </div>
                      </div>
                    </div>
                  </q-popup-proxy>
                </div>
                
                <div v-if="jpp?.parsed?.outputs?.length > 10" class="text-center q-mt-sm text-caption" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
                  {{
                    $t(
                      "AndMoreAddresses",
                      { addressCount: jpp?.parsed?.outputs?.length - 10 },
                      `and ${jpp?.parsed?.outputs?.length - 10} more addresses`
                    )
                  }}
                </div>
              </div>
            </q-expansion-item>

            <!-- Total Section -->
            <div class="total-section q-mt-md" :class="darkMode ? 'total-dark' : 'total-light'">
              <div class="total-label">{{ $t('Total') }}</div>
              <div class="total-amount">{{ jpp.total / 10 ** 8 }} BCH</div>
              <template v-if="jpp?.tokenAmounts?.length">
                <div v-for="(tokenData, index) in jpp?.tokenAmounts" :key="index" class="total-token">
                  {{ formatTokenAmount(tokenData) }}
                </div>
              </template>
              <div v-if="jpp?.nfts?.length" class="total-token">
                {{ jpp?.nfts?.length }}
                {{ jpp?.nfts?.length === 1 ? 'NFT' : 'NFTs' }}
              </div>
            </div>
          </div>
          <div v-if="jpp.txids.length">
            <div class="text-subtitle1 transactions">
              <template v-if="jpp.txids.length > 1">
                {{ $t('Transactions') }}
              </template>
              <template v-else>
                {{ $t('Transaction') }}
              </template>
            </div>
            <div v-for="(txid, index) in jpp.txids" :key="index" class="row items-center">
              <div class="q-space ellipsis">{{ ellipsisText(txid, {start: 10, end: 10 }) }}</div>
              <div class="row q-gutter-x-sm">
                <q-btn size="0.7em" padding="0.8em" rounded icon="content_copy" @click="copyToClipboard(txid)"/>
                <q-btn size="0.7em" padding="0.8em" rounded icon="open_in_new" target="_blank" :href="txLink(txid)"/>
              </div>
            </div>
          </div>
          <div v-if="loading" class="column items-center">
            <q-spinner size="2em"/>
            <div>{{ loadingMsg }}</div>
          </div>
          <q-banner v-else-if="errorMsg" class="bg-red text-white rounded-borders">
            {{ errorMsg }}
          </q-banner>
          <div v-if="!showDragSlide && !loading" class="q-mt-sm">
            <q-btn
              no-caps
              :label="$t('Confirm')"
              class="full-width button"
              @click="showDragSlide = true"
            />
          </div>
        </q-card-section>
    </q-card>
    <DragSlide
      v-if="showDragSlide && !loading"
      @swiped="onSwipe()"
      class="fixed-bottom drag-slide"
    />
  </div>
</template>
<script setup>
import { ellipsisText, formatTimestampToText } from "src/wallet/anyhedge/formatters";
import { computed, inject, ref, watch } from "vue"
import { useStore } from "vuex"
import { useQuasar } from "quasar";
import { JSONPaymentProtocol } from "src/wallet/payment-uri"
import { Wallet } from "src/wallet/index"
import DragSlide from "./drag-slide.vue";
import SecurityCheckDialog from "./SecurityCheckDialog.vue";
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
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
  return `https://blockchair.com/bitcoin-cash/transaction/${txid}/`
}


const showDetails = ref(false)
const showRecipients = ref(false)
const showDragSlide = ref(true)

function onSwipe() {
  $q.dialog({
    component: SecurityCheckDialog,
  })
    .onOk(() => completePayment())
    .onDismiss(() => {
      showDragSlide.value = false
    })
}

watch(() => [props.jpp?.parsed?.paymentId], () => {
  errorMsg.value = ''
})
const loading = ref(false)
const loadingMsg = ref('')
const errorMsg = ref('')
function completePayment() {
  errorMsg.value = ''
  loading.value = true
  loadingMsg.value = 'Completing payment'
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
  .payment-card {
    border-radius: 16px;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .info-value {
    font-size: 14px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.4;
  }

  .info-value-small {
    font-size: 13px;
    line-height: 1.4;
  }

  .ellipsis-multiline {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
    font-family: 'Courier New', monospace;
  }

  // Expansion Items Styling
  .details-expansion, .recipients-expansion {
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 8px;
    
    &.details-expansion-dark, &.recipients-expansion-dark {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    &.details-expansion-light, &.recipients-expansion-light {
      background: rgba(0, 0, 0, 0.01);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    :deep(.q-item) {
      padding: 10px 12px;
    }

    :deep(.q-expansion-item__content) {
      padding: 0 12px 12px 12px;
    }
  }

  .recipient-summary {
    padding: 12px 16px;
    border-radius: 10px;
    
    &.summary-dark {
      background: rgba(59, 123, 246, 0.08);
      border: 1px solid rgba(59, 123, 246, 0.2);
    }
    
    &.summary-light {
      background: rgba(59, 123, 246, 0.05);
      border: 1px solid rgba(59, 123, 246, 0.15);
    }

    .summary-text {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
  }

  .memo-section {
    .memo-content {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
      
      &.memo-dark {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      &.memo-light {
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }
    }
  }

  .recipients-section {
    .recipients-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .recipient-item {
      padding: 12px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s ease;
      
      &.recipient-dark {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
        }
      }
      
      &.recipient-light {
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid rgba(0, 0, 0, 0.06);
        
        &:hover {
          background: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.1);
        }
      }
    }

    .recipient-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .recipient-number {
      font-size: 11px;
      opacity: 0.6;
      font-weight: 500;
    }

    .recipient-amount {
      font-size: 13px;
      font-weight: 600;
      font-family: 'Courier New', monospace;
    }

    .recipient-address {
      font-size: 12px;
      font-family: 'Courier New', monospace;
      opacity: 0.85;
      cursor: pointer;
      word-break: break-all;
    }

    .recipient-token {
      display: flex;
      align-items: center;
      font-size: 11px;
      opacity: 0.75;
      margin-top: 2px;
    }
  }

  .total-section {
    padding: 16px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    &.total-dark {
      background: rgba(59, 123, 246, 0.1);
      border: 2px solid rgba(59, 123, 246, 0.3);
    }
    
    &.total-light {
      background: rgba(59, 123, 246, 0.08);
      border: 2px solid rgba(59, 123, 246, 0.25);
    }

    .total-label {
      font-size: 13px;
      font-weight: 600;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .total-amount {
      font-size: 22px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
      color: #3b7bf6;
    }

    .total-token {
      font-size: 13px;
      opacity: 0.85;
      font-weight: 500;
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

  .transactions {
    margin-bottom: -8px;
  }
</style>
