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
        <q-img :src="collection?.imageUrl || noImage" width="340px" height="350px" />
        <div class="flex column padding q-pl-md q-mr-auto q-mt-md">
          <div class="text-h5 q-mr-xs">{{ auction?.title || 'N/A' }}</div>
          <span class="q-mr-xs">Auctioneer: {{ auction?.auctioneer || 'N/A' }}</span>
          <span class="q-mr-xs">Auctioneer Rating: {{ auction?.rating || 'N/A' }}</span>
          <span class="q-mr-xs q-mb-lg">Posted On: {{ auction?.datePosted || 'N/A' }}</span>
          <span class="q-mr-xs">Auction Type: {{ auction?.type || 'N/A' }}</span>
          <span class="q-mr-xs">Auction Status:</span>
          <q-btn
            class="q-mb-lg text-white text-bold" 
            :style="`background-color: ${getStatusColor(getAuctionStatus(auction.startDate, auction.endDate))}`" 
            style="width: fit-content; padding: 2px 10px;"
            :label="getAuctionStatus(auction.startDate, auction.endDate)"
            flat
            dense
          />
          <span class="q-mr-xs text-bold">Description:</span>
          <span class="q-mr-xs q-mb-lg q-space">{{ auction?.description || 'N/A' }}</span>
          <span class="q-mr-xs">Start Date: {{ formatAuctionDate(auction.startDate) }}</span>
          <span class="q-mr-xs">End Date: {{ formatAuctionDate(auction.endDate) }}</span>
        </div>
      </div>
    </div>

    <!--EDIT THIS TO MAKE NEW LotSearch COMPONENT-->
    <div
      class="q-px-md q-pt-xs q-pb-md q-mt-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
      <LotSearch @search-change="lotSearchQuery = $event"/>
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">Lot Items</div>
        <q-select
          outlined
          dense
          v-model="lotType"
          :options="lotTypeOptions"
          emit-value
          map-options
          autocomplete="off"
          color="pt-primary1"
          debounce="500"
          :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
          class="q-ml-sm"
          style="width: 135px;"
        >
          <template v-slot:prepend>
            <q-icon name="filter_list" size="xs" />
          </template>
        </q-select>
      </div>

      <div>        
        <!--PLACE EACH CORRESP THING INSIDE A TEMPLATE WITH V-IFS AND V-FORS-->
        <div class="row items-start" ref="productsContainer">
          <!-- Skeleton loaders -->
           
          <!--
          <div class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-skeleton height="200px" square />
              <q-card-section>
                <q-skeleton type="text" width="30%" class="float-right" />
                <q-skeleton type="text" width="70%" />
                <q-skeleton type="text" width="30%" class="q-mt-xs" />
                <q-skeleton type="text" width="50%" class="q-mt-xs" />
                <q-skeleton type="text" width="50%" class="q-mt-xs" />
              </q-card-section>
            </q-card>
          </div>
          -->

          <!-- Actual products -->
          <div v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card 
              class="pt-card text-bow cursor-pointer" 
              :class="getDarkModeClass(darkMode)"
              @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: auctionId, lotId: lot.id }})"
            >
              <q-img :src="noImage" ratio="1">
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>
              <q-card-section>
                <div class="q-mb-xs bg-primary text-white row items-center q-gutter-x-xs q-pa-xs rounded-borders" style="display: inline-flex;">
                  <q-icon :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'" size="sm" />
                  <q-badge
                    :label="lot.category"
                    class="text-bold"
                    flat
                    color="transparent"
                  />
                </div>
                <div>
                  <q-chip
                    dense
                    :color="getStatusColor(getAuctionStatus(auction.startDate, auction.endDate))"
                    :label="getAuctionStatus(auction.startDate, auction.endDate)"
                    text-color="white"
                    class="q-pa-sm"
                  />
                </div>
                <div class="q-space text-body1 ellipsis text-bold">{{ lot.title }}</div>
                <div class="text-caption text-grey text-italic ellipsis">ID #{{ lot.id }}</div>
                <div class="text-subtitle2 text-bold text-positive q-mt-xs">Est: {{ lot.estimatedAmt.toFixed(8) }} BCH</div>
                <div class="text-caption text-grey-7">Min Bid: {{ lot.thresholdBid.toFixed(8) }} BCH</div>
              </q-card-section>
            </q-card>
          </div>
          
          <!-- Empty state -->
          <!--
          <div>
            {{ $t('NoProducts') }}
          </div>
          -->
        </div>
      </div>
      
    </div>
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

// Components
import HeaderNav from 'src/components/header-nav.vue'
import LotSearch from 'src/components/auction/LotSearch.vue'

const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  }
})

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $route = useRoute()

const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']

const auction = computed(() => {
  const listings = $store.getters['auction/processedItems'] || []
  return listings.find(item => item.id === Number(props.auctionId))
})

const lotSearchQuery = ref('')

const filteredLots = computed(() => {
  if (!auction.value || !auction.value.lots) return []
  
  let targetLots = auction.value.lots
  
  if (lotType.value !== 'All') {
    targetLots = targetLots.filter(lot => lot.category === lotType.value)
  }
  
  if (lotSearchQuery.value && lotSearchQuery.value.trim() !== '') {
    const query = lotSearchQuery.value.toLowerCase().trim()
    
    targetLots = targetLots.filter(lot => {
      return (
        lot.title.toLowerCase().includes(query) ||
        lot.id.toString().includes(query)
      )
    })
  }

  return targetLots
})




const getAuctionStatus = (startDateString, endDateString) => {
  if (!startDateString || !endDateString) return 'Closed'
  
  const now = new Date()
  const start = new Date(startDateString)
  const end = new Date(endDateString)

  if (now < start) return 'Upcoming'
  if (now >= start && now <= end) return 'Open'
  return 'Closed'
}

const getStatusColor = (status) => {
  if (status === 'Upcoming') return 'orange'
  if (status === 'Open') return 'green'
  return 'red'
}

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from

  if (sourceContext === 'activity') {
    return '/apps/auction/activity'
  }

  return '/apps/auction'
})

const refresh = (done) => {
  setTimeout(() => {
    done()
  }, 1000)
}
</script>