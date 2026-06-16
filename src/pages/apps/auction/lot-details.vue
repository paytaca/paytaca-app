<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />
 
    <div>
      <div v-if="lot && auction" class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
        <div class="q-mb-lg text-left">
          <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
            Lot {{ lot.id }}: <span class="text-weight-regular">{{ lot.title }}</span>
          </div>
 
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'" size="12px" class="q-mr-xs" />
              {{ lot.category }}
            </q-badge>
            <q-badge
              :color="lot.getLotStatus(auction.start_date, auction.end_date).color"
              class="q-pa-sm q-px-sm text-weight-bold"
            >
              {{ lot.getLotStatus(auction.start_date, auction.end_date).label }}
            </q-badge>
          </div>
        </div>
 
        <div class="row q-col-gutter-y-md q-col-gutter-x-none q-col-gutter-x-sm-md q-col-gutter-x-md-xl justify-center justify-sm-start items-start">
          <div class="col-12 col-sm-5 col-md-4 q-pr-md-lg" style="width: 100%; max-width: 380px; min-width: 280px;">
            <q-carousel
              v-model="activeSlide"
              animated
              arrows
              navigation
              infinite
              height="350px"
              class="rounded-borders shadow-1 full-width"
              :control-color="darkMode ? 'white' : 'primary'"
              :control-text-color="darkMode ? 'white' : 'primary'"
            >
              <q-carousel-slide
                v-for="(img, index) in lotImages"
                :key="index"
                :name="index"
                :img-src="img"
              />
            </q-carousel>
 
            <div class="row q-col-gutter-sm justify-center q-mt-xs">
              <div
                v-for="(imgSrc, index) in lotImages"
                :key="index"
                class="col-4"
              >
                <q-img
                  :src="imgSrc"
                  ratio="1"
                  style="max-width: 100%;"
                  class="rounded-borders cursor-pointer transition-effect full-width"
                  :style="activeSlide === index ? 'border: 2px solid var(--q-secondary);' : 'opacity: 0.7;'"
                  @click="activeSlide = index"
                />
              </div>
            </div>
 
            <div class="q-mt-md">
              <div v-if="!isAuthor" class="full-width">
                <div v-if="auction?.type === 'English'">
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    label="Place Bid"
                    :disabled="lot.getLotStatus(auction.start_date, auction.end_date).label !== 'Open'"
                    @click="openDialog = !openDialog"
                    unelevated
                  />
                </div>
 
                <div v-else>
                  <q-btn 
                    class="text-bold text-white full-width"
                    style="background-color: var(--q-secondary);"
                    padding="md"
                    label="Buy It Now"
                    :disabled="lot.getLotStatus(auction.start_date, auction.end_date).label !== 'Open' || dutchAlreadySold"
                    @click="buyItNow"
                    unelevated
                  />
                </div>
              </div>
 
              <div v-else
                class="row flex-center full-width rounded-borders"
                :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
                style="min-height: 50px; width: 100%;"
              >
                <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('You are the author of this auction.') }}</div>
              </div>
            </div>
          </div>
 
          <div class="col-12 col-sm col-md-7">
            <div class="col rounded-borders q-pa-sm q-mb-md bg-primary">
              <div class="text-caption q-mb-xs">
                <q-icon name="price_change" size="12px" class="q-mr-xs" />Estimated Amount
              </div>
              <div class="text-weight-medium">₱950</div>
              <div class="text-caption text-weight-medium">
                {{ lot.getFormattedBCH(lot.estimated_amount).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ lot.getFormattedBCH(lot.estimated_amount).zeros }}</span> BCH
              </div>
            </div>

            <div v-if="auction?.type === 'English'" class="col rounded-borders q-pa-sm q-mb-md bg-green">
              <div class="row items-center justify-between q-mb-xs">
                <div class="text-caption">
                  <q-icon name="payments" size="12px" class="q-mr-xs" />Highest Bid
                </div>
                <q-spinner-dots v-if="englishBidPolling" size="12px" />
              </div>
              <template v-if="englishHighestBid">
                <div class="text-weight-medium">
                  {{ lot.getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ lot.getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH
                </div>
              </template>
              <template v-else>
                <div class="text-weight-medium" style="opacity: 0.5;">No bids yet</div>
                <div class="text-caption text-weight-medium">
                  {{ lot.getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ lot.getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH · floor
                </div>
              </template>
            </div>
 
            <div v-else class="col-12 rounded-borders q-pa-sm q-mb-md bg-green">
              <div class="row items-center justify-between q-mb-xs">
                <div class="text-caption">
                  <q-icon name="trending_down" size="12px" class="q-mr-xs" />Current Price
                </div>
              </div>
              <div class="row items-end justify-between q-mb-sm">
                <div>
                  <div class="text-weight-medium">
                    {{ getFormattedBCH(dutchCurrentPriceBch).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(dutchCurrentPriceBch).zeros }}</span> BCH
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption" style="opacity: 0.55;">Floor</div>
                  <div class="text-caption text-weight-medium">
                    {{ getFormattedBCH(dutchFloorPriceBch).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ getFormattedBCH(dutchFloorPriceBch).zeros }}</span> BCH
                  </div>
                </div>
              </div>
            </div>
 
            <q-card flat bordered class="q-mb-md">
              <q-card-section class="q-pa-sm">
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="gavel" size="13px" class="q-mr-xs" />Auction
                  </div>
                  <span>{{ auction?.title || 'N/A' }}</span>
                </div>
                <q-separator spaced="xs" />
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="person" size="13px" class="q-mr-xs" />Auctioneer
                  </div>
                  <div class="col row items-center q-gutter-xs">
                    <span>{{ auction?.getEllipsisInMiddleUserId ? auction.getEllipsisInMiddleUserId() : 'N/A' }}</span>
                    <q-badge v-if="isAuthor" color="positive" class="q-px-xs q-mr-sm">
                      <q-icon name="star" size="10px" class="q-mr-xs" />You
                    </q-badge>
                  </div>
                </div>
                <q-separator spaced="xs" />
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="event" size="13px" class="q-mr-xs" />Posted on
                  </div>
                  <span>{{ formatAuctionDate(auction.creation_date) || 'N/A' }}</span>
                </div>
              </q-card-section>
            </q-card>
 
            <div class="column q-mt-xs">
              <div class="text-bold q-mb-xs">Description:</div>
              <p class="text-body2 text-left" style="white-space: pre-wrap; line-height: 1.5;">
                {{ lot.description || 'No additional specifications provided.' }}
              </p>
            </div>
 
            <div class="row q-gutter-sm">
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_available" size="12px" class="q-mr-xs" />Start date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.start_date) }}
                </div>
              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.end_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
 
      <div v-else class="q-pa-md column q-gutter-y-md">
        <q-skeleton type="text" width="60%" height="32px" />
        <q-skeleton height="350px" />
        <q-skeleton type="text" width="40%" />
        <q-skeleton type="text" width="80%" />
      </div>
    </div>
 
    <BiddingPopup
      v-model="openDialog"
      :lot="lot"
      :auction="auction"
      :loading="englishBidLoading"
      @place-bid="handlePlaceBid"
    />
    <BuyItNowPopup
      v-model:isToggledBuyItNow="isToggledBuyItNow"
      :lot="lot"
      :auction="auction"
      :current-price-bch="dutchCurrentPriceBch"
      :loading="buyItNowLoading"
      @confirm-buy-it-now="handleBuyItNow"
    />
  </q-pull-to-refresh>
</template>

<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
import { AuctionList, LotsList } from 'src/auction/object'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  },
  lotId: {
    type: [String, Number],
    required: true
  }
})

const activeSlide = ref(0)
const lotImages = ref([])
const lot = ref(null)
const auction = ref(null)
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

const $q = useQuasar()
const $store = useStore()
const $route = useRoute()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])




