<template>
  <div class="invoice-list-container">
    <!-- List -->
    <div class="q-px-md q-pb-md">
      <div v-if="loading && !invoices.length" class="text-center q-mt-xl">
        <q-spinner color="pt-primary1" size="3em" />
        <p class="text-grey q-mt-md">{{ $t('LoadingInvoices') }}</p>
      </div>

      <div v-else-if="!invoices.length" class="text-center q-mt-xl">
        <q-icon name="receipt_long" size="4em" class="text-grey q-mb-md" />
        <div class="text-h6 text-grey">{{ $t('NoInvoices') }}</div>
        <div class="text-body2 text-grey">{{ searchQuery ? $t('NoSearchMatches') : $t('NoRecords') }}</div>
        <q-btn
          v-if="searchQuery"
          flat
          rounded
          color="pt-primary1"
          :label="$t('ClearSearch')"
          class="q-mt-md"
          @click="$emit('clear-search')"
        />
      </div>

      <div v-else class="q-pt-md">
        <q-infinite-scroll @load="onLoadMore" :offset="250" :disable="!hasNextPage">
          <q-list separator class="br-15 overflow-hidden border-grey-4">
            <InvoiceListItem
              v-for="invoice in invoices"
              :key="invoice.invoice_id"
              :invoice="invoice"
              status-style="icon"
              date-format="relative"
              @click="showInvoiceDetail(invoice)"
            />
          </q-list>
          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="pt-primary1" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import ago from 's-ago'
import { usePaymentHubCore } from 'src/composables/payment-hub/usePaymentHub.js'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import InvoiceDetailDialog from './InvoiceDetailDialog.vue'
import InvoiceListItem from './InvoiceListItem.vue'

const props = defineProps({
  storeId: {
    type: String,
    required: true
  },
  statusFilter: {
    type: String,
    default: '' // comma-separated or empty
  },
  searchQuery: {
    type: String,
    default: ''
  },
  hasSubscriptions: {
    type: Boolean,
    required: false,
  }
})

const emit = defineEmits(['clear-search'])

const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isChipnet = computed(() => $store.getters['global/isChipnet'])

const { hub, initHub } = usePaymentHubCore()

// API State
const invoices = ref([])
const loading = ref(false)
const currentPage = ref(1)
const hasNextPage = ref(false)

let expirationCheckInterval = null

onMounted(async () => {
  await initHub({ isBackground: true, autoRegister: false })
  refreshList()
  
  // Local timer to automatically mark pending invoices as expired
  expirationCheckInterval = setInterval(checkExpirations, 5000)
})

onBeforeUnmount(() => {
  if (expirationCheckInterval) clearInterval(expirationCheckInterval)
})

// Watch for prop changes to refresh the list
watch(() => props.statusFilter, () => {
  refreshList()
})
watch(() => props.searchQuery, () => {
  refreshList()
})
watch(() => props.hasSubscriptions, () => {
  refreshList()
})

function checkExpirations() {
  if (!invoices.value || invoices.value.length === 0) return
  
  const now = new Date()
  let hasChanges = false
  
  invoices.value.forEach(invoice => {
    if (invoice.status === 'PENDING' && invoice.expires) {
      const expiryDate = new Date(invoice.expires)
      if (now >= expiryDate) {
        invoice.status = 'EXPIRED'
        hasChanges = true
      }
    }
  })
  
  // If we're filtering by status, we might need to refresh the list to apply filters correctly
  if (hasChanges && props.statusFilter) {
    // Small delay to allow user to see the state change before it disappears due to filter
    setTimeout(() => {
      refreshList(true)
    }, 2000)
  }
}

async function refreshList(isBackground = false) {
  if (!hub.value) return
  if (!isBackground) {
    loading.value = true
    currentPage.value = 1
  }
  try {
    const params = {
      page: 1,
      status: props.statusFilter || undefined,
      search: props.searchQuery || undefined,
      has_subscription: props.hasSubscriptions,
      network: isChipnet.value ? 'test' : 'main',
      ordering: '-date_created'
    }
    const data = await hub.value.listInvoices(props.storeId, params)
    invoices.value = data.results || []
    hasNextPage.value = !!data.next
  } catch (error) {
    console.error('Error fetching invoices:', error)
  } finally {
    if (!isBackground) loading.value = false
  }
}

async function onLoadMore(index, done) {
  if (!hasNextPage.value || loading.value) {
    done()
    return
  }

  try {
    currentPage.value++
    const params = {
      page: currentPage.value,
      status: props.statusFilter || undefined,
      search: props.searchQuery || undefined,
      has_subscription: props.hasSubscriptions,
      network: isChipnet.value ? 'test' : 'main',
      ordering: '-date_created'
    }
    const data = await hub.value.listInvoices(props.storeId, params)
    if (data.results?.length) {
      invoices.value.push(...data.results)
    }
    hasNextPage.value = !!data.next
  } catch (error) {
    console.error('Error loading more invoices:', error)
  } finally {
    done()
  }
}

function showInvoiceDetail(invoice) {
  $q.dialog({
    component: InvoiceDetailDialog,
    componentProps: {
      invoiceId: invoice.invoice_id,
      subscriptionId: invoice.subscription_id || invoice.subscription || null,
      planId: invoice.plan_id || invoice.plan || null
    }
  })
}

defineExpose({
  refreshList
})
</script>

<style lang="scss" scoped>
.invoice-list-container {
  min-height: 200px;
}
.border-grey-4 {
  border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>