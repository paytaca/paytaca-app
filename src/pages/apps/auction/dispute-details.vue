<template>
  <!--
    ARBITER ONLY: This page contains the dispute details.
  -->
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav
      :title="details ? `Dispute #${details.id}` : 'Dispute'"
      backnavpath="/apps/auction/disputes"
      class="header-nav"
    >
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>
    
    <div v-if="isLoading" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else-if="details" class="q-pa-md q-pb-xl text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-caption text-weight-bold q-mb-xs q-px-xs">
        REFUND DISPUTE
      </div>
      <q-card class="pt-card text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-py-sm">
          <div class="row items-center justify-between q-mb-xs q-mt-sm">
            <q-chip
              dense
              :color="details.status === 'Resolved' ? 'positive' : 'warning'"
              text-color="white"
              class="text-caption text-weight-bold"
              style="margin: 0; padding: 3px 8px; height: auto;"
            >
              <q-icon
                :name="details.status === 'Resolved' ? 'check_circle' : 'autorenew'"
                size="xs"
                class="q-mr-xs"
              />
              {{ details.status }}
            </q-chip>
            <span class="text-caption" style="opacity: 0.65;">
              <q-icon name="schedule" size="xs" class="q-mr-xs" />
              <span v-if="details.status === 'Resolved'">{{ formatTimeSince(details.resolution_date) }} ago</span>
              <span v-else>{{ formatTimeSince(details.date_created) }} ago</span>
            </span>
          </div>

          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            Dispute #{{ details.id }}
          </div>

          <q-separator spaced="sm" />

          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-weight-bold">AUCTION</span>
            <span class="text-caption" style="opacity: 0.65;">#{{ details.auction_id }}</span>
          </div>
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-weight-bold">LOT</span>
            <span class="text-caption" style="opacity: 0.65;">#{{ details.lot_id }}</span>
          </div>

          <q-separator spaced="sm" />

          <div class="row q-gutter-xs q-my-sm">
            <q-badge
              v-for="reason in details.reasons"
              :key="reason"
              outline
              :text-color="darkMode ? 'white' : 'black'"
              :label="reason"
            />
          </div>
        </q-card-section>
      </q-card>
      
      <div class="text-caption text-weight-bold q-mb-xs q-px-xs">
        PARTIES
      </div>
      <q-card class="pt-card text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-py-sm">
          <div class="row items-center q-gutter-x-sm q-mb-sm">
            <q-avatar size="36px" color="primary" text-color="white" icon="store" />
            <div class="col">
              <div class="row items-center q-gutter-x-xs">
                <span class="text-caption text-weight-bold">SELLER</span>
              </div>
              <div class="text-body2 text-weight-medium">{{ details.auctioneer?.username ?? '—' }}</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                {{ details.auctioneer?.id ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              :disable="!details.auctioneer?.id"
              @click="copyToClipboard(details.auctioneer?.id, $q, { message: 'Copied to clipboard', position: 'top' })"
            />
          </div>

          <q-separator spaced="xs" />
          
          <div class="row items-center q-gutter-x-sm q-mt-sm">
            <q-avatar size="36px" color="primary" text-color="white" icon="person" />
            <div class="col">
              <div class="row items-center q-gutter-x-xs">
                <span class="text-caption text-weight-bold">BUYER</span>
              </div>
              <div class="text-body2 text-weight-medium">{{ details.bidder?.username ?? '—' }}</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                {{ details.bidder?.id ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              :disable="!details.bidder?.id"
              @click="copyToClipboard(details.bidder?.id, $q, { message: 'Copied to clipboard', position: 'top' })"
            />
          </div>
        </q-card-section>
      </q-card>
      
      <div class="text-caption text-weight-bold q-mb-xs q-px-xs">
        CONTRACT
      </div>
      <q-card class="pt-card text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-py-sm">
          <div class="row items-center justify-between q-mb-sm">
            <span class="text-caption text-weight-bold">ADDRESS</span>
            <div class="row items-center q-gutter-x-xs">
              <span class="text-caption text-weight-medium">{{ details.contract_address ?? '—' }}</span>
              <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(details.contract_address, $q, { message: 'Copied to clipboard', position: 'top' })" />
            </div>
          </div>

          <div class="row items-center justify-between q-mb-sm">
            <span class="text-caption text-weight-bold">BALANCE</span>
            <span class="text-body2 text-weight-bold">
              {{ formatBCH(details.balance).main }}<span style="opacity: 0.4;">{{ formatBCH(details.balance).zeros }}</span> BCH
            </span>
          </div>

          <q-separator spaced="sm" />

          <div class="row q-gutter-sm q-my-xs">
            <q-btn
              outline
              dense
              no-caps
              color="primary"
              icon="history"
              label="Status History"
              class="col"
              @click="showStatusHistory = true"
            />
            <q-btn
              outline
              dense
              no-caps
              color="primary"
              icon="receipt_long"
              label="Transactions"
              class="col"
              @click="showTransactions = true"
            />
          </div>
        </q-card-section>
      </q-card>
      
      <div class="text-caption text-weight-bold q-mb-xs q-px-xs">
        ARBITER ACTION
      </div>
      <q-card class="pt-card text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section v-if="details.status === 'Resolved'" class="q-py-sm">
          <div class="row items-center q-gutter-x-xs">
            <q-icon name="check_circle" color="positive" size="xs" />
            <span class="text-caption">
              This dispute was resolved {{ formatTimeSince(details.resolution_date) }} ago.
            </span>
          </div>
        </q-card-section>

        <q-card-section v-else class="q-py-sm">
          <div class="text-caption q-mb-sm">
            Select how the contract balance should be resolved.
          </div>
          
          <div class="row q-gutter-sm q-mb-md">
            <q-btn
              no-caps unelevated
              :color="selectedAction === 'refund' ? 'negative' : 'primary'"
              text-color="white"
              label="Refund to Bidder"
              class="col"
              :disable="isSubmitting || !canResolve"
              @click="selectedAction = 'refund'"
            />
            <q-btn
              no-caps unelevated
              :color="selectedAction === 'release' ? 'positive' : 'primary'"
              text-color="white"
              label="Release to Seller"
              class="col"
              :disable="isSubmitting || !canResolve"
              @click="selectedAction = 'release'"
            />
          </div>

          <div
            v-if="selectedAction"
            ref="swipeTrackEl"
            class="relative-position rounded-borders overflow-hidden"
            :style="{ background: darkMode ? '#2a2a2a' : '#f0f0f0', height: '48px' }"
          >
            <div class="absolute-full row items-center justify-center">
              <span
                class="text-caption text-weight-bold"
                :style="{ opacity: swipeProgress > 0.4 ? 0 : 0.5 - swipeProgress }"
              >
                Swipe to {{ { refund: 'Refund', release: 'Release' }[selectedAction] }}
              </span>
            </div>

            <div
              class="absolute-left rounded-borders"
              :style="{
                width: `${swipeProgress * 100}%`,
                height: '100%',
                background: { refund: 'var(--q-negative)', release: 'var(--q-positive)' }[selectedAction],
                opacity: 0.2,
                transition: isDragging ? 'none' : 'width 0.3s ease',
              }"
            />

            <div
              class="absolute row items-center justify-center rounded-borders cursor-pointer shadow-2"
              :style="{
                left: `${swipeProgress * (swipeTrackWidth - 48)}px`,
                top: '4px',
                width: '40px',
                height: '40px',
                background: { refund: 'var(--q-negative)', release: 'var(--q-positive)' }[selectedAction],
                transition: isDragging ? 'none' : 'left 0.3s ease',
              }"
              @mousedown="startSwipe"
              @touchstart.prevent="startSwipe"
            >
              <q-icon name="chevron_right" color="white" size="sm" />
            </div>
          </div>

          <div
            v-else
            class="row items-center justify-center rounded-borders q-py-sm"
            :style="{ background: darkMode ? '#2a2a2a' : '#f0f0f0' }"
          >
            <span class="text-caption" style="opacity: 0.4;">Select an action above</span>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-else class="q-pa-xl text-center text-bow" :class="getDarkModeClass(darkMode)">
      Dispute details are unavailable.
    </div>

    <DeliveryStatusHistoryDialog
      v-model="showStatusHistory"
      :lotId="details?.lot_id"
    />

    <TransactionsDialog
      v-model="showTransactions"
      :bidId="details?.bid_id"
      :lotId="details?.lot_id"
    />
  </div>
</template>

<script setup>
// Imports
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onBeforeUnmount, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

import { deriveOAuthCredentials } from 'src/auction/bch-oauth'
import { formatTimeSince } from './helper-functions'
import { copyToClipboard, formatBCH } from './helper-functions'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'
import TransactionsDialog from 'src/components/auction/TransactionsDialog.vue'

// Component props
const props = defineProps({
  disputeId: {
    type: [String, Number],
    required: true
  }
})

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(true)

// User-related data
const isArbiter = computed(() => !!$store.getters['auction/isArbiter'])

// Page-specific data
const disputeDetails = ref(null)
const details = computed(() => disputeDetails.value)
const canResolve = computed(() => Boolean(
  details.value?.id
  && details.value?.lot_id
  && details.value?.contract_address
  && details.value?.auctioneer?.id
  && details.value?.bidder?.id
  && details.value?.dispute_status === 'Pending'
))

// Loads the dispute details for the current route.
const loadDispute = async () => {
  disputeDetails.value = await $store.dispatch('auction/fetchDispute', props.disputeId)
}

onMounted(async () => {
  // Check if not arbiter
  if (!isArbiter.value) {
    $q.notify({ type: 'negative', message: 'You are not authorized to view this page.' })
    $router.replace('/apps/auction/activity')
    return
  }

  // Check if no existing disputes
  if (!props.disputeId) {
    isLoading.value = false
    return
  }
  
  try {
    await loadDispute()
    if (!disputeDetails.value) throw new Error('Dispute not found')
  } catch (err) {
    console.error('Failed to load dispute:', err)
    $q.notify({ type: 'negative', message: 'Failed to load dispute details.', position: 'top' })
    disputeDetails.value = null
  } finally {
    isLoading.value = false
  }
})

const selectedAction = ref(null)
const showStatusHistory = ref(false)
const showTransactions = ref(false)

const swipeProgress = ref(0)
const isDragging = ref(false)
const swipeTrackWidth = ref(0)
const swipeTrackEl = ref(null)
const isSubmitting = ref(false)
let startX = 0
let removeSwipeListeners = null

// Begins tracking the swipe gesture used to resolve a dispute.
const startSwipe = async (e) => {
  if (isSubmitting.value || !canResolve.value || !selectedAction.value) return
  await nextTick()
  swipeTrackWidth.value = swipeTrackEl.value ? swipeTrackEl.value.offsetWidth : 300
  isDragging.value = true
  startX = e.touches ? e.touches[0].clientX : e.clientX

  const onMove = (ev) => {
    if (!isDragging.value) return
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX
    const delta = clientX - startX
    const max = swipeTrackWidth.value - 48
    swipeProgress.value = Math.min(1, Math.max(0, delta / max))
  }

  const onEnd = async () => {
    isDragging.value = false
    const completed = swipeProgress.value >= 0.85
    removeSwipeListeners?.()
    if (completed) {
      swipeProgress.value = 1
      await handleAction()
    } else {
      swipeProgress.value = 0
    }
  }

  const onCancel = () => {
    isDragging.value = false
    swipeProgress.value = 0
    removeSwipeListeners?.()
  }

  removeSwipeListeners?.()
  removeSwipeListeners = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
    window.removeEventListener('touchcancel', onCancel)
    removeSwipeListeners = null
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('touchend', onEnd)
  window.addEventListener('touchcancel', onCancel)
}

// Calls the selected contract action and reports its result.
const handleAction = async () => {
  if (isSubmitting.value) return
  if (!['refund', 'release'].includes(selectedAction.value) || !canResolve.value) {
    $q.notify({ type: 'negative', message: 'The dispute is missing information required for resolution.', position: 'top' })
    swipeProgress.value = 0
    return
  }

  isSubmitting.value = true
  try {
    $q.loading.show({ message: 'Processing...' })

    const { publicKey } = await deriveOAuthCredentials()

    const transaction = await $store.dispatch(
      `auction/callContractFunction`, 
      { 
        lotId: disputeDetails.value.lot_id,
        disputeId: disputeDetails.value.id,
        functionName: selectedAction.value, 
        publicKey 
      }
    )
    if (!transaction) throw new Error('The contract transaction did not complete.')

    await loadDispute()

    $q.notify({ type: 'positive', message: 'Action applied successfully.', position: 'top' })
    selectedAction.value = null
  } catch (err) {
    console.error('Failed to apply action:', err)
    const message = err.ambiguous
      ? 'The settlement result could not be confirmed. Refresh before trying again.'
      : err.message || 'Failed to apply action.'
    $q.notify({ type: 'negative', message, position: 'top', timeout: 5000 })
  } finally {
    isSubmitting.value = false
    isDragging.value = false
    swipeProgress.value = 0
    $q.loading.hide()
  }
}

onBeforeUnmount(() => {
  isDragging.value = false
  removeSwipeListeners?.()
})

</script>
