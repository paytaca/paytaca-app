<template>
  <div class="q-pa-sm">
    <div class="row items-center">
      <div class="text-h6">Appeals</div>
      <q-space/>
      <q-btn :disable="fetchingAppeals" flat padding="sm" icon="tune" :color="!filterOpts.isPending ? 'brandblue' : undefined">
        <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
          <q-list separator>
            <q-item clickable v-close-popup :active="filterOpts.isPending" @click="() => filterOpts.isPending = true">
              <q-item-section>
                <q-item-label>{{ $t('Pending') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup :active="!filterOpts.isPending" @click="() => filterOpts.isPending = false">
              <q-item-section>
                <q-item-label>{{ $t('All') }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      <q-btn :disable="fetchingAppeals" flat padding="sm" icon="sort" :color="filterOpts.orderingField ? 'brandblue' : undefined">
        <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
          <q-list separator>
            <q-item
              v-if="filterOpts.orderingField"
              :disable="fetchingAppeals"
              class="text-grey"
              clickable v-close-popup
              @click="() => toggleOrderingField(undefined, 100)"
            >
              <q-item-section>
                <q-item-label>{{ $t('RemoveOrdering', undefined, 'Remove ordering') }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-for="opt in filterOrderingOpts" :key="opt?.value"
              :disable="fetchingAppeals"
              :active="filterOpts.orderingField === opt.value"
              clickable v-close-popup
              @click="() => toggleOrderingField(opt.value)"
            >
              <q-item-section>
                <q-item-label>{{ opt?.label || capitalize(opt?.value).replaceAll('_', ' ') }}</q-item-label>
              </q-item-section>
              <q-item-section avatar class="q-ml-none">
                <q-icon
                  v-if="filterOpts.orderingField === opt.value"
                  name="sort"
                  :style="{
                    transform: filterOpts.descending ? 'scaleX(-1)' : 'rotate(180deg)',
                    transition: 'transform 0.1s ease-in',
                  }"
                />
                <q-icon v-else/>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <div class="row items-center justify-end q-my-xs">
      <q-chip v-if="filterOpts.ids?.length" removable @remove="filterOpts.ids = []" :outline="darkMode">
        {{ filterOpts.ids?.map(id => `#${id}`).join(',') }}
      </q-chip>
      <q-space/>
      <LimitOffsetPagination
        :pagination-props="{
          maxPages: 5,
          rounded: true,
          padding: 'sm md',
          size: 'sm',
          dark: darkMode,
          color: 'brandblue',
          boundaryNumbers: true
        }"
        :hide-below-pages="2"
        :modelValue="appealsPagination"
        @update:modelValue="fetchAppeals"
      />
    </div>
    <div v-if="fetchingAppeals" class="text-center q-my-xs">
      <q-spinner size="lg" color="brandblue"/>
    </div>
    <div v-else-if="!appeals?.length" class="text-center text-grey text-subtitle1">
      {{ $t('NoAppeals', undefined, 'No appeals to show') }}
    </div>
    <div
      v-for="appeal in appeals" :key="appeal?.address"
      class="q-mb-md q-pb-xs"
      style="border-bottom: 1px solid grey;position:relative"
      v-ripple
    >
      <div class="row items-center">
        <div v-if="appeal?.id">#{{ appeal?.id }}</div>
        <q-space/>
        <div v-if="appeal?.createdAt" @click.stop>
          {{ formatDateRelative(appeal?.createdAt) }}
          <q-menu class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
            {{ formatTimestampToText(appeal?.createdAt) }}
          </q-menu>
        </div>
      </div>
      
      <div class="row items-center">
        <div v-if="appeal?.type" style="whitespace:nowrap;">{{ formatSettlementApealType(appeal?.type) }}</div>
        <div v-else class="text-grey" style="whitespace:nowrap;">{{$t('NoSettlementType', undefined, 'No settlement type')}}</div>
        <div v-if="appeal?.completedAt" @click.stop>
          <q-badge
            rounded
            :label="$t('Completed')"
            class="q-ml-xs"
            color="green"
          />
          <q-menu class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
            {{ formatTimestampToText(appeal?.completedAt) }}
          </q-menu>
        </div>
        <div v-else-if="appeal?.cancelledAt" @click.stop>
          <q-badge
            rounded
            :label="$t('Cancelled')"
            class="q-ml-xs"
            color="green"
          />
          <q-menu class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
            {{ formatTimestampToText(appeal?.cancelledAt) }}
          </q-menu>
        </div>
      </div>
      <div class="row item-center no-wrap">
        <div class="ellipsis">{{ appeal?.escrowContract?.address }}</div>
        <q-space/>
        <q-badge
          v-if="resolveEscrowContractStatus(appeal?.escrowContract)"
          rounded
          class="q-ml-xs"
          v-bind="resolveEscrowContractStatus(appeal?.escrowContract)"
        />
      </div>
      <div class="row items-start no-wrap">
        <div class="q-pr-xs">{{ $t('Reason') }}:</div>
        <q-space/>
        <div v-if="appeal?.reason">{{ appeal?.reason }}</div>
        <div v-else class="text-grey">{{ $t('None' )}}</div>
      </div>
      <q-menu
        touch-position
        class="pt-card-2 text-bow"
        :class="getDarkModeClass(darkMode)"
      >
        <q-list>
          <q-item clickable v-close-popup @click="() => showEscrowContract(appeal?.escrowContract)">
            <q-item-section>
              <q-item-label>{{ $t('ViewEscrow', undefined, 'View escrow') }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator/>

          <q-item
            v-if="appeal?.type === 'release'"
            :disable="!Boolean(appeal?.escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(appeal?.escrowContract, { type: 'release', escrowSettlementAppealId: appeal?.id })"
          >
            <q-item-section>
              <q-item-label>{{ $t('ReleaseFunds', undefined, 'Release funds') }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="['refund', 'full_refund'].includes(appeal?.type)"
            :disable="!Boolean(appeal?.escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(appeal?.escrowContract, { type: 'refund', escrowSettlementAppealId: appeal?.id })"
          >
            <q-item-section>
              <q-item-label>{{ $t('ReturnFunds', undefined, 'Return funds') }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </div>
  </div>
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { formatDateRelative, formatTimestampToText } from "src/marketplace/utils";
import { ChatIdentity, EscrowContract, EscrowSettlementAppeal } from "src/marketplace/objects";
import { generateSettlementTransactions } from "src/marketplace/escrow";
import { arbiterBackend, formatSettlementApealType, parseWif } from "src/marketplace/arbiter";
import { debounce, useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
import { useStore } from "vuex";
import { capitalize, computed, onMounted, ref, watch } from "vue";
import LimitOffsetPagination from "src/components/LimitOffsetPagination.vue";
import EscrowContractDialog from "src/components/marketplace/escrow-contract-dialog.vue";
import SettlementTransactionPreviewDialog from "src/components/marketplace/arbiter/SettlementTransactionPreviewDialog.vue";

const props = defineProps({
  keys: {
    type: Object,
    default: () => {
      return [].map(parseWif)[0]
    }
  },
  chatIdentity: ChatIdentity,
})

const { t: $t } = useI18n()
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

const arbiterAddress = computed(() => props.keys?.address)

const filterOrderingOpts = [
  { label: $t('ID'), value: 'id' },
  { label: $t('Created'), value: 'created_at' },
  { label: $t('Completed'), value: 'completed_at' },
  { label: $t('Cancelled'), value: 'cancelled_at' },
]
const filterOpts = ref({
  isPending: true,
  ids: [],
  orderingField: 'created_at',
  descending: true,
})

async function sleepPromise(duration=0) {
  if (!Number.isInteger(duration) || duration <= 0) return
  return new Promise((resolve) => setTimeout(resolve, duration))
}
async function toggleOrderingField(value, delay=0) {
  if (Number.isInteger(delay) && delay > 0) await sleepPromise(delay)

  if (!value) {
    filterOpts.value.orderingField = undefined
    filterOpts.value.descending = false
    return
  }

  if (filterOpts.value.orderingField != value) filterOpts.value.orderingField = value
  else filterOpts.value.descending = !filterOpts.value.descending
}

watch(filterOpts, () => fetchAppeals(), { deep: true })


onMounted(() => fetchAppeals())
watch(arbiterAddress, () => fetchAppeals())

const fetchingAppeals = ref(false)
const appeals = ref([].map(EscrowSettlementAppeal.parse))
const appealsPagination = ref({ limit: 0, offset: 0, count: 0 })
const fetchAppeals = debounce((opts={ limit: 0, offset: 0 }) => {
  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
    arbiter_addresses: props.keys?.arbiter_addresses,
    ordering: filterOpts.value.orderingField,
  }

  if (filterOpts.value.isPending) {
    params.is_pending = true
    params.is_funded = true
    params.is_settled = false
  }

  if (filterOpts.value.ids?.length) {
    params.ids = filterOpts.value.ids.join(',')
  }

  if (params.ordering?.length > 0) {
    if (params.ordering.startsWith('-') && !filterOpts.value.descending) {
      params.ordering = params.ordering.substring(1)
    } else if (!params.ordering.startsWith('-') && filterOpts.value.descending) {
      params.ordering = '-' + params.ordering
    }
  }

  fetchingAppeals.value = true
  return arbiterBackend.get(`connecta/escrow-settlement-appeals`, { params })
    .then(response => {
      appeals.value = response?.data?.results?.map?.(EscrowSettlementAppeal.parse)
      appealsPagination.value.limit = response.data?.limit
      appealsPagination.value.count = response.data?.count
      appealsPagination.value.offset = response.data?.offset
      return response
    })
    .finally(() => {
      fetchingAppeals.value = false
    })
}, 250)

function refetchAppeals(ids=[].map(Number)) {
  const parsedIds = ids?.map?.(parseInt).filter(Boolean)
  if (!parsedIds?.length) return Promise.resolve()
  const params = {
    ids: parsedIds.join(','),
  }
  return arbiterBackend.get(`connecta/escrow-settlement-appeals`, { params })
    .then(response => {
      const results = response?.data?.results?.map?.(EscrowSettlementAppeal.parse)
      if (!Array.isArray(results)) return Promise.reject({ response })
      results.forEach(appeal => {
        const index = appeals.value.findIndex(_appeal => _appeal?.id === appeal?.id)
        if (index < 0) return
        appeals.value[index] = appeal
      })
      return response
    })
    .finally(() => {
      fetchingAppeals.value = false
    })
}

function resolveEscrowContractStatus(escrowContract = EscrowContract.parse()) {
  if (!escrowContract.isFunded) return { label: $t('Pending'), color: 'grey' }
  if (!escrowContract.isSettled) return { label: $t('Funded'), color: 'orange' }
  if (escrowContract.settlementType === 'released') return { label: $t('Released'), color: 'green' }
  if (escrowContract.settlementType === 'refunded') return { label: $t('Refunded'), color: 'green' }
}


/**
 * @param {EscrowContract} escrowContract 
 * @param {Object} opts
 * @param {'release' | 'refund'} opts.type
 * @param {Number} [opts.escrowSettlementAppealId]
 */
async function settleEscrowContract(escrowContract=EscrowContract.parse(), opts={ type: '', escrowSettlementAppealId: undefined }) {
  const settlementType = opts?.type
  if (!['release', 'refund'].includes(settlementType)) return

  const orderStatus = escrowContract?.payments?.[0]?.order?.status
  if (orderStatus) {
    if (settlementType === 'refund' && orderStatus !== 'cancelled') {
      await dialogPromise({
        title: $t('RefundEscrow', undefined, 'Refund escrow'),
        message: $t('RefundEscrowMsg', undefined, 'Related order for this payment is not cancelled. Proceed to refund?'),
        color: 'brandblue',
        persistent: true,
        ok: { label: $t('Refund'), noCaps: true },
        cancel: { label: $t('Cancel'), noCaps: true, color: 'grey', flat: true },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      })
    }
    if (settlementType === 'release' && orderStatus !== 'completed') {
      await dialogPromise({
        title: $t('CompleteEscrow', undefined, 'Complete escrow'),
        message: $t('CompleteEscrowMsg', undefined, 'Related order for this payment is not yet completed. Proceed to release funds?'),
        color: 'brandblue',
        persistent: true,
        ok: { label: $t('Proceed'), noCaps: true },
        cancel: { label: $t('Cancel'), noCaps: true, color: 'grey', flat: true },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      }) 
    }
  }

  // creating tx is sometimes too fast that the dialog isn't necessary
  const dialog = $q.dialog({
    title: settlementType  === 'release'
      ? $t('CompleteEscrow', undefined, 'Complete escrow')
      : $t('RefundEscrow', undefined, 'Refund escrow'),
    progress: true,
    persistent: true,
    color: 'brandblue',
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
  })
  try {
    const txGenResults = await generateSettlementTransactions({
      escrowContracts: [escrowContract], wifs: [props.keys?.wif],
      settlementType, dialog,
    })
    const transaction = txGenResults?.[0]?.transaction
    dialog?.hide?.()

    $q.dialog({
      component: SettlementTransactionPreviewDialog,
      componentProps: { escrowContract: escrowContract, transaction: transaction }
    }).onOk(() => sendSettlementTx(escrowContract, transaction, opts?.escrowSettlementAppealId))
  } catch(error) {
    console.error(error)
    let errorMessage
    if (typeof error?.message === 'string' && error?.message?.length < 200) errorMessage = error?.message
    if (error?.cause == 'invalid_compilation') errorMessage = error?.message

    errorMessage = errorMessage || $t('UnknownErrorOccurred', undefined, 'Unknown error occurred')
    dialog?.update?.({ message: errorMessage })
  } finally {
    dialog?.update?.({ persistent: false, progress: false, ok: true })
  }
}


/**
 * @param {EscrowContract} escrowContract 
 * @param {import('cashscript').Transaction} transaction 
 * @param {Number} [escrowSettlementAppealId]
 */
async function sendSettlementTx(escrowContract, transaction, escrowSettlementAppealId) {
  const dialog = $q.dialog({
    title: $t('SettleEscrowContract', undefined, 'Settle escrow contract'),
    persistent: true,
    progress: true,
    color: 'brandblue',
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
  })
  try {
    dialog.update({ message: $t('BuildingTransaction', undefined, 'Building transaction') })
    const txHex = await transaction.build()
    const data = {
      settlement_tx_hex: txHex,
      escrow_settlement_appeal_id: parseInt(escrowSettlementAppealId) || undefined,
    }
    dialog.update({ message: $t('BroadcastingTransaction', undefined, 'Broadcasting transaction') })
    return await arbiterBackend.post(`connecta/escrow/${escrowContract?.address}/broadcast_settlement/`, data)
      .then(response => {
        escrowContract.raw = response?.data
        dialog.hide()
        if (escrowSettlementAppealId) refetchAppeals([escrowSettlementAppealId])
        return response
      })
      .catch(error => {
        let message
        const data = error?.response?.data
        if (typeof data?.detail === 'string') message = data?.detail
        if (typeof data?.non_field_errors?.[0] === 'string') message = data?.non_field_errors?.[0]
        if (typeof data?.tx_hex?.[0] === 'string') message = data?.tx_hex?.[0]
        if (message) return Promise.reject(new Error(message))
        return Promise.reject(error)
      })
  } catch(error) {
    console.error(error)
    let dialogMsg
    const msg = error?.message 
    if (typeof msg === 'string' && msg?.length < 200) dialogMsg = msg 
    dialogMsg = dialogMsg || $t('ErrorInBuildingTransaction', undefined, 'Error in building transaction') 
    dialog.update({ message: dialogMsg })
  } finally {
    dialog.update({ persistent: false, progress: false, ok: true })
  }
}

function showEscrowContract(escrowContract=EscrowContract.parse()) {
  const bchPrice = escrowContract.payments?.[0]?.bchPrice;
  const tokenPrices = escrowContract.payments?.[0]?.tokenPrices;
  const currency = bchPrice?.currency?.code;
  $q.dialog({
    component: EscrowContractDialog,
    componentProps: {
      escrowContract: escrowContract,
      bchPrice: bchPrice,
      tokenPrices: tokenPrices,
      currency: currency,
    },
  })
}


defineExpose({
  filterOpts,
  appeals,
  fetchAppeals,
})
</script>
