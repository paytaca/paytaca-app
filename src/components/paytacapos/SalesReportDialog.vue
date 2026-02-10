<template>
  <q-dialog ref="dialogRef" v-model="innerVal" @hide="onDialogHide" seamless class="no-click-outside">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:max(300px, 90vw);">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> {{ $t('SalesReport', {}, 'Sales Report') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm q-py-xs">
        <div v-if="Number.isInteger(posDevice?.posid)" class="text-h6">
          {{ posDevice?.name || 'Device' }}#{{ padPosId(posDevice?.posid) }}
        </div>
        <q-card class="pt-card">
          <q-card-section>
            <div class="row items-start">
              <div class="q-space text-subtitle1">{{ $t('TotalSales') }}</div>
              <div class="text-right">
                <div class="text-subtitle1">{{ getAssetDenomination(denomination, totalSales.total) }}</div>
                <div
                  v-if="totalSales?.tokenAmounts?.length"
                  class="text-caption q-r-mt-sm q-mb-xs"
                  style="display: grid; grid-template-columns: auto auto; column-gap: 4px;"
                >
                  <template v-for="tokenAmount in totalSales?.tokenAmounts" :key="tokenAmount?.category">
                    <div>{{ tokenAmount?.parsedAmount }}</div>
                    <div>{{ tokenAmount?.symbol }}</div>
                  </template>
                </div>
                <q-separator v-if="totalSales?.tokenAmounts?.length && totalSales.totalMarketValue && totalSales.currency"/>
                <div v-if="(totalSales.totalMarketValue && totalSales.currency)" class="text-subtitle2">
                  {{ parseFiatCurrency(totalSales.totalMarketValue, totalSales.currency) }}
                </div>
              </div>
            </div>
            <q-separator :dark="darkMode" spaced/>
            <div class="row items-start">
              <div class="q-space">
                <div>{{ $t('Range') }}: {{ formatRangeType(salesReportData?.range_type) }}</div>
                <div v-if="salesReportData?.timestamp_from">
                  {{ $t('DateFrom') }}: {{ formatTimestampToDate(salesReportData?.timestamp_from * 1000) }}
                </div>
                <div v-if="salesReportData?.timestamp_to">
                  {{ $t('DateTo') }}: {{ formatTimestampToDate(salesReportData?.timestamp_to * 1000) }}
                </div>
              </div>
              <q-btn
                flat
                padding="xs"
                rounded
                icon="filter_alt"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="openFilterForm()"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>
      <div class="q-pa-sm" :style="`max-height:${salesReportListHeight};overflow:auto;`">
        <q-list v-if="Array.isArray(salesReportData?.data)" :dark="darkMode">
          <template v-for="(record) in salesReportData?.data">
            <q-item>
              <q-item-section>
                <q-item-label>
                  {{ formatMonth(record?.month-1) }}
                  <template v-if="record?.day">{{ record?.day }},</template>
                  {{ record?.year }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-item-label>
                  {{ formatRecordAmount(record) }}
                </q-item-label>
                <q-item-label v-if="(record?.total_market_value && record?.currency)" caption>
                  {{ parseFiatCurrency(record.total_market_value, record.currency) }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-separator :dark="darkMode" inset/>
          </template>
        </q-list>
      </div>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { padPosId, summarizeSalesReports } from 'src/wallet/pos';
import { computed, ref, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import Watchtower from 'watchtower-cash-js';
import SalesReportFilterFormDialog from './SalesReportFilterFormDialog.vue';
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const watchtower = new Watchtower()
const $t = useI18n().t

// dialog plugins requirement
const $emit = defineEmits([
  'update:modelValue',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const props = defineProps({
  modelValue: Boolean,
  posDevice: Object,
  walletHash: String,
  merchantId: [Number, String],
})

const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => props.modelValue, () => innerVal.value = props.modelValue)

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])

function openFilterForm() {
  const currency = salesReportData.value?.data?.find?.(record => record?.currency)?.currency
  $q.dialog({
    component: SalesReportFilterFormDialog,
    componentProps: {
      initialValue: {
        timestampFrom: salesReportData.value?.timestamp_from,
        timestampTo: salesReportData.value?.timestamp_to,
        range: salesReportData.value?.range_type,
        currency: currency,
      }
    }
  }).onOk(fetchSalesReport)
}

const salesReportData = ref(null)
/**
 * @param {Object} opts 
 * @param {'month' | 'day'} opts.range
 * @param {Number} opts.timestampFrom
 * @param {Number} opts.timestampTo
 * @param {String} opts.currency
 */
function fetchSalesReport(opts) {
  const walletHash = props.posDevice?.walletHash || props?.walletHash
  if (!walletHash) return
  const params = {
    posid: props?.posDevice?.posid >= 0 ? props?.posDevice?.posid : undefined,
    from: Number.isNaN(opts?.timestampFrom) ? undefined : opts?.timestampFrom,
    to: Number.isNaN(opts?.timestampTo) ? undefined : opts?.timestampTo,
    range: opts?.range,
    currency: opts?.currency,
    merchant_id: props?.merchantId,
  }
  watchtower.BCH._api.get(`paytacapos/devices/sales_report/${walletHash}/`, { params })
    .then(response => {
      salesReportData.value = response?.data
      nextTick(() => fetchMissingTokenMetadata())
    })
}

onMounted(() => fetchSalesReport({
  timestampFrom: Math.floor(new Date().setFullYear(new Date().getFullYear() - 1) / 1000),
  timestampTo: null,
  // timestampFrom: Math.floor(new Date("2022-11-10") / 1000),
  // timestampTo: Math.floor(new Date("2022-11-16") / 1000),
  range: 'month',
  currency: $store.getters['market/selectedCurrency']?.symbol || 'USD',
}))
watch(() => [innerVal.value, props.merchantId, props.posDevice?.posid], () => {
  if (!innerVal.value) return

  salesReportData.value = null
  fetchSalesReport({
    timestampFrom: Math.floor(new Date().setFullYear(new Date().getFullYear() - 1) / 1000),
    timestampTo: null,
    // timestampFrom: Math.floor(new Date("2022-11-10") / 1000),
    // timestampTo: Math.floor(new Date("2022-11-16") / 1000),
    range: 'month',
    currency: $store.getters['market/selectedCurrency']?.symbol || 'USD',
  })
})

const totalSales = computed(() => {
  if (!Array.isArray(salesReportData.value?.data)) {
    return {
      total: 0,
      currency: '',
      totalMarketValue: 0,
      tokenAmounts: [],
      total: 0,
    }
  }
  const summarizedData = summarizeSalesReports(salesReportData.value?.data);
  return {
    ...summarizedData,
    tokenAmounts: summarizedData.tokenAmounts.map(tokenAmount => {
      const tokenMetadata = resolveTokenMetadata(tokenAmount)
      const decimals = parseInt(tokenMetadata.decimals);
      const parsedAmount = tokenAmount.amount / 10 ** decimals;
      return Object.assign(tokenAmount, {
        ...tokenMetadata,
        parsedAmount: parsedAmount.toFixed(decimals),
      })
    })
  }
})

const tokenCategoriesInSales = computed(() => {
  return totalSales.value.tokenAmounts
    .map(data => data?.category)
    .filter((element, index, list) => list.indexOf(element) === index);
})

const tokenMetadata = ref([].map(() => {
  return { id: '', name: '', symbol: '', decimals: '' }
}))
function fetchMissingTokenMetadata() {
  const promises = tokenCategoriesInSales.value.filter(category => {
    const metadata = resolveTokenMetadata({ category })
    return metadata?.invalid
  }).map(category => {
    return watchtower.BCH._api.get(`cashtokens/fungible/${category}/`)
      .then(response => {
        const id = response?.data?.id;
        if (id != `ct/${category}`) return Promise.rej({ response })
        const { name, symbol, decimals } = response.data;        
        const parsedData = { id, name, symbol, decimals };

        const index = tokenMetadata.value.findIndex(metadata => metadata?.category === category);
        if (index >= 0) tokenMetadata.value[index] = parsedData;
        else tokenMetadata.value.push(parsedData);
      })
  })
  return Promise.all(promises)
}

function resolveTokenMetadata(tokenAmount) {
  const assetId = `ct/${tokenAmount?.category}`;
  const metadata = tokenMetadata.value.find(metadata => metadata?.id === assetId)
  if (metadata) return metadata
  const assets = $store.getters['assets/getAssets'];

  const asset = assets.find(asset => asset?.id === assetId)
  if (asset) {
    const { id, name, symbol, decimals } = asset;
    return { id, name, symbol, decimals };
  }

  return { invalid: true, id: '', name: '', symbol: `ct-${tokenAmount?.category?.substring(0, 4)}`, decimals: 0 };
}

const salesReportListHeight = computed(() => {
  const height = totalSales.value.tokenAmounts.length * 1.25
  return `calc(50vh -${height}rem)`;
})

function formatMonth(month) {
  return new Date(Date.UTC(2022, month)).toLocaleString(undefined, { month: 'short' })
}

function formatTimestampToDate(timestamp) {
  if (!timestamp) return ''
  return Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
}
function formatRangeType(value) {
  if (value === 'day') return $t('Daily')
  if (value === 'month') return $t('Monthly')
  return value
}

/**
 * 
 * @param {Object} record 
 * @param {Number} record.total
 * @param {String} record.ft_category
 */
function formatRecordAmount(record) {
  if (!record?.ft_category) return getAssetDenomination(denomination.value, record?.total)
  const metadata = resolveTokenMetadata({ category: record?.ft_category });
  const decimals = parseInt(metadata.decimals);
  const symbol = metadata.symbol;
  const parsedAmount = record?.total / 10 ** decimals;
  return `${parsedAmount.toFixed(decimals)} ${symbol}`;
}
</script>
