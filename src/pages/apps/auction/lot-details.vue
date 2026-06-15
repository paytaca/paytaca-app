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
                    :disabled="lot.getLotStatus(auction.start_date, auction.end_date).label !== 'Open'"
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
            <div class="row q-gutter-sm q-mb-md">
              <div class="col rounded-borders q-pa-sm bg-green">
                <div class="text-caption q-mb-xs">
                  <q-icon name="payments" size="12px" class="q-mr-xs" />Highest Bid
                </div>
                <div class="text-weight-medium">₱950</div>
                <div class="text-caption text-weight-medium">
                  {{ lot.getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: 0.45 }">{{ lot.getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH
                </div>
              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="price_change" size="12px" class="q-mr-xs" />Estimated Amount
                </div>
                <div class="text-weight-medium">₱950</div>
                <div class="text-caption text-weight-medium">
                  {{ lot.getFormattedBCH(lot.estimated_amount).main }}<span :style="{ opacity: 0.45 }">{{ lot.getFormattedBCH(lot.estimated_amount).zeros }}</span> BCH
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
                  <span>{{ auction?.date_posted || 'N/A' }}</span>
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

    <BiddingPopup v-model="openDialog" />
    <BuyItNowPopup
      v-model:isToggledBuyItNow="isToggledBuyItNow"
      @confirm-buy-it-now="handleBuyItNow"
    />
  </q-pull-to-refresh>
</template>

<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch } from 'vue' 
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

const openDialog = ref(false)
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $route = useRoute()

const isToggledBuyItNow = ref(false)
const activeSlide = ref(0)
const lotImages = ref([])

const lot = ref(null)
const auction = ref(null)

const buyItNow = () => {
  isToggledBuyItNow.value = true
}

const handleBuyItNow = () => {
  isToggledBuyItNow.value = false
  $q.notify({
    type: 'positive',
    message: 'Lot bought successfully!',
    timeout: 3000
  })
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
  await Promise.all([
    fetchLot(),
    fetchAuction()
  ])
}

watch(() => [props.lotId, props.auctionId], async () => {
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
  if (sourceContext === 'activity') {
    return '/apps/auction/activity'
  }
  return `/apps/auction/${props.auctionId}`
})

const refresh = async (done) => {
  await loadPageData()
  done()
}
</script>