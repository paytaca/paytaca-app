<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" class="br-15" style="width:max(300px, 90vw);">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> {{ $t('SalesReport', {}, 'Sales Report') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm q-py-xs">
        <div v-if="Number.isInteger(posDevice?.posid)" class="text-h6">
          {{ posDevice?.name || 'Device' }}#{{ padPosId(posDevice?.posid) }}
        </div>
        <q-card :class="darkMode ? 'pt-dark-card' : 'text-black'">
          <q-card-section>
            <div class="row items-center">
              <div class="q-space text-subtitle1">Total sales</div>
              <div class="text-right">
                <div class="text-subtitle1">{{ Number(totalSales.total.toFixed(8)) }} BCH</div>
                <div v-if="(totalSales.totalMarketValue && totalSales.currency)" class="text-subtitle2">
                  {{ totalSales.totalMarketValue.toFixed(2) }} {{ totalSales.currency }}
                </div>
              </div>
            </div>
            <q-separator :dark="darkMode" spaced/>
            <div class="row items-start">
              <div class="q-space">
                <div>Range: {{ formatRangeType(salesReportData?.range_type) }}</div>
                <div v-if="salesReportData?.timestamp_from">
                  Date from: {{ formatTimestampToDate(salesReportData?.timestamp_from * 1000) }}
                </div>
                <div v-if="salesReportData?.timestamp_to">
                  Date to: {{ formatTimestampToDate(salesReportData?.timestamp_to * 1000) }}
                </div>
              </div>
              <q-btn
                flat
                padding="xs"
                rounded
                icon="filter_alt"
                @click="openFilterForm()"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-card-section>
      <div class="q-pa-sm" style="max-height:50vh;overflow:auto;">
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
                  {{ record?.total }} BCH
                </q-item-label>
                <q-item-label v-if="(record?.total_market_value && record?.currency)" caption>
                  {{ Number(record.total_market_value).toFixed(2) }} {{ record.currency }}
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
import { padPosId } from 'src/wallet/pos';
import { computed, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import Watchtower from 'watchtower-cash-js';
import SalesReportFilterFormDialog from './SalesReportFilterFormDialog.vue';

const watchtower = new Watchtower()

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const props = defineProps({
  posDevice: Object,
  walletHash: String,
})

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

function openFilterForm() {
  $q.dialog({
    component: SalesReportFilterFormDialog,
    componentProps: {
      initialValue: {
        timestampFrom: salesReportData.value?.timestamp_from,
        timestampTo: salesReportData.value?.timestamp_to,
        range: salesReportData.value?.range_type,
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
    posid: props?.posDevice?.posid || undefined,
    from: Number.isNaN(opts?.timestampFrom) ? undefined : opts?.timestampFrom,
    to: Number.isNaN(opts?.timestampTo) ? undefined : opts?.timestampTo,
    range: opts?.range,
    currency: opts?.currency,
  }
  watchtower.BCH._api.get(`paytacapos/devices/sales_report/${walletHash}/`, { params })
    .then(response => {
      console.log(response)
      salesReportData.value = response?.data
    })
}
onMounted(() => fetchSalesReport({
  timestampFrom: Math.floor(new Date().setFullYear(new Date().getFullYear() - 1) / 1000),
  timestampTo: null,
  // timestampFrom: Math.floor(new Date("2022-11-10") / 1000),
  // timestampTo: Math.floor(new Date("2022-11-16") / 1000),
  range: 'month',
  currency: 'USD',
}))

const totalSales = computed(() => {
  const data = {
    total: 0,
    currency: '',
    totalMarketValue: 0,
    totalCount: 0,
  }
  if (Array.isArray(salesReportData.value?.data)) {
    data.total = salesReportData.value.data.reduce((subtotal, record) => subtotal + record?.total, 0)
    data.totalCount = salesReportData.value.data.reduce((subtotal, record) => subtotal + record?.count, 0)
    const currencies = salesReportData.value.data
      .map(record => record?.currency)
      .filter(Boolean)
      .filter((e, i, l) => l.indexOf(e) === i)
    const hasMissingMarketValue = salesReportData.value.data.find(record => !record?.total_market_value || !record?.currency)
    if (!hasMissingMarketValue && currencies.length === 1) {
      data.currency = currencies[0]
      data.totalMarketValue = salesReportData.value.data.reduce((subtotal, record) => subtotal + record?.total_market_value, 0)
    }
  } 

  return data
})

function formatMonth(month) {
  return new Date(Date.UTC(2022, month)).toLocaleString(undefined, { month: 'short' })
}

function formatTimestampToDate(timestamp) {
  if (!timestamp) return ''
  return Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp)
}
function formatRangeType(value) {
  if (value === 'day') return 'daily'
  if (value === 'month') return 'monthly'
  return value
}
</script>