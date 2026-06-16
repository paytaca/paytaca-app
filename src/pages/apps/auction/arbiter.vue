<template>
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Appeal #002')" backnavpath="/apps/auction/activity" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-pa-md q-pb-xl text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-caption text-weight-bold q-mb-xs q-px-xs">
        REFUND APPEAL
      </div>
      <q-card class="pt-card text-bow q-mb-md" :class="getDarkModeClass(darkMode)">
        <q-card-section class="q-py-sm">
          <div class="row items-center justify-between q-mb-xs q-mt-sm">
            <q-chip
              dense
              color="warning"
              text-color="white"
              class="text-caption text-weight-bold"
              style="margin: 0; padding: 3px 8px; height: auto;"
            >
              <q-icon name="autorenew" size="xs" class="q-mr-xs" />
              Pending
            </q-chip>
            <span class="text-caption" style="opacity: 0.65;">
              <q-icon name="schedule" size="xs" /> 14h ago
            </span>
          </div>

          <div class="text-subtitle1 text-weight-medium q-mb-xs">Appeal #002</div>

          <q-separator spaced="sm" />

          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-weight-bold">AUCTION</span>
            <span class="text-caption" style="opacity: 0.65;">#15</span>
          </div>
          <div class="row items-center justify-between q-mb-xs">
            <span class="text-caption text-weight-bold">LOT</span>
            <span class="text-caption" style="opacity: 0.65;">#7</span>
          </div>

          <q-separator spaced="sm" />

          <div class="row q-gutter-xs q-my-sm">
            <q-badge
              v-for="reason in appeal.reasons"
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
              <div class="text-body2 text-weight-medium">Juan dela Cruz</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                bitcoincash:qr5z…w8kf
              </div>
            </div>
            <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(seller.address)" />
          </div>

          <q-separator spaced="xs" />
          
          <div class="row items-center q-gutter-x-sm q-mt-sm">
            <q-avatar size="36px" color="primary" text-color="white" icon="person" />
            <div class="col">
              <div class="row items-center q-gutter-x-xs">
                <span class="text-caption text-weight-bold">BUYER</span>
              </div>
              <div class="text-body2 text-weight-medium">Maria Santos</div>
              <div class="text-caption ellipsis" style="opacity: 0.55; max-width: 200px;">
                bitcoincash:qq9a…m3dt
              </div>
            </div>
            <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(buyer.address)" />
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
              <span class="text-caption text-weight-medium">bitcoincash:pq3x…j7nt</span>
              <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(contract.address)" />
            </div>
          </div>

          <div class="row items-center justify-between q-mb-sm">
            <span class="text-caption text-weight-bold">BALANCE</span>
            <span class="text-body2 text-weight-bold">
              {{ getFormattedBCH(contract.balance).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(contract.balance).zeros }}</span> BCH
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
          
          <div v-if="selectedAction" ref="swipeTrackEl" class="relative-position rounded-borders overflow-hidden"
            :style="{
              background: darkMode ? '#2a2a2a' : '#f0f0f0',
              height: '48px',
            }"
          >
            <div class="absolute-full row items-center justify-center">
              <span class="text-caption text-weight-bold" :style="{ opacity: swipeProgress > 0.4 ? 0 : 0.5 - swipeProgress }">
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

          <div v-else class="row items-center justify-center rounded-borders q-py-sm"
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
      @confirm="confirmAction"
      @cancel="cancelConfirm"
    />

    <ArbiterReleaseToSellerDialog
      v-model="showReleaseDialog"
      :balance-display="getFormattedBCH(contract.balance).main"
      @confirm="confirmAction"
      @cancel="cancelConfirm"
    />

  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ArbiterTransactionsDialog from 'src/components/auction/Arbiter/ArbiterTransactionsDialog.vue'
import ArbiterStatusHistoryDialog from 'src/components/auction/Arbiter/ArbiterStatusHistoryDialog.vue'
import ArbiterRefundBuyerDialog from 'src/components/auction/Arbiter/ArbiterRefundBuyerDialog.vue'
import ArbiterReleaseToSellerDialog from 'src/components/auction/Arbiter/ArbiterReleaseToSellerDialog.vue'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const appeal = {
  number: '002',
  auctionId: '15',
  lotNumber: '7',
  hoursSinceFiled: 14,
  status: 'Pending',
  reasons: ['Item misdescribed', 'Non-delivery']
}

const seller = {
  name: 'Juan dela Cruz',
  address: 'bitcoincash:qr5zp8wd5tvq3vkmk3wf5gj9uyp2yw8kf',
  verified: true
}

const buyer = {
  name: 'Maria Santos',
  address: 'bitcoincash:qq9a4xkpt7q6lnhyz03xr8mw4y8ym3dt'
}

const contract = {
  address: 'bitcoincash:pq3xh7w2v5klr9mw4yfx0pj6kd8tj7nt',
  balance: 0.05440000
}

const statusHistory = [
  { id: 1, status: 'Appeal Filed', timestamp: 'Jun 15, 2026 · 10:02 AM', color: 'warning',  icon: 'flag', note: 'Buyer filed a refund appeal.' },
  { id: 2, status: 'Under Review', timestamp: 'Jun 15, 2026 · 10:15 AM', color: 'primary',  icon: 'search', note: 'Arbiter assigned and reviewing.' },
  { id: 3, status: 'Evidence Period', timestamp: 'Jun 15, 2026 · 11:00 AM', color: 'secondary',icon: 'attach_file', note: 'Both parties submitted evidence.' },
  { id: 4, status: 'Pending Decision', timestamp: 'Jun 16, 2026 · 12:00 AM', color: 'orange',   icon: 'hourglass_top', note: 'Awaiting arbiter final action.' },
]

const transactions = [
  { id: 1, type: 'in',  label: 'Buyer Deposit', amount: '0.054000', txid: 'a3f8…c921', timestamp: 'Jun 14, 2026 · 03:41 PM' },
  { id: 2, type: 'in',  label: 'Arbitration Fee', amount: '0.000500', txid: 'b7d2…e045', timestamp: 'Jun 15, 2026 · 10:05 AM' },
]

const selectedAction = ref(null)
const showStatusHistory = ref(false)
const showTransactions = ref(false)
const showRefundDialog = ref(false)
const showReleaseDialog = ref(false)

const swipeProgress = ref(0)
const isDragging = ref(false)
const swipeTrackWidth = ref(0)
let startX = 0

const swipeTrackEl = ref(null)

const getTrackWidth = () => {
  return swipeTrackEl.value ? swipeTrackEl.value.offsetWidth : 300
}

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
      if (selectedAction.value === 'refund') {
        showRefundDialog.value = true
      } else {
        showReleaseDialog.value = true
      }
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
  $q.notify({
    type: selectedAction.value === 'refund' ? 'negative' : 'positive',
    message: selectedAction.value === 'refund'
      ? 'Refund initiated. Buyer will receive 0.054 BCH.'
      : 'Funds released to seller.',
    position: 'top',
    timeout: 3000
  })
  selectedAction.value = null
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ message: 'Copied to clipboard', position: 'top', timeout: 1500 })
  })
}

onMounted(() => {
  swipeTrackWidth.value = getTrackWidth()
})




const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
}
</script>