<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction" class="header-nav" />

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row q-col-gutter-md justify-start items-start">
        <div class="col-12 col-sm-auto flex justify-center">
          <q-img 
            :src="auction?.image || noImage" 
            width="340px" 
            height="350px" 
            class="rounded-borders shadow-1" 
          />
        </div>

        <div v-if="auction" class="col-12 col-sm-auto flex column" style="max-width: 450px; min-width: 280px;">
          <div class="row items-center q-gutter-sm q-mb-sm">
            <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
              <q-icon name="gavel" size="12px" class="q-mr-xs" />
              {{ auction.type }} Auction
            </q-badge>
            <q-badge
              :color="getAuctionStatusInfo(auction).color"
              class="q-pa-sm q-px-sm text-weight-bold"
            >
              {{ getAuctionStatusInfo(auction).label }}
            </q-badge>
          </div>

          <div class="text-h5 text-weight-medium q-mb-md">
            {{ auction?.title || 'N/A' }}
          </div>

          <q-card flat bordered class="q-mb-md self-start full-width">
            <q-card-section class="q-pa-sm q-pb-none">
              <div class="row items-center q-py-xs">
                <div class="text-caption col-4 q-mr-sm">
                  <q-icon name="person" size="13px" class="q-mr-xs" />Auctioneer
                </div>
                <div class="col row items-center q-gutter-xs">
                  <span>{{ auction.getEllipsisInMiddleUserId() }}</span>
                  <q-badge v-if="isAuthor" color="positive" class="q-px-xs q-ml-sm">
                    <q-icon name="star" size="10px" class="q-mr-xs" />You
                  </q-badge>
                </div>
              </div>

              <q-separator />

              <div class="row items-center q-py-xs">
                <div class="text-caption col-4 q-mr-sm">
                  <q-icon name="star" size="13px" class="q-mr-xs" />Rating
                </div>
                <span>{{ auction?.rating || 'N/A' }}</span>
              </div>

              <q-separator />

              <div class="row items-center q-py-xs">
                <div class="text-caption col-4 q-mr-sm">
                  <q-icon name="event" size="13px" class="q-mr-xs" />Posted on
                </div>
                <span>{{ formatAuctionDate(auction.creation_date) }}</span>
              </div>

            </q-card-section>
          </q-card>

          <div class="text-bold">Description:</div>
          <p class="q-mb-md text-left" style="white-space: pre-wrap;">
            {{ auction?.description || 'N/A' }}
          </p>

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

        <div v-else class="col-12 col-sm-auto flex column q-gutter-y-sm" style="max-width: 450px; min-width: 280px;">
          <q-skeleton type="rect" width="160px" height="24px" />
          <q-skeleton type="rect" width="80%" height="32px" />
          <q-skeleton type="rect" height="100px" />
          <q-skeleton type="rect" height="60px" />
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
              @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: auctionId, lotId: lot.id } })"
            >
              <div class="relative-position">
                <q-img
                  :src="lot.images?.[0] || noImage"
                  ratio="1.25"
                >
                  <template v-slot:loading>
                    <q-skeleton height="100%" width="100%" square />
                  </template>
                </q-img>

                <q-chip
                  dense
                  :color="lot.getStatus().color"
                  text-color="white"
                  class="absolute text-caption text-weight-bold"
                  style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
                >
                  {{ lot.getStatus().label }}
                </q-chip>
              </div>

              <q-card-section class="q-py-sm">
                <q-chip
                  dense
                  text-color="white"
                  class="text-caption text-weight-bold bg-primary"
                  style="margin: 0; padding: 3px 8px; height: auto;"
                >
                  <q-icon
                    :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'"
                    size="xs"
                    class="q-mr-xs"
                  />
                  {{ lot.category }}
                </q-chip>

                <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs">
                  {{ lot.title }}
                </div>

                <q-separator spaced="sm" />
                
                <div class="row items-center justify-between q-mb-xs">
                  <span class="text-caption text-weight-bold" style="text-transform: uppercase; letter-spacing: 0.4px;">Current Bid</span>
                  <div class="row items-baseline q-gutter-x-xs">
                    <span class="text-weight-medium" style="font-size: 12px;">₱900.00</span>
                    <span class="text-caption" style="opacity: 0.65;">
                      {{ lot.getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">{{ lot.getFormattedBCH(lot.threshold_bid).zeros }}</span> BCH
                    </span>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
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
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
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

const auction = ref(null)
const lots = ref([])

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

const fetchAllData = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      auction.value = parseAuctionData(result.data)
    }
  } catch (err) {
    console.error('Failed to update auction details:', err)
  }

  try {
    const result = await callAPI('lots/auction', Number(props.auctionId))
    if (result.success && result.data) {
      lots.value = result.data.map(item => {
        const lot = LotsList.parse(item)
        lot.start_date = auction.value?.start_date || null
        lot.end_date = auction.value?.end_date || null
        return lot
      })
    }
  } catch (err) {
    console.error('Failed to update lots:', err)
  }
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

const isAuthor = computed(() => {
  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  return walletHash === auction?.value.user_id
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