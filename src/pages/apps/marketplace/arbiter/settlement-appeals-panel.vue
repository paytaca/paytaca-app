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
                <q-item-label>Pending</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup :active="!filterOpts.isPending" @click="() => filterOpts.isPending = false">
              <q-item-section>
                <q-item-label>All</q-item-label>
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
    <div v-if="!appeals?.length" class="text-center text-grey text-subtitle1">
      No appeals to show
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
      <div v-if="appeal?.type" style="whitespace:nowrap;">{{ capitalize(appeal?.type).replaceAll('_', ' ') }}</div>
      <div v-else class="text-grey" style="whitespace:nowrap;">No settlement type</div>
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
        <div class="q-pr-xs">Reason:</div>
        <q-space/>
        <div v-if="appeal?.reason">{{ appeal?.reason }}</div>
        <div v-else class="text-grey">Not specified</div>
      </div>
      <q-menu
        touch-position
        class="pt-card-2 text-bow"
        :class="getDarkModeClass(darkMode)"
      >
        <q-list>
          <q-item clickable v-close-popup @click="() => showEscrowContract(appeal?.escrowContract)">
            <q-item-section>
              <q-item-label>View escrow</q-item-label>
            </q-item-section>
          </q-item>
          <q-separator/>

          <q-item
            v-if="appeal?.type === 'release'"
            :disable="!Boolean(appeal?.escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(appeal?.escrowContract, { type: 'release' })"
          >
            <q-item-section>
              <q-item-label>Release funds</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="['refund', 'full_refund'].includes(appeal?.type)"
            :disable="!Boolean(appeal?.escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(appeal?.escrowContract, { type: 'refund' })"
          >
            <q-item-section>
              <q-item-label>Return funds</q-item-label>
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
import { compileEscrowSmartContract } from "src/marketplace/escrow";
import { arbiterBackend, parseWif } from "src/marketplace/arbiter";
import { debounce, useQuasar } from "quasar";
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

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

const arbiterAddress = computed(() => props.keys?.address)

const filterOpts = ref({
  isPending: true,
  ids: [],
})
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
  }

  if (filterOpts.value.isPending) {
    params.is_pending = true
    params.is_funded = true
    params.is_settled = false
  }

  if (filterOpts.value.ids?.length) {
    params.ids = filterOpts.value.ids.join(',')
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

function resolveEscrowContractStatus(escrowContract = EscrowContract.parse()) {
  if (!escrowContract.isFunded) return { label: 'Pending', color: 'grey' }
  if (!escrowContract.isSettled) return { label: 'Funded', color: 'orange' }
  if (escrowContract.settlementType === 'released') return { label: 'Released', color: 'green' }
  if (escrowContract.settlementType === 'refunded') return { label: 'Refunded', color: 'green' }
}


/**
 * @param {EscrowContract} escrowContract 
 * @param {Object} opts
 * @param {'release' | 'refund'} opts.type
 */
async function settleEscrowContract(escrowContract=EscrowContract.parse(), opts={ type: '' }) {
  const settlementType = opts?.type
  if (!['release', 'refund'].includes(settlementType)) return

  const orderStatus = escrowContract?.payments?.[0]?.order?.status
  if (orderStatus) {
    if (settlementType === 'refund' && orderStatus !== 'cancelled') {
      await dialogPromise({
        title: 'Refund escrow',
        message: 'Related order for this payment is not cancelled. Proceed to refund?',
        color: 'brandblue',
        persistent: true,
        ok: { label: 'Refund', noCaps: true },
        cancel: { label: 'Cancel', noCaps: true, color: 'grey', flat: true },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      })
    }
    if (settlementType === 'release' && orderStatus !== 'completed') {
      await dialogPromise({
        title: 'Complete escrow',
        message: 'Related order for this payment is not yet completed. Proceed to release funds?',
        color: 'brandblue',
        persistent: true,
        ok: { label: 'Proceed', noCaps: true },
        cancel: { label: 'Cancel', noCaps: true, color: 'grey', flat: true },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      }) 
    }
  }

  // creating tx is sometimes too fast that the dialog isn't necessary
  let dialog
  const dialogTimeout = setTimeout(() => {
    dialog = $q.dialog({
      title: settlementType  === 'release' ? 'Complete escrow' : 'Refund escrow',
      progress: true,
      persistent: true,
      color: 'brandblue',
      ok: false,
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
    })
  }, 10)
  try {
    dialog?.update?.({ message: 'Compiling contract' })
    const escrow = compileEscrowSmartContract(escrowContract)
    const contract = escrow.getContract()
    if (contract.address != escrowContract?.address) {
      console.warn('Address mismatch got', contract.address, 'expected', escrowContract?.address)
      throw new Error('Compiled contract does not match address', { cause: 'invalid_compilation' })
    }
    const fundingUtxo = {
      "txid": escrowContract.fundingTxid,
      "vout": escrowContract.fundingVout,
      "satoshis": escrowContract.fundingSats,
    }
    dialog?.update?.({ message: 'Creating transaction' })
    let promise
    if(settlementType === 'release') {
      promise = escrow.release(fundingUtxo, props.keys?.wif)
    } else if (settlementType === 'refund') {
      promise = escrow.version === 'v1'
        ? escrow.refund(fundingUtxo, props.keys?.wif)
        : escrow.fullRefund(fundingUtxo, props.keys?.wif)
    }
    const transaction = await promise
    dialog?.hide?.()
    clearTimeout(dialogTimeout)

    $q.dialog({
      component: SettlementTransactionPreviewDialog,
      componentProps: { escrowContract: escrowContract, transaction: transaction }
    }).onOk(() => sendSettlementTx(escrowContract, transaction))
    // const txHex = await transaction.build()
    // console.log('txhex', txHex)
  } catch(error) {
    console.error(error)
    let errorMessage
    if (typeof error?.message === 'string' && error?.message?.length < 200) errorMessage = error?.message
    if (error?.cause == 'invalid_compilation') errorMessage = error?.message

    dialog?.update?.({ message: errorMessage || 'Unknown error occurred' })
  } finally {
    dialog?.update?.({ persistent: false, progress: false, ok: true })
  }
}


/**
 * @param {EscrowContract} escrowContract 
 * @param {import('cashscript').Transaction} transaction 
 */
async function sendSettlementTx(escrowContract, transaction) {
  const dialog = $q.dialog({
    title: 'Settle escrow contract',
    persistent: true,
    progress: true,
    color: 'brandblue',
    ok: false,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
  })
  try {
    dialog.update({ message: 'Building transaction'})
    const txHex = await transaction.build()
    const data = { settlement_tx_hex: txHex }
    dialog.update({ message: 'Broadcasting transaction' })
    return await arbiterBackend.post(`connecta/escrow/${escrowContract?.address}/broadcast_settlement/`, data)
      .then(response => {
        escrowContract.raw = response?.data
        dialog.hide()
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
    dialog.update({ message: dialogMsg || 'Error in building transaction'})
  } finally {
    dialog.update({ persistent: false, progress: false, ok: true })
  }
}

function showEscrowContract(escrowContract=EscrowContract.parse()) {
  $q.dialog({
    component: EscrowContractDialog,
    componentProps: {
      escrowContract: escrowContract
    },
  })
}


defineExpose({
  filterOpts,
  appeals,
  fetchAppeals,
})
</script>