// =========================================================================
// ============================ ENGLISH AUCTION ============================
// =========================================================================
const openDialog = ref(false)
const englishBidLoading = ref(false)
const englishBidPolling = ref(false)
const englishHighestBid = computed(() => Number(lot.value?.threshold_bid || 0))

const handlePlaceBid = async ({ bid_price_bch }) => {
  if (!walletHash) {
    $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
    return
  }

  englishBidLoading.value = true
  try {
    const payload = {
      user_id: walletHash,
      lot_id: props.lotId,
      bid_price_bch: Number(bid_price_bch).toFixed(8),
      is_final_bid: true
    }

    const bidResponse = await callAPI('biddings', null, 'post', payload)

    if (!bidResponse.success) {
      throw new Error(bidResponse.error || 'Bid failed. Please try again.')
    }

    await callAPI('lots', props.lotId, 'patch', { threshold_bid: Number(bid_price_bch).toFixed(8) })
    
    openDialog.value = false
    $q.notify({
      type: 'positive',
      icon: 'gavel',
      message: `Bid of ${getFormattedBCH(bid_price_bch).main}${getFormattedBCH(bid_price_bch).zeros} BCH placed!`,
      timeout: 3000
    })
    
    await fetchLot()
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    englishBidLoading.value = false
  }
}



// =========================================================================
// ============================= DUTCH AUCTION =============================
// =========================================================================
const isToggledBuyItNow = ref(false)
const buyItNowLoading = ref(false)
const dutchAlreadySold  = ref(false)

const TIME_INTERVAL_MS = 1000 * 60 * 10
const INITIAL_SECONDS = TIME_INTERVAL_MS / 1000

const secondsRemaining = ref(INITIAL_SECONDS)
const dynamicPriceBch = ref(0)

