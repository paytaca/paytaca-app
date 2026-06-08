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
        <div v-for="auction in filteredAuctions" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-details', params: { auctionId: auction.id }, query: { from: 'activity' }})"
          >
            <q-img 
              :src="collection?.imageUrl || noImage"
              ratio="1.75"
            >
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>

            <q-card-section class="q-py-sm">
              <div class="q-my-sm bg-primary text-white row items-center q-gutter-x-xs q-pa-sm rounded-borders" style="display: inline-flex;">
                <q-icon name="gavel" size="xs" />
                <q-badge
                  :label="`${auction.type} Auction`"
                  class="text-bold"
                  flat
                  color="transparent"
                />
              </div>

              <div>
                <q-chip
                  dense
                  :color="getStatusColor(getAuctionStatus(auction.startDate, auction.endDate))"
                  text-color="white"
                  class="text-bold q-px-sm"
                >
                  {{ getAuctionStatus(auction.startDate, auction.endDate) }}
                </q-chip>
              </div>

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>
              
              <!-- <div class="row items-center text-caption no-wrap q-mb-xs">
                <q-icon name="location_on" size="xs" class="q-mr-xs" />
                <div class="ellipsis">{{ auction.location }}</div>
              </div> -->

              <div class="text-caption">
                <span class="text-weight-medium">Start Date:</span> {{ formatAuctionDate(auction.startDate) }}
              </div>

              <div class="text-caption">
                <span class="text-weight-medium">End Date:</span> {{ formatAuctionDate(auction.endDate) }}
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
                <q-icon :name="lot.type === 'Digital' ? 'computer' : 'delivery_dining'" size="sm" />
                <q-badge
                  :label="lot.type"
                  class="text-bold"
                  flat
                  color="transparent"
                />
              </div>
              <div>
                <q-chip
                  dense
                  :color="getStatusColor(getAuctionStatus(lot.startDate, lot.endDate))"
                  :label="getAuctionStatus(lot.startDate, lot.endDate)"
                  text-color="white"
                  class="q-pa-sm"
                />
              </div>
              <div class="q-space text-body1 ellipsis text-bold">{{ lot.name }}</div>
              <div class="text-caption text-grey text-italic ellipsis">ID #{{ lot.id }}</div>
              <div class="text-subtitle2 text-bold text-positive q-mt-xs">Est: {{ lot.est_price }}</div>
              <div class="text-caption text-grey-7">Min Bid: {{ lot.high_bid }}</div>
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

const filteredAuctions = computed(() => {
  if (auctionType.value === 'All') {
    return auctionDetails
  }
  return auctionDetails.filter(auction => auction.type === auctionType.value)
})

const filteredLots = computed(() => {
  if (lotType.value === 'All') {
    return lotDetails
  }
  return lotDetails.filter(lot => lot.type === lotType.value)
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

const refresh = (done) => {
  setTimeout(() => {
    done()
  }, 1000)
}



const auctionDetails = [
  {
    id: 1,
    title: "Prime Commercial Lot - Downtown Area",
    location: "Tacloban City, Leyte",
    type: "English",
    startDate: "2026-05-28",
    endDate: "2026-07-01",
  },
  {
    id: 2,
    title: "Heavy Construction Equipment Surplus (Excavators & Trucks)",
    location: "Ormoc City, Leyte",
    type: "Dutch",
    startDate: "2026-06-15",
    endDate: "2026-06-22",
  },
  {
    id: 3,
    title: "Vintage Luxury Watch Collection (Rolex, Omega, Patek)",
    location: "Metro Manila",
    type: "English",
    startDate: "2026-05-01",
    endDate: "2026-05-15",
  },
  {
    id: 4,
    title: "Sealed Container of Mixed Electronic Goods & Laptops",
    location: "Cebu City, Cebu",
    type: "Sealed Bid",
    startDate: "2026-05-25",
    endDate: "2026-06-05",
  },
  {
    id: 5,
    title: "Agricultural Tractors and Milling Machinery",
    location: "Baybay City, Leyte",
    type: "English",
    startDate: "2026-07-10",
    endDate: "2026-07-20",
  }
];

const lotDetails = [
  {
    id: 11,
    name: 'lot1',
    type: 'Physical',
    is_sold: false,
    lot_num: 1,
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 0,
    startDate: "2026-05-01",
    endDate: "2026-05-15",
  }, 
  {
    id: 12,
    name: 'Thingymajig',
    type: 'Physical',
    is_sold: false,
    lot_num: '2',
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 3,
    startDate: "2026-07-10",
    endDate: "2026-07-20",
  },
  {
    id: 13,
    name: 'Another thingy',
    type: 'Digital',
    is_sold: true,
    lot_num: '3',
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 11,
    startDate: "2026-05-28",
    endDate: "2026-07-01",
  }
]

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