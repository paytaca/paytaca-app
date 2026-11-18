<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">{{ $t('CodContractDetails', {}, 'COD contract details') }}</div>
          <q-btn flat icon="close" padding="sm" v-close-popup class="close-button" />
        </div>

        <div class="row items-center q-mb-sm">
          <q-chip dense :color="statusColor" text-color="white" class="text-weight-medium">
            {{ statusText || $t('None') }}
          </q-chip>
        </div>

        <div
          v-if="codContract?.address"
          class="q-mb-md rounded-borders q-pa-sm"
          style="position: relative;"
          v-ripple
          @click="copyToClipboard(codContract.address)"
        >
          <div class="text-caption text-grey">{{ $t('ContractAddress', {}, 'Contract address') }}</div>
          <div class="row items-start no-wrap">
            <div class="q-space" style="word-break: break-all;">{{ codContract.address }}</div>
            <q-icon name="content_copy" class="q-ml-sm q-mt-xs"/>
          </div>
        </div>

        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-12" :class="hasTokenAmount ? 'col-sm-6' : ''">
            <div class="rounded-borders q-pa-sm">
              <div class="text-caption text-grey">{{ $t('BCHAmount', {}, 'BCH amount') }}</div>
              <div class="text-h6">{{ bchAmountText }}</div>
              <div v-if="bchFiatValueText" class="text-caption text-grey">{{ bchFiatValueText }}</div>
            </div>
          </div>

          <div v-if="hasTokenAmount" class="col-12 col-sm-6">
            <div class="rounded-borders q-pa-sm">
              <div class="row items-center">
                <div class="text-caption text-grey q-space">
                  {{ $t('PlatformTokenAmount', {}, 'Platform token amount') }}
                </div>
                <q-spinner v-if="fetchingTokenMetadata" size="xs" />
              </div>
              <div class="text-h6">{{ tokenAmountText }}</div>
              <div v-if="tokenFiatValueText" class="text-caption text-grey">{{ tokenFiatValueText }}</div>
              <div v-if="tokenMetadata?.name" class="text-caption text-grey ellipsis">
                {{ tokenMetadata.name }}
              </div>
            </div>
          </div>
        </div>

        <q-list separator style="max-height: 55vh; overflow: auto;">
          <q-item v-if="arbiterTimeoutBlocks != null">
            <q-item-section avatar>
              <q-icon name="schedule"/>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('ArbiterTimeout', {}, 'Arbiter timeout') }}</q-item-label>
              <q-item-label caption>
                {{ $t('ArbiterTimeoutDescription', {}, 'Blocks after funding before the arbiter can resolve this contract.') }}
              </q-item-label>
            </q-item-section>
            <q-item-section side top>
              <q-item-label>{{ arbiterTimeoutText }}</q-item-label>
              <q-item-label v-if="arbiterTimeoutDuration" caption>~{{ arbiterTimeoutDuration }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-expansion-item
            v-if="addressRows.length"
            icon="account_balance_wallet"
            :label="$t('Addresses', {}, 'Addresses')"
            dense
            switch-toggle-side
          >
            <q-list separator>
              <q-item
                v-for="row in addressRows"
                :key="row.label"
                clickable
                v-ripple
                @click="copyToClipboard(row.value)"
              >
                <q-item-section>
                  <q-item-label caption>{{ row.label }}</q-item-label>
                  <q-item-label style="word-break: break-all;">{{ row.value }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="content_copy"/>
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>

          <q-expansion-item
            v-if="hasContractDetails"
            icon="info_outline"
            :label="$t('Details', {}, 'Details')"
            dense
            switch-toggle-side
          >
            <q-list separator>
              <q-item
                v-if="codContract?.tokenCategory"
                clickable
                v-ripple
                @click="copyToClipboard(codContract.tokenCategory)"
              >
                <q-item-section>
                  <q-item-label caption>{{ $t('TokenCategory', {}, 'Token category') }}</q-item-label>
                  <q-item-label style="word-break: break-all;">{{ codContract.tokenCategory }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="content_copy"/>
                </q-item-section>
              </q-item>

              <q-item v-if="codContract?.contractVersion">
                <q-item-section>
                  <q-item-label caption>{{ $t('ContractVersion', {}, 'Contract version') }}</q-item-label>
                  <q-item-label>{{ codContract.contractVersion }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="codContract?.addressType">
                <q-item-section>
                  <q-item-label caption>{{ $t('AddressType', {}, 'Address type') }}</q-item-label>
                  <q-item-label>{{ codContract.addressType }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="timestampText">
                <q-item-section>
                  <q-item-label caption>{{ $t('Timestamp') }}</q-item-label>
                  <q-item-label>{{ timestampText }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { CODContract, FungibleCashToken } from 'src/marketplace/objects'
import { cachedBackend } from 'src/marketplace/backend'
import { formatDuration, formatTimestampToText } from 'src/marketplace/utils'
import { formatWithLocale, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { capitalize, computed, inject, ref, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  codContract: { type: Object, default: () => CODContract.parse() },
  bchPrice: { type: Object, default: () => null },
  tokenPrices: { type: Array, default: () => [] },
  currency: { type: String, default: '' },
})
const emit = defineEmits([
  'update:modelValue',

  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const { t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const $copyText = inject('$copyText')
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const { dialogRef, onDialogHide } = useDialogPluginComponent()

const innerVal = ref(props.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => emit('update:modelValue', innerVal.value))

const statusText = computed(() => {
  const status = props.codContract?.status
  if (!status) return ''
  return capitalize(String(status).replaceAll('_', ' '))
})
const statusColors = {
  pending: 'amber',
  platform_funded: 'blue',
  rider_funded: 'blue',
  ready: 'blue',
  cash_collected: 'green',
  settled: 'green',
  refunded: 'red',
  cancelled: 'grey',
  failed: 'red',
}
const statusColor = computed(() => statusColors[props.codContract?.status] || 'grey')

const addressRows = computed(() => [
  { label: t('MerchantAddress'), value: props.codContract?.merchantAddress },
  { label: t('PlatformAddress', {}, 'Platform address'), value: props.codContract?.platformAddress },
  { label: t('ArbiterAddress'), value: props.codContract?.arbiterAddress },
  { label: t('RiderAddress', {}, 'Rider address'), value: props.codContract?.riderAddress },
].filter(row => Boolean(row.value)))

const timestampText = computed(() => {
  const timestamp = props.codContract?.timestamp
  if (!timestamp) return ''
  return formatTimestampToText(timestamp)
})

const tokenMetadata = ref(null)
const fetchingTokenMetadata = ref(false)
let tokenMetadataRequestId = 0
watch(() => props.codContract?.tokenCategory, fetchTokenMetadata, { immediate: true })

async function fetchTokenMetadata(category) {
  const requestId = ++tokenMetadataRequestId
  tokenMetadata.value = null

  if (!category) {
    fetchingTokenMetadata.value = false
    return
  }

  fetchingTokenMetadata.value = true
  try {
    const response = await cachedBackend.get(`cashtokens/fungible/${category}/`)
    if (requestId !== tokenMetadataRequestId) return
    tokenMetadata.value = response?.data?.category
      ? FungibleCashToken.parse(response.data)
      : null
  } catch {
    if (requestId === tokenMetadataRequestId) tokenMetadata.value = null
  } finally {
    if (requestId === tokenMetadataRequestId) fetchingTokenMetadata.value = false
  }
}

const bchPriceData = computed(() => {
  if (Number.isFinite(Number(props.bchPrice?.price))) return props.bchPrice
  if (Number.isFinite(Number(props.codContract?.bchPrice?.price))) return props.codContract.bchPrice
  return null
})

const tokenPriceData = computed(() => {
  const category = props.codContract?.tokenCategory
  if (!category) return null

  const currencyCode = `ct/${category}`
  const paymentTokenPrice = props.tokenPrices?.find(tokenPrice => {
    return tokenPrice?.currency?.code === currencyCode
  })
  if (paymentTokenPrice) return paymentTokenPrice
  if (props.codContract?.tokenPrice?.currency?.code === currencyCode) {
    return props.codContract.tokenPrice
  }
  return null
})

const currencyCode = computed(() => {
  return props.currency ||
    bchPriceData.value?.currency?.symbol ||
    bchPriceData.value?.currency?.code ||
    ''
})

const hasTokenAmount = computed(() => props.codContract?.platformTokenAmount != null)

const bchAmountText = computed(() => {
  const amount = Number(props.codContract?.bchAmount)
  if (!Number.isFinite(amount)) return ''
  return `${formatWithLocale(amount, { max: 8 })} BCH`
})

const hasTokenDecimals = computed(() => {
  const decimals = tokenMetadata.value?.decimals ?? tokenPriceData.value?.decimals
  return Number.isFinite(Number(decimals))
})

const tokenDecimals = computed(() => {
  if (!hasTokenDecimals.value) return 0
  const decimals = tokenMetadata.value?.decimals ?? tokenPriceData.value?.decimals
  return Number(decimals)
})

const tokenAmount = computed(() => {
  const units = Number(props.codContract?.platformTokenAmount)
  if (!Number.isFinite(units)) return null
  return units / 10 ** tokenDecimals.value
})

const tokenAmountText = computed(() => {
  if (tokenAmount.value == null) return ''
  if (fetchingTokenMetadata.value && !hasTokenDecimals.value) return '…'

  const formattedAmount = formatWithLocale(tokenAmount.value, { max: tokenDecimals.value })
  const symbol = tokenMetadata.value?.symbol || tokenPriceData.value?.currency?.symbol
  return symbol ? `${formattedAmount} ${symbol}` : formattedAmount
})

const bchFiatValue = computed(() => {
  const amount = Number(props.codContract?.bchAmount)
  const price = Number(bchPriceData.value?.price)
  if (!Number.isFinite(amount) || !Number.isFinite(price) || price <= 0) return null
  return amount * price
})

const tokenFiatValue = computed(() => {
  if (!hasTokenDecimals.value) return null

  const units = Number(props.codContract?.platformTokenAmount)
  const tokenPrice = Number(tokenPriceData.value?.price)
  const bchPrice = Number(bchPriceData.value?.price)
  if (!Number.isFinite(units) || !Number.isFinite(tokenPrice) || tokenPrice <= 0) return null
  if (!Number.isFinite(bchPrice) || bchPrice <= 0) return null

  const wholeTokens = units / 10 ** tokenDecimals.value
  return wholeTokens * (bchPrice / tokenPrice)
})

const bchFiatValueText = computed(() => formatFiatValueText(bchFiatValue.value))
const tokenFiatValueText = computed(() => formatFiatValueText(tokenFiatValue.value))

function formatFiatValueText(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''
  const formattedValue = currencyCode.value
    ? parseFiatCurrency(amount, currencyCode.value)
    : formatWithLocale(amount, { max: 2 })
  return `≈ ${formattedValue}`
}

const arbiterTimeoutBlocks = computed(() => {
  const value = props.codContract?.arbiterTimeout
  if (value == null || value === '') return null

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? Math.max(Math.round(parsedValue), 0) : null
})

const arbiterTimeoutText = computed(() => {
  if (arbiterTimeoutBlocks.value == null) return ''
  if (arbiterTimeoutBlocks.value <= 0) return t('ArbiterTimeoutImmediate', {}, 'Immediately after funding')

  const blocks = formatWithLocale(arbiterTimeoutBlocks.value, { max: 0 })
  return t('ArbiterTimeoutBlocks', { blocks }, '{blocks} blocks')
})

const arbiterTimeoutDuration = computed(() => {
  if (!arbiterTimeoutBlocks.value || arbiterTimeoutBlocks.value <= 0) return ''
  const seconds = arbiterTimeoutBlocks.value * 10 * 60
  return formatDuration(seconds, { roundDecimals: 1 })
})

const hasContractDetails = computed(() => Boolean(
  props.codContract?.tokenCategory ||
  props.codContract?.contractVersion ||
  props.codContract?.addressType ||
  timestampText.value
))

function copyToClipboard(value) {
  if (!value) return
  $copyText(value)
  $q.notify({
    message: t('CopiedToClipboard'),
    timeout: 800,
    icon: 'mdi-clipboard-check',
    color: 'blue-9',
  })
}
</script>
