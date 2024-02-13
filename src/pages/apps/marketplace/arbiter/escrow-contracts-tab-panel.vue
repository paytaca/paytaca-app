<template>
  <div class="q-pa-sm">
    <div class="row items-center">
      <div class="text-h6">Escrow contracts</div>
      <q-space/>
      <q-btn :disable="fetchingEscrowContracts" flat padding="sm" icon="tune" :color="filterOpts.status != 'all' ? 'brandblue' : undefined">
        <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
          <q-list separator>
            <q-item
              v-for="status in filterStatusOpts" :key="status"
              :disable="fetchingEscrowContracts"
              :active="filterOpts.status === status"
              v-close-popup
              clickable @click="() => filterOpts.status = status"
            >
              <q-item-section>
                <q-item-label>{{ capitalize(status) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
      <q-btn :disable="fetchingEscrowContracts" flat padding="sm" icon="sort" :color="filterOpts.orderingField ? 'brandblue' : undefined">
        <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
          <q-list separator>
            <q-item
              v-if="filterOpts.orderingField"
              :disable="fetchingEscrowContracts"
              class="text-grey"
              clickable v-close-popup
              @click="() => toggleOrderingField(undefined, 100)"
            >
              <q-item-section>
                <q-item-label>Remove ordering</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              v-for="opt in filterOrderingOpts" :key="opt?.value"
              :disable="fetchingEscrowContracts"
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
      <q-chip v-if="filterOpts.status != 'all'" removable @remove="filterOpts.status = 'all'" :outline="darkMode">
        {{ capitalize(filterOpts.status) }}
      </q-chip>
      <q-chip v-if="filterOpts.orderId" removable @remove="filterOpts.orderId = undefined" :outline="darkMode">
        Order #{{ filterOpts?.orderId }}
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
        :modelValue="escrowContractsPagination"
        @update:modelValue="fetchEscrowContracts"
      />
    </div>
    <div v-if="fetchingEscrowContracts" class="text-center q-my-xs">
      <q-spinner size="lg" color="brandblue"/>
    </div>
    <div v-if="!escrowContracts?.length" class="text-center text-grey q-py-lg">
      No records
    </div>
    <div
      v-for="escrowContract in escrowContracts" :key="escrowContract?.address"
      class="q-mb-md q-pb-xs"
      style="border-bottom: 1px solid grey;position:relative"
      v-ripple
    >
      <div class="row items-center no-wrap">
        <div class="ellipsis q-mr-sm">{{ escrowContract?.address }}</div>
        <q-space/>
        <q-icon
          size="1.5em"
          name="check_circle"
          v-bind="resolveEscrowContractStatusIcon(escrowContract)"
          @click.stop
        >
          <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <template v-if="escrowContract?.isSettled">
              <template v-if="escrowContract?.settlementType === 'released'">
                Payment has been released
              </template>
              <template v-else-if="escrowContract?.settlementType === 'refunded'">
                Payment has been refunded
              </template>
            </template>
            <template v-else-if="escrowContract?.isFunded">
              Payment is in escrow
            </template>
            <template v-else>
              Payment is pending
            </template>
          </q-menu>
        </q-icon>
      </div>
      <div class="row items-center q-mb-sm">
        <div>Payment #{{ escrowContract?.payments?.[0]?.id }}</div>
        <q-space/>
        <div v-if="escrowContract?.payments?.[0]?.orderId">
          Order #{{ escrowContract?.payments?.[0]?.orderId }}
          <q-badge
            v-if="escrowContract?.payments?.[0]?.order?.status"
            :color="parseOrderStatusColor(escrowContract?.payments?.[0]?.order?.status)"
          >
            {{ formatOrderStatus(escrowContract?.payments?.[0]?.order?.status) }}
          </q-badge>
        </div>
        <div v-else class="text-grey">No order</div>
      </div>
      <div v-if="escrowContract?.fiatAmount">
        <div class="row items-center">
          <div>Total Amount</div>
          <q-space/>
          <div>
            {{ round(escrowContract?.fiatAmount?.total, 3) }}
            {{ escrowContract?.fiatAmount?.currency }}
          </div>
        </div>
        <div class="row items-center">
          <div>Fee</div>
          <q-space/>
          <div>
            <template v-if="escrowContract?.fiatAmount?.arbitrationFee > 0 && escrowContract?.fiatAmount?.arbitrationFee < 0.001">
              {{ '< 0.001' }}
            </template>
            <template v-else>{{ round(escrowContract?.fiatAmount?.arbitrationFee, 3) }}</template>
            {{ escrowContract?.fiatAmount?.currency }}
          </div>
        </div>
      </div>
      <q-menu
        touch-position
        class="pt-card-2 text-bow"
        :class="getDarkModeClass(darkMode)"
      >
        <q-list>
          <q-item clickable v-close-popup @click="() => showEscrowContract(escrowContract)">
            <q-item-section>
              <q-item-label>View escrow</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            :disable="!escrowContract?.payments?.[0]?.orderId"
            clickable v-close-popup
            @click="() => showEscrowOrder(escrowContract)"
          >
            <q-item-section>
              <q-item-label>View order</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            :disable="!orderIdChatMemberMap[escrowContract?.payments?.[0]?.orderId]?.id"
            clickable v-close-popup
            @click="() => openOrderChat(escrowContract)"
          >
            <q-item-section>
              <q-item-label>Open order chat</q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-item-label v-if="orderIdChatMemberMap[escrowContract?.payments?.[0]?.orderId]?.unreadCount">
                <q-badge color="red">
                  {{ orderIdChatMemberMap[escrowContract?.payments?.[0]?.orderId]?.unreadCount }}
                </q-badge>
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-separator/>

          <q-item
          :disable="!Boolean(escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(escrowContract, { type: 'release' })"
          >
            <q-item-section>
              <q-item-label>Release funds</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            :disable="!Boolean(escrowContract?.fundingTxid)"
            clickable v-close-popup
            @click="() => settleEscrowContract(escrowContract, { type: 'refund' })"
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
import { backend } from "src/marketplace/backend"
import { ChatIdentity, ChatMember, EscrowContract, Order } from "src/marketplace/objects"
import { compileEscrowSmartContract } from "src/marketplace/escrow/"
import { formatOrderStatus, parseOrderStatusColor, round } from "src/marketplace/utils"
import { setupCache } from "axios-cache-interceptor";
import axios from "axios";
import { useQuasar } from "quasar";
import { useStore } from "vuex";
import { capitalize, computed, onMounted, ref, watch } from "vue"
import LimitOffsetPagination from "src/components/LimitOffsetPagination.vue";
import EscrowContractDialog from "src/components/marketplace/escrow-contract-dialog.vue";
import OrderDetailDialog from "src/components/marketplace/OrderDetailDialog.vue";
import SettlementTransactionPreviewDialog from "src/components/marketplace/arbiter/SettlementTransactionPreviewDialog.vue";


const cachedBackend = setupCache(axios.create({...backend.defaults}), { ttl: 30 * 1000 })
const props = defineProps({
  keys: Object,
  arbiterAddress: String,
  chatIdentity: ChatIdentity,
})
const $emit = defineEmits([
  'open-chat-dialog',
])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store?.state?.darkmode?.darkmode)
async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

onMounted(() => fetchEscrowContracts())
watch(() => [props.arbiterAddress], () => fetchEscrowContracts())

const filterStatusOpts = ['all', 'pending', 'funded', 'released', 'refunded']
const filterOrderingOpts = [
  { label: 'ID', value: 'id' },
  { label: 'Total', value: 'total_sats' },
  { label: 'Order ID', value: 'order_id' },
  { label: 'Timestamp', value: 'timestamp' },
]
const filterOpts = ref({
  status: 'all', // all | pending | funded | settled | refunded
  orderId: [].map(Number)[0],
  orderingField: 'timestamp',
  descending: true,
})
watch(filterOpts, () => fetchEscrowContracts(), { deep: true })

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

const fetchingEscrowContracts = ref(false)
const escrowContracts = ref([].map(EscrowContract.parse))
const escrowContractsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchEscrowContracts(opts={ limit: 0, offset: 0 }) {
  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
    has_payment: true,
    arbiter_address: props.arbiterAddress || '',
    order_id: Number.isNaN(filterOpts.value?.orderId) ? undefined : filterOpts.value?.orderId,
    ordering: filterOpts.value.orderingField,
  }
  switch(filterOpts.value.status) {
    case 'refunded':
      params.is_settled = true
      params.settlement_type = 'refunded'
      break
    case 'released':
      params.is_settled = true
      params.settlement_type = 'released'
      break
    case 'funded':
      params.is_settled = false
      params.is_funded = true
      break
    case 'pending':
      params.is_settled = false
      params.is_funded = false
      break
    case 'all':
    default:
      params.is_settled = undefined
      params.is_funded = undefined
      params.settlement_type = undefined
  }

  if (params.ordering?.length > 0) {
    if (params.ordering.startsWith('-') && !filterOpts.value.descending) {
      params.ordering = params.ordering.substring(1)
    } else if (!params.ordering.startsWith('-') && filterOpts.value.descending) {
      params.ordering = '-' + params.ordering
    }
  }

  fetchingEscrowContracts.value = true
  return backend.get(`connecta/escrow/`, { params })
    .then(response => {
      escrowContracts.value = response?.data?.results?.map(EscrowContract.parse)
      escrowContractsPagination.value.count = response?.data?.count
      escrowContractsPagination.value.limit = response?.data?.limit
      escrowContractsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingEscrowContracts.value = false
    })
}

