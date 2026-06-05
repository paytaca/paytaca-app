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
            :style="auction.isOpen ?  'background-color: #097000;' : 'background-color: #c10015;'" 
            style="width: fit-content; padding: 2px 10px;"
            :label="auction.isOpen ? 'Active Open' : 'Closed'"
            flat
            dense
          />
          <span class="q-mr-xs text-bold">Description:</span>
          <span class="q-mr-xs q-mb-lg q-space">{{ auction?.description || 'N/A' }}</span>
          <span class="q-mr-xs">Start Date: {{ auction?.startDate || 'N/A' }}</span>
          <span class="q-mr-xs">End Date: {{ auction?.endDate || 'N/A' }}</span>
        </div>
      </div>
    </div>

    <!--EDIT THIS TO MAKE NEW LotSearch COMPONENT-->
    <div
      class="q-px-md q-pt-xs q-pb-md q-mt-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
      <LotSearch/>
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm">
        <div class="text-h5 q-px-xs">Lot Items</div>
        <q-btn
          flat
          rounded
          icon="settings"
          padding="xs"
          size="sm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
          @click="() => openStorefrontListOptsForm()"
        />
        <q-space/>
      </div>
      <div class="q-mx-xs q-mb-md row items-center justify-around">
        <!--CHANGE THE ICONS WITHIN THE FILTER BUTTONS-->
        <q-btn
          rounded
          padding="xs md"
          no-caps label="Physical"
          icon="delivery_dining"
          style="min-width:100px;"
          :outline="selectedLotType !== 'Physical'"
          :color="selectedLotType == 'Physical' ? 'pt-primary1' : ''"
          color="pt-primary1"
          @click="filterLotItems('Physical')"
        />
        <q-btn
          rounded
          padding="xs md"
          no-caps label="Digital"
          icon="computer"
          style="min-width:100px;"
          :outline="selectedLotType !== 'Digital'"
          :color="selectedLotType == 'Digital' ? 'pt-primary1' : ''"
          color="pt-primary1"
          @click="filterLotItems('Digital')"
        />
        <q-btn
          rounded
          padding="xs md"
          no-caps label="All"
          icon="filter_list_off"
          style="min-width:50px;"
          :outline="selectedLotType !== 'All'"
          :color="selectedLotType == 'All' ? 'pt-primary1' : ''"
          color="pt-primary1"
          @click="filterLotItems('All')"
        />
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
                <div class="q-space text-body1 ellipsis text-bold">{{ lot.title }}</div>
                <q-chip
                  dense
                  :color="lot.isSold ? 'red' : 'green'" text-color="white"
                  class="q-pa-sm"
                >
                  {{ lot.isSold ? 'Closed' : 'Open' }}
                </q-chip>
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

// Components
import HeaderNav from 'src/components/header-nav.vue'
import LotSearch from 'src/components/auction/LotSearch.vue'
import { consolidateToReserveUtxo } from 'src/wallet/stablehedge/transaction'

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

const selectedLotType = ref('All')

const auction = computed(() => {
  const listings = $store.getters['auction/processedItems'] || []
  return listings.find(item => item.id === Number(props.auctionId))
})

const lotSearchQuery = computed(() => $store.state.auction?.lotSearchQuery || '')

const filteredLots = computed(() => {
  console.log(auction.value.lots)
  if (!auction.value || !auction.value.lots) return []
  
  let targetLots = auction.value.lots
  
  if (selectedLotType.value !== 'All') {
    targetLots = targetLots.filter(lot => lot.category === selectedLotType.value)
  }
  
  if (lotSearchQuery.value && lotSearchQuery.value.trim() !== '') {
    const query = lotSearchQuery.value.toLowerCase().trim()
    
    targetLots = targetLots.filter(lot => {
      return (
        lot.title.toLowerCase().includes(query) ||
        lot.description.toLowerCase().includes(query) ||
        lot.id.toString().includes(query)
      )
    })
  }

  return targetLots
})

const filterLotItems = (type) => {
  selectedLotType.value = type
}

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