let testingAuctionTimer = null
let visualCountdownTimer = null

const applyBchPriceDropStep = () => {
  if (!lot.value) return

  const bchFloor = Number(lot.value.threshold_bid || 0)
  const bchDecrementPerStep = Number(lot.value.bidding_decrement || 0.000005)
  const nextBch = dynamicPriceBch.value - bchDecrementPerStep
  
  dynamicPriceBch.value = Math.max(nextBch, bchFloor)
  
  if (dynamicPriceBch.value <= bchFloor) {
    if (testingAuctionTimer) clearInterval(testingAuctionTimer)
    if (visualCountdownTimer) clearInterval(visualCountdownTimer)
    secondsRemaining.value = 0
  }
}

watch(lot, (newLotData) => {
  if (!newLotData) return

  if (testingAuctionTimer) clearInterval(testingAuctionTimer)
  if (visualCountdownTimer) clearInterval(visualCountdownTimer)
  
  dynamicPriceBch.value = Number(newLotData.starting_price || 0)
  secondsRemaining.value = INITIAL_SECONDS
  
  testingAuctionTimer = setInterval(() => {
    applyBchPriceDropStep()
    secondsRemaining.value = INITIAL_SECONDS
  }, TIME_INTERVAL_MS)
  
  visualCountdownTimer = setInterval(() => {
    if (secondsRemaining.value > 0) {
      secondsRemaining.value--
    }
  }, 1000)
}, { deep: true })

onUnmounted(() => {
  if (testingAuctionTimer) clearInterval(testingAuctionTimer)
  if (visualCountdownTimer) clearInterval(visualCountdownTimer)
})

const dutchFloorPriceBch    = computed(() => Number(lot.value?.threshold_bid || 0))
const dutchCurrentPriceBch  = computed(() => dynamicPriceBch.value)

const buyItNow = () => { 
  isToggledBuyItNow.value = true 
}

const handleBuyItNow = async (payload = {}) => {
  isToggledBuyItNow.value = false
  if (auction.value?.type !== 'Dutch') return

  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  if (!walletHash) {
    return $q.notify({ type: 'warning', message: 'Please connect your wallet first.' })
  }

  buyItNowLoading.value = true

  try {
    const bidBch = payload.bid_price_bch ?? dutchCurrentPriceBch.value
    const res = await callAPI('biddings', null, 'post', {
      user_id: walletHash,
      lot_id: props.lotId,
      bid_price_bch: Number(bidBch).toFixed(8),
      bid_price_fiat: 0,
      is_final_bid: true
    })

    if (res.success) {
      dutchAlreadySold.value = true
      $q.notify({
        type: 'positive',
        message: `Secured for ${getFormattedBCH(dutchCurrentPriceBch.value).main}${getFormattedBCH(dutchCurrentPriceBch.value).zeros} BCH!`,
      })
    } else {
      throw new Error(res.error || 'Transaction failed. Please try again.')
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    buyItNowLoading.value = false
  }
}

const fetchDutchSoldStatus = async () => {
  if (auction.value?.type !== 'Dutch') return
  
  try {
    const res = await callAPI('biddings', null, 'get', null, { lot_id: props.lotId, is_final_bid: true })
    dutchAlreadySold.value = res.success && res.data?.length > 0
  } catch (err) {
    console.warn('Could not verify if lot was already sold:', err)
  }
}






const formatFiat = (val) => {
  if (val == null) return '—'
  return Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const getFormattedBCH = (bch) => {
    const numStr = Number(bch).toFixed(8);
    const match = numStr.match(/^(.*?)0*$/);
    const main = match ? match[1] : numStr;
    const zeros = numStr.substring(main.length);
    return { main, zeros, full: numStr };
  }

const fetchAuction = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      auction.value = AuctionList.parse(result.data)
    }
  } catch (error) {
    console.error('Failed to update auction details:', error)
  }
}

const fetchLot = async () => {
  const result = await callAPI('lots', props.lotId)
  if (result.success) {
    lot.value = LotsList.parse(result.data)

    const imageResult = await callAPI('lot-images-by-lot', props.lotId, 'get')
    if (imageResult.success && Array.isArray(imageResult.data)) {
      lotImages.value = imageResult.data.map(item => item.image)
    }
  }
}

const loadPageData = async () => {
  await Promise.all([fetchLot(), fetchAuction()])
  await fetchDutchSoldStatus()
}

watch(() => [props.lotId, props.auctionId], async () => {
  dutchAlreadySold.value = false
  await loadPageData()
}, { immediate: true })




const isAuthor = computed(() => {
  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  return walletHash === auction.value?.user_id
})

const formatAuctionDate = (dateString) => {
  if (!dateString) return 'N/A'
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A')
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction/${props.auctionId}`
})

const refresh = async (done) => {
  dutchAlreadySold.value = false
  await loadPageData()
  done()
}
</script>