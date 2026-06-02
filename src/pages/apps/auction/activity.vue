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
      <AuctionSearch :placeholder="`Search my ${selectedActivityType}`"/>
    </div>

    <div class="q-mx-xs q-mb-md row items-center justify-around">
      <q-btn
        :outline="selectedActivityType !== 'biddings'"
        :color="selectedActivityType == 'biddings' ? 'pt-primary1' : ''"
        rounded
        padding="sm md"
        no-caps
        icon="monetization_on"
        label="My Biddings"
        style="min-width:150px;"
        @click="filterActivityType('biddings')"
      />

      <q-btn
        :outline="selectedActivityType !== 'auctions'"
        :color="selectedActivityType == 'auctions' ? 'pt-primary1' : ''"
        rounded
        padding="sm md"
        no-caps
        icon="gavel"
        label="My Auctions"
        style="min-width:150px;"
        @click="filterActivityType('auctions')"
      />
    </div>

    <!-- All user's AUCTIONS made -->
    <div v-if="selectedActivityType == 'auctions'" class="row items-start justify-start q-mb-md q-pa-sm">
      <!--<div v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 q-pa-xs">
        <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
          <q-skeleton height="200px" />
          <q-card-section class="q-py-sm">
            <q-skeleton type="text" width="60%" />
            <q-skeleton type="text" width="40%" class="q-mt-xs" />
          </q-card-section>
        </q-card>
      </div>-->

      <div v-for="auction in auctionDetails" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
        <q-card
          class="pt-card text-bow cursor-pointer"
          :class="getDarkModeClass(darkMode)"
          @click="$router.push({ name: 'app-auction-details', params: { auctionId: '1' }})"
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
            <div class="q-mb-xs">
              <q-badge color="primary" text-color="white" :label="`${auction.type} Auction`" class="text-bold q-pa-sm" />
            </div>

            <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>
            
            <div class="row items-center text-caption no-wrap q-mb-xs">
              <q-icon name="location_on" size="xs" class="q-mr-xs" />
              <div class="ellipsis">{{ auction.location }}</div>
            </div>

            <div class="text-caption">
              <span class="text-weight-medium">Dates:</span> {{ formatAuctionDate(auction.startDate) }} - {{ formatAuctionDate(auction.endDate) }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- All user's BIDDINGS made -->
    <div v-if="selectedActivityType == 'biddings'" class="q-pa-sm">        
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
        <div v-for="lot in lots" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card 
            class="pt-card text-bow cursor-pointer" 
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: '5', lotId: lot.id }, query: { from: 'activity' }})"
          >
            <q-img :src="noImage" ratio="1">
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>
            <q-card-section>
              <div class="row items-center">
                <div class="q-space text-body1 ellipsis text-bold">{{lot.name}}</div>
                <q-chip
                  dense
                  :color="lot.is_sold ? 'red' : 'green'" text-color="white"
                  class="q-pa-md"
                >
                Bidding {{ lot.is_sold ? 'Closed' : 'Open' }}
                </q-chip>
              </div>
              <div>Lot {{ lot.lot_num }} | {{ lot.type }}</div>
              <div>Est. {{ lot.est_price }}</div>
              <div>{{ lot.high_bid}}  ({{ lot.num_bids }} bids)</div>
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
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $router = useRouter()

const selectedActivityType = ref('biddings')
const filterActivityType = (type) => {
  if(type === 'biddings') {
    selectedActivityType.value = 'biddings';
  }
  else {
    selectedActivityType.value = 'auctions';
  }
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

const lots = [
  {
    id: 11,
    name: 'lot1',
    type: 'Physical',
    is_sold: false,
    lot_num: 1,
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 0
  }, 
  {
    id: 12,
    name: 'Thingymajig',
    type: 'Physical',
    is_sold: false,
    lot_num: '2',
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 3
  },
  {
    id: 13,
    name: 'Another thingy',
    type: 'Digital',
    is_sold: true,
    lot_num: '3',
    est_price: '₱1000',
    high_bid: '₱950',
    num_bids: 11
  }
]

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY') }
</script>