<template>
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav
      :title="details ? `Appeal #${details.id}` : 'Appeal'"
      backnavpath="/apps/auction/activity"
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
        REFUND APPEAL
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
              <q-icon name="schedule" size="xs" /> {{ details.timeSinceFiled }}h ago
            </span>
          </div>

          <div class="text-subtitle1 text-weight-medium q-mb-xs">
            Appeal #{{ details.id }}
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
                {{ details.auctioneer.user ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              @click="copyToClipboard(details.auctioneer.user)"
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
                {{ details.bidder.user ?? '—' }}
              </div>
            </div>
            <q-btn
              flat round dense icon="content_copy" size="xs"
              @click="copyToClipboard(details.bidder.user)"
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
              <span class="text-caption text-weight-medium">{{ contract.address ?? '—' }}</span>
              <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(contract.address)" />
            </div>
          </div>

          <div class="row items-center justify-between q-mb-sm">
            <span class="text-caption text-weight-bold">BALANCE</span>
            <span class="text-body2 text-weight-bold">
              {{ getFormattedBCH(contract.balance).main }}<span style="opacity: 0.4;">{{ getFormattedBCH(contract.balance).zeros }}</span> BCH
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
        <q-card-section class="q-py-sm">
          <div class="text-caption q-mb-sm">
            Select how the contract balance should be resolved.
          </div>

          <div class="row q-gutter-sm q-mb-md">
            <q-btn
              no-caps
              unelevated
              :color="selectedAction === 'refund' ? 'negative' : 'primary'"
              text-color="white"
              label="Refund Buyer"
              class="col"
              content-class="justify-center"
              @click="selectedAction = 'refund'"
            />
            <q-btn
              no-caps
              unelevated
              :color="selectedAction === 'release' ? 'positive' : 'primary'"
              text-color="white"
              label="Release to Seller"
              class="col"
              content-class="justify-center"
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
                Swipe to {{ selectedAction === 'refund' ? 'Refund' : 'Release' }}
              </span>
            </div>

            <div
              class="absolute-left rounded-borders"
              :style="{
                width: `${swipeProgress * 100}%`,
                height: '100%',
                background: selectedAction === 'refund' ? 'var(--q-negative)' : 'var(--q-positive)',
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
                background: selectedAction === 'refund' ? 'var(--q-negative)' : 'var(--q-positive)',
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

    <ArbiterStatusHistoryDialog
      v-model="showStatusHistory"
      :status-history="statusHistory"
    />

    <ArbiterTransactionsDialog
      v-model="showTransactions"
      :transactions="transactions"
    />

    <ArbiterRefundBuyerDialog
      v-model="showRefundDialog"
      :balance-display="getFormattedBCH(contract.balance).main"
      :bidId="details?.bid_id"
      @confirm="confirmAction"
      @cancel="cancelConfirm"
    />

    <ArbiterReleaseToSellerDialog
      v-model="showReleaseDialog"
      :balance-display="getFormattedBCH(contract.balance).main"
      :bidId="details?.bid_id"
      @confirm="confirmAction"
      @cancel="cancelConfirm"
    />
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { callAPI } from 'src/auction/api'
import { AppealDetails } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ArbiterTransactionsDialog from 'src/components/auction/Arbiter/ArbiterTransactionsDialog.vue'
import ArbiterStatusHistoryDialog from 'src/components/auction/Arbiter/ArbiterStatusHistoryDialog.vue'
import ArbiterRefundBuyerDialog from 'src/components/auction/Arbiter/ArbiterRefundBuyerDialog.vue'
import ArbiterReleaseToSellerDialog from 'src/components/auction/Arbiter/ArbiterReleaseToSellerDialog.vue'

const props = defineProps({
  appealId: {
    type: [String, Number],
    required: true
  }
})

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const isLoading = ref(true)
const details = ref(null)

const contract = ref({ address: null, balance: 0 })
const statusHistory = ref([])
const transactions = ref([])

onMounted(async () => {
  if (!props.appealId) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const disputeResult = await callAPI('disputes', props.appealId)
    if (!disputeResult.success || !disputeResult.data) throw new Error('Dispute not found')
    const dispute = disputeResult.data
    
    let lotId = null
    let auctionId = null
    let auctioneerData = null
    let bidderData = null

    if (dispute.bid) {
      const bidResult = await callAPI('biddings', dispute.bid)
      if (bidResult.success && bidResult.data) {
        const bid = bidResult.data
        lotId = bid.lot
        
        if (bid.user) {
          const bidderResult = await callAPI('user-details', bid.user)
          if (bidderResult.success && bidderResult.data) {
            bidderData = {
              user: bidderResult.data.user,
              username: bidderResult.data.username,
            }
          }
        }

        if (lotId) {
          const lotResult = await callAPI('lots', lotId)
          if (lotResult.success && lotResult.data) {
            auctionId = lotResult.data.auction
            
            if (auctionId) {
              const auctionResult = await callAPI('auctions', auctionId)
              if (auctionResult.success && auctionResult.data?.user) {
                const auctioneerResult = await callAPI('user-details', auctionResult.data.user)
                if (auctioneerResult.success && auctioneerResult.data) {
                  auctioneerData = {
                    user: auctioneerResult.data.user,
                    username: auctioneerResult.data.username,
                  }
                }
              }
            }
          }
        }
      }
    }
    
    details.value = AppealDetails.parse({
      ...dispute,
      lotId,
      auctionId,
      auctioneer: auctioneerData,
      bidder: bidderData,
    })
    
    if (dispute.contract) {
      const contractResult = await callAPI('contracts', dispute.contract)
      if (contractResult.success && contractResult.data) {
        contract.value = contractResult.data
      }
    }

  } catch (err) {
    console.error('Failed to load appeal:', err)
    $q.notify({ type: 'negative', message: 'Failed to load appeal details.', position: 'top' })
    details.value = null
  } finally {
    isLoading.value = false
  }
})

const selectedAction = ref(null)
const showStatusHistory = ref(false)
const showTransactions = ref(false)
const showRefundDialog = ref(false)
const showReleaseDialog = ref(false)

const swipeProgress = ref(0)
const isDragging = ref(false)
const swipeTrackWidth = ref(0)
const swipeTrackEl = ref(null)
let startX = 0

const getTrackWidth = () => swipeTrackEl.value ? swipeTrackEl.value.offsetWidth : 300

const startSwipe = (e) => {
  isDragging.value = true
  startX = e.touches ? e.touches[0].clientX : e.clientX
  swipeTrackWidth.value = getTrackWidth()

  const onMove = (ev) => {
    if (!isDragging.value) return
    const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX
    const delta = clientX - startX
    const max = swipeTrackWidth.value - 48
    swipeProgress.value = Math.min(1, Math.max(0, delta / max))
  }

  const onEnd = () => {
    isDragging.value = false
    if (swipeProgress.value >= 0.85) {
      swipeProgress.value = 1
      if (selectedAction.value === 'refund') showRefundDialog.value = true
      else showReleaseDialog.value = true
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

const cancelConfirm = () => {
  showRefundDialog.value = false
  showReleaseDialog.value = false
  swipeProgress.value = 0
}

const confirmAction = () => {
  showRefundDialog.value = false
  showReleaseDialog.value = false
  swipeProgress.value = 0
  selectedAction.value = null
}

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ message: 'Copied to clipboard', position: 'top', timeout: 1500 })
  })
}

const getFormattedBCH = (bch) => {
  const numStr = Number(bch ?? 0).toFixed(8)
  const match = numStr.match(/^(.*?)0*$/)
  const main = match ? match[1] : numStr
  const zeros = numStr.substring(main.length)
  return { main, zeros, full: numStr }
}
</script>