<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row q-px-sm justify-center">
        <div class="column items-center">
          <div style="width: 340px; max-width: 340px;">
            <div class="text-h5 text-bold ellipsis q-mb-xs">
              Lot {{ lot.id }}: {{ lot.title }}
            </div>
            <div class="q-mb-md text-bold text-subtitle1 text-green">
              Highest Bid: {{ lot.thresholdBid ? lot.thresholdBid.toFixed(8) : '0.00000000' }} BCH
            </div>
          </div>
          
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
          
          <q-btn 
            class="q-mt-md text-bold text-white"
            style="width: 340px; background-color: var(--q-secondary);"
            padding="md"
            :label="lot.isSold ? 'LOT CLOSED' : 'PLACE BID'"
            :disabled="lot.isSold"
            @click="openDialog = !openDialog"
          />
        </div>

        <div class="flex column padding q-pl-md q-mr-auto q-mt-md">
          <div class="text-h5 q-mr-xs q-mb-md">Lot Details</div>

          <span class="q-mr-xs">Auction Title: {{ auction.title }}</span>
          <span class="q-mr-xs">Auctioneer By: {{ auction.auctioneer || 'N/A' }}</span>
          <span class="q-mr-xs q-mb-lg">Posted On: {{ auction.datePosted || 'N/A' }}</span>

          <span class="q-mr-xs">Bidding Status:</span>
          <q-btn 
            class="q-mb-lg text-white text-bold" 
            :style="lot.isSold ? 'background-color: #c10015;' : 'background-color: #097000;'" 
            :label="lot.isSold ? 'Closed / Sold' : 'Open for Bids'"
            flat
            dense
            style="width: fit-content; padding: 2px 10px;"
          />
          
          <span class="q-mr-xs">Item Type: {{ lot.category }} Asset</span>
          <span class="q-mr-xs q-mb-lg">Estimated Price: {{ lot.estimatedAmt ? lot.estimatedAmt.toFixed(8) : 'N/A' }} BCH</span>
          
          <span class="q-mr-xs">Auction Start: {{ auction.startDate || 'N/A' }}</span>
          <span class="q-mr-xs q-mb-lg">Auction End: {{ auction.endDate || 'N/A' }}</span>
          
          <span class="q-mr-xs text-bold">Description:</span>
          <span class="q-mr-xs q-space">{{ lot.description || 'No additional specifications provided.' }}</span>
        </div>
      </div>
    </div>

    <BiddingPopup v-model="openDialog" />
  </q-pull-to-refresh>
</template>

<script setup>

import noImage from 'src/assets/no-image.svg'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, watchEffect, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'

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

const openDialog = ref(false);

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $route = useRoute()

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