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
          <div class="text-h5 q-mb-xs">{{ auction?.title || 'N/A' }}</div>
          <div class="row q-mb-xs" style="max-width: 340px;"> 
            <strong class="shrink-0 q-mr-xs">Auctioneer:</strong>
            <span class="break-words text-left" style="word-break: break-all;">
              {{ auction?.user_id || 'N/A' }}
            </span>
          </div>
          <span class="q-mb-xs"><strong>Auctioneer Rating:</strong> {{ auction?.rating || 'N/A' }}</span>
          <span class="q-mb-xs q-mb-lg"><strong>Posted On:</strong> {{ auction?.datePosted || 'N/A' }}</span>
          <span class="q-mb-xs"><strong>Auction Type:</strong> {{ auction?.type || 'N/A' }}</span>
          <span class="q-mb-xs"><strong>Auction Status:</strong></span>
          <q-btn
            class="q-mb-lg text-white text-bold" 
            :style="`background-color: ${getAuctionStatusInfo(auction).color}`" 
            style="width: fit-content; padding: 2px 10px;"
            :label="getAuctionStatusInfo(auction).label"
            flat
            dense
          />
          <span class="q-mb-xs text-bold">Description:</span>
          <span class="q-mb-xs q-mb-lg q-space">{{ auction?.description || 'N/A' }}</span>
          <span class="q-mb-xs"><strong>Start Date:</strong> {{ formatAuctionDate(auction.start_date) }}</span>
          <span class="q-mb-xs"><strong>End Date:</strong> {{ formatAuctionDate(auction.end_date) }}</span>
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
          :bg-color="darkMode ? 'dark' : 'white'"
          :popup-content-style="{ color: darkMode ? '#ffffff' : '#000000' }"
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
          <div v-if="isLoading" class="col-6 col-sm-4 col-md-3 q-pa-sm">
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

          <div v-else-if="isLotEmpty"
            class="row flex-center q-mx-md q-mb-md rounded-borders"
            :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
            style="min-height: 70px; width: 100%;"
          >
            <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Lots Matched') }}</div>
          </div>

          <!-- Actual products -->
          <div v-else v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
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
                    :color="lot.getStatus().color"
                    :label="lot.getStatus().label"
                    text-color="white"
                    class="q-pa-sm"
                  />
                </div>
                <div class="q-space text-body1 ellipsis text-bold">{{ lot.title }}</div>
                <div class="text-caption text-grey text-italic ellipsis">ID #{{ lot.id }}</div>
                <div class="text-subtitle2 text-bold text-positive q-mt-xs">
                  Est: ₱{{ lot.estimated_amount }}
                </div>
                
                <div class="text-caption text-grey-7">
                  Min Bid: {{ lot.threshold_bid }} 
                  <span :style="{ opacity: darkMode ? 0.35 : 0.45 }">
                    {{ lot.threshold_bid }}
                  </span> BCH
                </div>
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
import { callApi } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object.js'

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

const isLoading = ref(false)

const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']

const auction = ref([])
const lots = ref([])

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

const fetchAllData = async () => {
  await Promise.all([
    callApi('auctions', Number(props.auctionId)).then(result => {
      if (result.success && result.data) {
        auction.value = parseAuctionData(result.data)
      }
    }).catch(err => console.error('Failed to update auction details:', err)),

    callApi('lots/auction', props.auctionId).then(result => {
      if (result.success && result.data) {
        lots.value = result.data.map(item => {
          const lot = LotsList.parse(item)

          lot.start_date = auction.value?.start_date || null
          lot.end_date = auction.value?.end_date || null

          return lot
        })
      }
    }).catch(err => console.error('Failed to update lots:', err))
  ])
}

onMounted(async () => {
  isLoading.value = true
  
  const auctionData = $store.getters['auction/processedItems'] || []
  const specificAuctionData = auctionData.find(item => item.id === Number(props.auctionId))
  auction.value = parseAuctionData(specificAuctionData)
  
  await fetchAllData()

  isLoading.value = false
})

const lotSearchQuery = ref('')

const filteredLots = computed(() => {
  let targetLots = lots.value 
  
  if (lotType.value !== 'All') {
    targetLots = targetLots.filter(lot => lot.category === lotType.value)
  }
  
  if (lotSearchQuery.value && lotSearchQuery.value.trim() !== '') {
    const query = lotSearchQuery.value.toLowerCase().trim()
    targetLots = targetLots.filter(lot => 
      lot.title?.toLowerCase().includes(query) || 
      lot.id?.toString().includes(query)
    )
  }
  return targetLots
})




const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }

const isLotEmpty = computed(() => {
  return !isLoading.value && filteredLots.value.length === 0
})

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

  return '/apps/auction'
})

const refresh = async (done) => {
  try {
    await fetchAllData()
  } catch (error) {
    console.error('Failed to refresh lot details:', error)
  } finally {
    done()
  }
}
</script>