<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="row justify-end q-mx-md q-my-sm">
      <q-btn
        no-caps
        color="primary"
        text-color="white"
        icon="add"
        label="Add Auction"
        class="q-px-md"
        clickable v-ripple
        @click="$router.push({ name: 'app-auction-add' })"
      />
    </div>

    <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
      <ActivitySearch :placeholder="`Search my ${selectedActivityType.value}`"/>
    </div>

    <div class="row justify-end q-px-md q-mb-md">
      <q-select
        outlined
        dense
        v-model="activityType"
        :options="activityTypeOptions"
        emit-value
        map-options
        autocomplete="off"
        color="pt-primary1"
        debounce="500"
        :bg-color="darkMode ? 'dark' : 'white'"
        :popup-content-style="{ color: darkMode ? '#ffffff' : '#000000' }"
        style="width: 175px;"
      >
        <template v-slot:prepend>
          <q-icon name="filter_list" size="xs" />
        </template>
      </q-select>
    </div>
    
    <!-- All user's AUCTIONS made -->
    <div v-if="selectedActivityType.value === 'auctions'" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">My Auctions</div>
        <q-select
          outlined
          dense
          v-model="auctionType"
          :options="auctionTypeOptions"
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

          <template v-slot:option="scope">
            <q-item
              v-bind="scope.itemProps"
              :style="{ color: darkMode ? '#ffffff' : '#000000' }"
            >
              <q-item-section>
                <q-item-label>{{ scope.opt }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>

      <div class="row items-start justify-start q-mb-md">
        <div v-if="isLoading" v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 q-pa-xs">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-skeleton height="200px" />
            <q-card-section class="q-py-sm">
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="40%" class="q-mt-xs" />
            </q-card-section>
          </q-card>
        </div>

        <div v-else-if="isMyAuctionEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Auctions Created') }}</div>
        </div>

        <div v-else v-for="auction in filteredAuctions" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-details', params: { auctionId: auction.id }, query: { from: 'activity' }})"
          >
            <div class="relative-position">
              <q-img 
                :src="noImage"
                ratio="1.25"
              ><!-- :src="auction.image || noImage" -->
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>

              <q-chip
                dense
                :color="getAuctionStatusInfo(auction).color"
                text-color="white"
                class="absolute text-caption text-weight-bold"
                style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
              >
                {{ getAuctionStatusInfo(auction).label }}
              </q-chip>
            </div>
            

            <q-card-section class="q-py-sm">
              <q-chip
                dense
                text-color="white"
                class="text-caption text-weight-bold bg-primary"
                style="margin: 0; padding: 3px 8px; height: auto;"
              >
                <q-icon name="gavel" size="xs" class="q-mr-xs" />
                {{ auction.type }}
              </q-chip>

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>
              
              <q-separator spaced="sm" />

              <div class="column q-gutter-y-xs">
                <div
                  v-if="getAuctionStatusInfo(auction).label !== 'Closed'"
                  class="row items-center q-gutter-x-xs text-caption text-weight-bold"
                >
                  <q-icon
                    :name="getAuctionStatusInfo(auction).label === 'Open' ? 'event_busy' : 'event_available'"
                    style="font-size: 11px;"
                  />
                  <strong class="text-bow">
                    {{ getAuctionStatusInfo(auction).label === 'Open' ? 'Ends' : 'Starts' }}
                  </strong>
                  <div>
                    {{
                      getAuctionStatusInfo(auction).label === 'Open'
                        ? formatAuctionDate(auction.end_date)
                        : formatAuctionDate(auction.start_date)
                    }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- All user's BIDDINGS made -->
    <div v-if="selectedActivityType.value === 'biddings'" class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">    
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">My Biddings</div>
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
      
      <div class="row items-start" ref="productsContainer">
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

        <div v-else-if="isMyBiddingEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Biddings Made') }}</div>
        </div>

        <!-- Actual products -->
        <div v-else v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card 
            class="pt-card text-bow cursor-pointer" 
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: lot.auction_id, lotId: lot.id }, query: { from: 'activity' }})"
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
                  :color="getStatusColor(getAuctionStatus(lot.start_date, lot.end_date))"
                  :label="getAuctionStatus(lot.start_date, lot.end_date)"
                  text-color="white"
                  class="q-pa-sm"
                />
              </div>
              <div class="q-space text-body1 ellipsis text-bold">{{ lot.title }}</div>
              <div class="text-caption text-grey text-italic ellipsis">ID #{{ lot.id }}</div>
              <div class="text-subtitle2 text-bold text-positive q-mt-xs">
                Est: ₱950
                <span style="opacity: 0.75;" class="text-weight-regular q-ml-xs">
                  ({{ lot.getFormattedBCH(lot.estimated_amount).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">
                    {{ lot.getFormattedBCH(lot.estimated_amount).zeros }}
                  </span> BCH)
                </span>
              </div>
              
              <div class="text-caption text-grey-5">
                Min Bid: ₱950
                <span style="opacity: 0.75;" class="text-weight-regular q-ml-xs">
                  ({{ lot.getFormattedBCH(lot.threshold_bid).main }}<span :style="{ opacity: darkMode ? 0.35 : 0.45 }">
                    {{ lot.getFormattedBCH(lot.threshold_bid).zeros }}
                  </span> BCH)
                </span>
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
  </q-pull-to-refresh>
</template>

<script setup>
import { useQuasar, date } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { callAPI } from 'src/auction/api'
import { AuctionList, LotsList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import ActivitySearch from 'src/components/auction/ActivitySearch.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const activityType = ref('biddings')
const activityTypeOptions = [
  { label: 'My Biddings', value: 'biddings' },
  { label: 'My Auctions', value: 'auctions' }
]
const selectedActivityType = computed(() => activityType)

const auctionType = ref('All');
const auctionTypeOptions = ['English', 'Dutch', 'All']
const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']

const isLoading = ref(false)

const auctionDetails = ref([])
const lotDetails = ref([])

const fetchAuctionData = async () => {
  const result = await callAPI('my-auctions')

  try {
    if (result.data && result.success && Array.isArray(result.data)) {
      auctionDetails.value = result.data.map(item => parseAuctionData(item))
    } else {
      auctionDetails.value = parseAuctionData(result.data)
    }
    console.log(auctionDetails.value)
  } catch (err) {
    console.error('Failed to update auction details:', err)
  }
}

// Can be more optimized
const fetchLotData = async () => {
  const result = await callAPI('my-biddings')

  try {
    if (result.success && result.data) {
      const lotPromises = result.data.map(async (item) => {
        const lotResult = await callAPI('lots', item.lot_id)
        if (!lotResult.success || !lotResult.data) return null
        return LotsList.parse(lotResult.data)
      })

      lotDetails.value = (await Promise.all(lotPromises)).filter(Boolean)
    }
  } catch(err) {
    console.error('Failed to update lots:', err)
  }
}

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

onMounted(async () => {
  isLoading.value = true

  if(activityType.value === 'auctions') await fetchAuctionData()
  else await fetchLotData()
  
  isLoading.value = false
})

const filteredAuctions = computed(() => {
  if (auctionType.value === 'All') {
    return auctionDetails.value
  }
  return auctionDetails.value.filter(auction => auction.type === auctionType.value)
})

const filteredLots = computed(() => {
  if (lotType.value === 'All') {
    return lotDetails.value
  }
  return lotDetails.value.filter(lot => lot.category === lotType.value)
})

watch(activityType, async (newType) => {
  isLoading.value = true
  
  if(activityType.value === 'auctions') await fetchAuctionData()
  else await fetchLotData()

  isLoading.value = false
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

const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const isMyAuctionEmpty = computed(() => {
  return !isLoading.value && filteredAuctions.value.length === 0
})

const isMyBiddingEmpty = computed(() => {
  return !isLoading.value && filteredLots.value.length === 0
})

const refresh = async (done) => {
  isLoading.value = true

  if(activityType.value === 'auctions') await fetchAuctionData()
  else await fetchLotData()
  
  isLoading.value = false
  done()
}

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }
</script>

<style scoped lang="scss">
  @import '../../../css/shared.scss';

  #app-container.dark {
    .orders--fixed-bottom {
      background-color: $brand_dark;
    }
  }

  #app-container.light {
    .orders--fixed-bottom {
      background-color: $brand_light;
    }
  }
</style>