function refetchEscrowContracts(opts={addresses: [].map(String), append: false}) {
  let addresses = opts?.addresses
  const append = opts?.append
  if (!append) {
    addresses = addresses?.filter?.(address => {
      return escrowContracts.value.findIndex(ec => ec?.address === address) >= 0
    })
  }

  if (!addresses?.length) return Promise.resolve()

  const params = { addresses: addresses.join(','), limit: addresses?.length || 0 }

  return backend.get(`connecta/escrow/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      response?.data?.results?.map?.(EscrowContract.parse)
        .forEach(escrowContract => {
          const index = escrowContracts.value.findIndex(ec => ec?.address === escrowContract?.address)
          if (index >= 0) escrowContracts.value[index] = escrowContract
          else if (opts?.append) escrowContracts.value.push(escrowContract)
        })

      return response
    })
}

function resolveEscrowContractStatusIcon(escrowContract=EscrowContract.parse()) {
  if (escrowContract.isSettled) return { color: 'green' }
  if (escrowContract.isFunded) return { color: 'orange' }
  return { color: 'grey' }
}

function showEscrowContract(escrowContract=EscrowContract.parse()) {
  $q.dialog({
    component: EscrowContractDialog,
    componentProps: {
      escrowContract: escrowContract
    },
  })
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
    console.log('NETWORK', escrow.network)
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
      promise = escrow.release(fundingUtxo, props.keys?.privkey)
    } else if (settlementType === 'refund') {
      promise = escrow.version === 'v1'
        ? escrow.refund(fundingUtxo, props.keys?.privkey)
        : escrow.fullRefund(fundingUtxo, props.keys?.privkey)
    }
    const transaction = await promise
    dialog?.hide?.()
    clearTimeout(dialogTimeout)

    $q.dialog({
      component: SettlementTransactionPreviewDialog,
      componentProps: { escrowContract: escrowContract, transaction: transaction }
    }).onOk(() => sendSettlementTx(escrowContract, transaction))
    console.log('transaction', transaction)
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
    return await backend.post(`connecta/escrow/${escrowContract?.address}/broadcast_settlement/`, data)
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

function showEscrowOrder(escrowContract=EscrowContract.parse()) {
  const orderId = escrowContract?.payments?.[0]?.orderId
  if (!orderId) return

  let dialog
  const timeoutId = setTimeout(() => dialog = $q.dialog({
    title: 'Fetching data',
    progress: true,
    position: 'bottom',
    ok: false,
    cancel: false,
    persistent: true,
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }), 100)

  return cachedBackend.get(`connecta/orders/${orderId}/`)
    .then(response => {
      const order = Order.parse(response?.data)
      $q.dialog({
        component: OrderDetailDialog,
        componentProps: { order: order },
      })
      return response
    })
    .finally(() => {
      clearTimeout(timeoutId)
      dialog?.hide?.()
    })
}

const uniqueOrderIds = computed(() => {
  return escrowContracts.value.map(escrow => escrow?.payments?.[0]?.orderId)
    .filter(Boolean).filter((id, index, list) => list.indexOf(id) === index)
})
watch(uniqueOrderIds, () => getOrderChatMembers(), { deep: true })
const orderIdChatMemberMap = ref({})
const fetchChatMemberPromiseMap = ref({})
function getOrderChatMembers() {
  if (!props.chatIdentity?.id) return Promise.resolve('No chat identity')
  const orderIds = [...uniqueOrderIds.value]
                    .filter(orderId => !fetchChatMemberPromiseMap.value[orderId])
  if (!orderIds.length) return Promise.resolve('No order IDs')

  const params = {
    order_ids: orderIds.join(','),
    chat_identity_id: props.chatIdentity.id,
  }

  const promiseCallbacksMap = {}
  orderIds.forEach(orderId => {
    fetchChatMemberPromiseMap.value[orderId] = new Promise((resolve, reject) => {
      setTimeout(() => reject('Timeout'), 20 * 1000)
      promiseCallbacksMap[orderId] = { resolve, reject }
    })
  })

  const promise = backend.get(`chat/members/full_info/`, { params })
    .then(response => {
      const chatMembers = response?.data?.results?.map?.(ChatMember.parse)
      chatMembers.forEach(chatMember => {
        if (!chatMember.chatSession?.orderId) return
        orderIdChatMemberMap.value[chatMember.chatSession?.orderId] = chatMember
      })
      Object.getOwnPropertyNames(promiseCallbacksMap).forEach(orderId => {
        promiseCallbacksMap[orderId]?.resolve(orderIdChatMemberMap.value[orderId])
      })
      return response
    })
    .catch(error => {
      console.error(error)
      Object.getOwnPropertyNames(promiseCallbacksMap).forEach(orderId => {
        promiseCallbacksMap[orderId]?.reject(error)
      })
    })
    .finally(() => {
      orderIds.forEach(orderId => delete fetchChatMemberPromiseMap.value[orderId])
    })

  return promise
}

function openOrderChat(escrowContract=EscrowContract.parse()) {
  const orderId = escrowContract?.payments?.[0]?.orderId
  if (!orderId) return
  const chatSession = orderIdChatMemberMap.value[orderId]?.chatSession
  if (!chatSession?.ref) return
  $emit('open-chat-dialog', chatSession) 
}

defineExpose({
  filterOpts,
  fetchEscrowContracts,
  refetchEscrowContracts,
})
</script>
