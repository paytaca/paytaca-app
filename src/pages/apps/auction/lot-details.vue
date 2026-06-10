<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="q-mb-lg text-left">
        <div class="text-h4 text-weight-bold q-mb-xs" style="overflow-wrap: break-word; word-wrap: break-word;">
          Lot {{ lot.id }}: <span class="text-weight-regular">{{ lot.title }}</span>
        </div>
        <div class="text-h6 text-weight-bold text-positive">
          Highest Bid: ₱950 
          <span style="opacity: 0.75;" class="text-weight-regular text-sm-subtitle1 q-ml-xs">
            ({{ lot.threshold_bid ? lot.threshold_bid.toFixed(8) : '0.00000000' }} BCH)
          </span>
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
              v-for="(imgSrc, index) in lotImages" 
              :key="index" 
              :name="index" 
              :img-src="imgSrc"
            />
          </q-carousel>
          
          <div class="row q-col-gutter-xs justify-center q-mt-xs">
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
          
          <div class="full-width q-mt-md">
            <div v-if="auction.type === 'English'">
              <q-btn 
                class="text-bold text-white full-width"
                style="background-color: var(--q-secondary);"
                padding="md"
                label="Place Bid"
                :disabled="lotStatus.label !== 'Open'"
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
                :disabled="lotStatus.label !== 'Open'"
                @click="buyItNow"
                unelevated
              />
            </div>
          </div>
        </div>

        <div class="col-12 col-sm col-md-7 q-mt-md q-mt-sm-none">
          <div class="text-subtitle1 text-bold q-mb-md text-uppercase tracking-wide">
            Lot Details
          </div>

          <div class="q-mb-sm"><strong>Auction Title:</strong> {{ auction.title }}</div>
          <div class="q-mb-sm"><strong>Auctioneer By:</strong> {{ auction.auctioneer || 'N/A' }}</div>
          <div class="q-mb-md"><strong>Posted On:</strong> {{ auction.datePosted || 'N/A' }}</div>

          <div class="row items-center q-mb-md">
            <span class="text-weight-medium q-mr-sm">Bidding Status:</span>
            <q-btn 
              class="text-white text-bold text-caption" 
              :style="{ backgroundColor: lotStatus.color }"
              :label="lotStatus.label"
              unelevated
              dense
              style="width: fit-content; padding: 2px 12px; border-radius: 4px;"
            />
          </div>
          
          <div class="q-mb-sm"><strong>Item Type:</strong> {{ lot.category }} Asset</div>
          <div class="q-mb-md">
            <strong>Estimated Price:</strong> ₱950
            <span style="opacity: 0.75;" class="text-weight-regular q-ml-xs">
              ({{ formatBCHTrailingZeroes(lot.estimated_amount).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ formatBCHTrailingZeroes(lot.estimated_amount).zeros }}</span> BCH)
            </span>
          </div>
          
          <div class="q-mb-sm"><strong>Auction Start:</strong> {{ formatAuctionDate(auction.start_date) }}</div>
          <div class="q-mb-lg"><strong>Auction End:</strong> {{ formatAuctionDate(auction.end_date) }}</div>
          
          <div class="column q-mt-xs">
            <div class="text-bold q-mb-xs">Description:</div>
            <p class="text-body2 text-left" style="white-space: pre-wrap; line-height: 1.5;">
              {{ lot.description || 'No additional specifications provided.' }}
            </p>
          </div>
        </div>
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

import noImage from 'src/assets/no-image.svg'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, watchEffect, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
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

const auction = computed(() => {
  const listings = $store.getters['auction/processedItems'] || []
  const found = listings.find(item => item.id === Number(props.auctionId))
  return found instanceof AuctionList ? found : AuctionList.parse(found)
})

const lot = ref(new LotsList({}))

onMounted(async () => {
  const result = await callAPI('lots', props.lotId)
  
  if (result.success) {
    const parsed = LotsList.parse(result.data)
    
    if (auction.value) {
      parsed.start_date = auction.value.start_date
      parsed.end_date = auction.value.end_date
    }
    lot.value = parsed
  }
})

const activeSlide = ref(0)
const lotImages = computed(() => {
  return [
    noImage,
    noImage,
    noImage
  ]
})




const lotStatus = computed(() => {
  if (!lot.value) return { label: 'Loading...', color: 'grey' }
  return lot.value.getStatus()
})

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }

const formatBCHTrailingZeroes = (value) => {
  if (value === undefined || value === null) {
    return { main: '0.00', zeros: '000000' }
  }
  
  const numStr = typeof value === 'number' ? value.toFixed(8) : Number(value).toFixed(8)
  
  const match = numStr.match(/^(.*?)0*$/)
  const main = match[1]
  const zeros = numStr.substring(main.length)
  
  return { main, zeros }
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from

  if (sourceContext === 'activity') {
    return '/apps/auction/activity'
  }

  return `/apps/auction/${$route.params.auctionId}`
})

const refresh = (done) => {
  setTimeout(() => {
    done()
  }, 1000)
}
</script>