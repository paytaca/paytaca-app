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

    <div v-else class="q-pa-md q-pb-xl text-bow" :class="getDarkModeClass(darkMode)">
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
              <span v-if="details.status === 'Resolved'">{{ details.timeSinceResolved }} ago</span>
              <span v-else>{{ details.timeSinceFiled }} ago</span>
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
              <div class="text-body2 text-weight-medium">{{ details.auctioneer.username ?? '—' }}</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                {{ details.auctioneer.address ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              @click="copyToClipboard(details.auctioneer.address, $q, { message: 'Copied to clipboard', position: 'top' })"
            />
          </div>

          <q-separator spaced="xs" />
          
          <div class="row items-center q-gutter-x-sm q-mt-sm">
            <q-avatar size="36px" color="primary" text-color="white" icon="person" />
            <div class="col">
              <div class="row items-center q-gutter-x-xs">
                <span class="text-caption text-weight-bold">BUYER</span>
              </div>
              <div class="text-body2 text-weight-medium">{{ details.bidder.username ?? '—' }}</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                {{ details.bidder.address ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              @click="copyToClipboard(details.bidder.address, $q, { message: 'Copied to clipboard', position: 'top' })"
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
              This dispute was resolved {{ details.timeSinceResolved }} ago.
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
              :color="selectedAction === 'Refund' ? 'negative' : 'primary'"
              text-color="white"
              label="Refund to Bidder"
              class="col"
              @click="selectedAction = 'Refund'"
            />
            <q-btn
              no-caps unelevated
              :color="selectedAction === 'Release' ? 'positive' : 'primary'"
              text-color="white"
              label="Release to Seller"
              class="col"
              @click="selectedAction = 'Release'"
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
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

// src imports
import { loadWallet } from "src/wallet"
import { callAPI } from 'src/auction/api'
import { DisputeDetails } from 'src/auction/object.js'
import { callContractFunction } from 'src/auction/arbiter'
import { copyToClipboard, formatBCH } from './helper-functions'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import DeliveryStatusHistoryDialog from 'src/components/auction/DeliveryStatusHistoryDialog.vue'
import TransactionsDialog from 'src/components/auction/TransactionsDialog.vue'

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
    const disputeResult = await callAPI('disputes', props.disputeId)
    if (!disputeResult.success || !disputeResult.data) throw new Error('Dispute not found')
    const dispute = disputeResult.data
    
    let lotId = null
    let auctionId = null
    let auctioneerData = null
    let bidderData = null
    let bidPriceBch = null
    let contractAddress = null

    if (dispute.bid) {
      const bidResult = await callAPI('biddings', dispute.bid)
      
      if (bidResult.success && bidResult.data) {
        const bid = bidResult.data
        bidPriceBch = bid.bid_price_bch
        lotId = bid.lot
        
        if (bid.bidder) {
          const bidderResult = await callAPI('user-details', bid.bidder)
          if (bidderResult.success && bidderResult.data) {
            bidderData = {
              bidder: bidderResult.data.user,
              username: bidderResult.data.username,
              address: bidderResult.data.address,
            }
          }
        }

        if (lotId) {
          const lotResult = await callAPI('lots', lotId)
          if (lotResult.success && lotResult.data) {
            auctionId = lotResult.data.auction
            
            if (auctionId) {
              const auctionResult = await callAPI('auctions', auctionId)
              if (auctionResult.success && auctionResult.data?.auctioneer) {
                const auctioneerResult = await callAPI('user-details', auctionResult.data.auctioneer)
                if (auctioneerResult.success && auctioneerResult.data) {
                  auctioneerData = {
                    auctioneer: auctioneerResult.data.user,
                    username: auctioneerResult.data.username,
                    address: auctioneerResult.data.address,
                  }
                }
              }
            }
          }
        }
      }

      const contractResult = await callAPI('contract-address', dispute.bid)
      if (contractResult.success && contractResult.data) {
        contractAddress = contractResult.data.bch_address
      }
    }
    
    // Save 
    disputeDetails.value = DisputeDetails.parse({
      ...dispute,
      lotId,
      auctionId,
      auctioneer: auctioneerData,
      bidder: bidderData,
      contract_address: contractAddress,
      bid_price_bch: bidPriceBch,
    })

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
let startX = 0

const startSwipe = async (e) => {
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
    if (swipeProgress.value >= 0.85) {
      swipeProgress.value = 1
      await handleAction()
    } else {
      swipeProgress.value = 0
    }
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onEnd)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onEnd)
  window.addEventListener('touchmove', onMove, { passive: true })
  window.addEventListener('touchend', onEnd)
}

const handleAction = async (addressPath=0) => {
  // Neither refund nor release
  if (!selectedAction.value) return

  try {
    $q.loading.show({ message: 'Processing...' })

    // Get wallet and public key
    const wallet = await loadWallet('BCH')
    const publicKey = await wallet.BCH.getPublicKey(addressPath)

    // Call release function from the server
    await $store.dispatch(
      `auction/callContractFunction`, 
      { 
        lotId: disputeDetails.value.lotId, 
        functionName: selectedAction.value, 
        publicKey 
      }
    )

    if (selectedAction.value === 'release') {
      // Fetch delivery details from the server
      await $store.dispatch('auction/fetchDeliveryDetails', disputeDetails.value.lotId)
      
      // Update delivery details (mark it as completed)
      await $store.dispatch('auction/createDeliveryEvent', { })
    } 

    const payload = {
      refund: { 
        is_granted_refund: true, 
        is_granted_return: false, 
        is_resolved: true 
      },
      release: { 
        is_granted_refund: false, 
        is_granted_return: true, 
        is_resolved: true 
    },
    }[selectedAction.value]

    await callAPI('disputes', props.disputeId, 'patch', payload)
    await callAPI('delivery-trackings', props.lotId, 'patch', { mark_as_completed: true })

    $q.notify({ type: 'positive', message: 'Action applied successfully.', position: 'top' })
    selectedAction.value = null
    swipeProgress.value = 0
  } catch (err) {
    console.error('Failed to apply action:', err)
    $q.notify({ type: 'negative', message: 'Failed to apply action.', position: 'top' })
    swipeProgress.value = 0
  } finally {
    $q.loading.hide()
  }
}

</script>
