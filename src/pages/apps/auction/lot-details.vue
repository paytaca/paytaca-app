<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />

    <div class="q-pa-md q-pt-md text-box" :class="getDarkModeClass(darkMode)">
      <div class="q-mb-md text-left">
        <div class="text-h4 q-mb-sm">
          <span class="text-bold">Lot {{ lot.id }}: </span>{{ lot.title }}
        </div>
        <div class="text-h6 text-bold text-green">
          Highest Bid: {{ lot.thresholdBid ? lot.thresholdBid.toFixed(8) : '0.00000000' }} BCH
        </div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="column justify-center items-center col-auto" style="margin: 0 auto;">
          <q-carousel
            v-model="activeSlide"
            animated
            arrows
            navigation
            infinite
            height="350px"
            class="rounded-borders shadow-1"
            style="width: 340px;"
          >
            <q-carousel-slide 
              v-for="(imgSrc, index) in lotImages" 
              :key="index" 
              :name="index" 
              :img-src="imgSrc"
            />
          </q-carousel>
          
          <div class="flex justify-between q-mt-md" style="width: 340px;">
            <q-img 
              v-for="(imgSrc, index) in lotImages"
              :key="index"
              :src="imgSrc" 
              width="105px" 
              height="105px" 
              class="rounded-borders cursor-pointer transition-effect"
              :style="activeSlide === index ? 'border: 2px solid var(--q-secondary); padding: 2px;' : 'opacity: 0.7;'"
              @click="activeSlide = index"
            />
          </div>
          
          <div>
            <div v-if="auction.type === 'English'">
              <q-btn 
                class="q-mt-md text-bold text-white"
                style="width: 340px; background-color: var(--q-secondary);"
                padding="md"
                :label="lot.isSold ? 'LOT CLOSED' : 'PLACE BID'"
                :disabled="lot.isSold"
                @click="openDialog = !openDialog"
              />
            </div>

            <div v-else>
              <q-btn 
                class="q-mt-md text-bold text-white"
                style="width: 340px; background-color: var(--q-secondary);"
                padding="md"
                :label="lot.isSold ? 'LOT CLOSED' : 'BUY IT NOW'"
                :disabled="lot.isSold"
                @click="buyItNow"
              />
            </div>
          </div>
          
        </div>

        <div class="column col q-mx-sm">
          <div class="text-h6 text-bold q-mb-md text-uppercase tracking-wide">
            Lot Details
          </div>

          <span class="q-mb-xs"><strong>Auction Title:</strong> {{ auction.title }}</span>
          <span class="q-mb-xs"><strong>Auctioneer By:</strong> {{ auction.auctioneer || 'N/A' }}</span>
          <span class="q-mb-lg"><strong>Posted On:</strong> {{ auction.datePosted || 'N/A' }}</span>

          <span class="q-mb-xs text-weight-medium">Bidding Status:</span>
          <q-btn 
            class="q-mb-lg text-white text-bold" 
            :style="lot.isSold ? 'background-color: red;' : 'background-color: green;'" 
            :label="lot.isSold ? 'Closed / Sold' : 'Open for Bids'"
            flat
            dense
            style="width: fit-content; padding: 2px 12px; border-radius: 4px;"
          />
          
          <span class="q-mb-xs"><strong>Item Type:</strong> {{ lot.category }} Asset</span>
          <span class="q-mb-lg"><strong>Estimated Price:</strong> {{ lot.estimatedAmt ? lot.estimatedAmt.toFixed(8) : 'N/A' }} BCH</span>
          
          <span class="q-mb-xs"><strong>Auction Start:</strong> {{ auction.startDate || 'N/A' }}</span>
          <span class="q-mb-lg"><strong>Auction End:</strong> {{ auction.endDate || 'N/A' }}</span>
          
          <div class="column q-mt-xs">
            <span class="text-bold q-mb-xs">Description:</span>
            <span class="line-height-base">
              {{ lot.description || 'No additional specifications provided.' }}
            </span>
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

// Components
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'
import BuyItNowPopup from 'src/components/auction/BuyItNowPopup.vue'
import { useQuasar } from 'quasar'

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
  return listings.find(item => item.id === Number(props.auctionId))
})

const lot = computed(() => {
  if (!auction.value || !auction.value.lots) return null
  return auction.value.lots.find(item => item.id === Number(props.lotId))
})

const activeSlide = ref(0)
const lotImages = computed(() => {
  return [
    noImage,
    noImage,
    noImage
  ]
})

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