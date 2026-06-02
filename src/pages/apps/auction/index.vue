<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
      <AuctionSearch />
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm">
        <div class="text-h5 q-px-xs">Auctions</div>
        <q-btn
          flat
          rounded
          icon="settings"
          padding="xs"
          size="sm"
          class="button button-text-primary"
          :class="getDarkModeClass(darkMode)"
        />
        <q-space/>
      </div>

      <div class="q-mx-xs q-mb-md row items-center justify-around gap-sm">
        <q-btn
          :outline="selectedAuctionType !== 'English'"
          :color="selectedAuctionType == 'English' ? 'pt-primary1' : ''"
          rounded
          padding="sm md"
          no-caps
          icon="gavel"
          label="English Auction"
          style="min-width:150px;"
          @click="filterAuctionItems('English')"
        />
        
        <q-btn
          :outline="selectedAuctionType !== 'Dutch'"
          :color="selectedAuctionType == 'Dutch' ? 'pt-primary1' : ''"
          color="pt-primary1"
          rounded
          padding="sm md"
          no-caps
          icon="gavel"
          label="Dutch Auction"
          style="min-width:150px;"
          @click="filterAuctionItems('Dutch')"
        />
        
        <q-btn
          :outline="selectedAuctionType !== 'All'"
          :color="selectedAuctionType == 'All' ? 'pt-primary1' : ''"
          color="pt-primary1"
          rounded
          padding="sm md"
          no-caps
          icon="gavel"
          label="All Auctions"
          style="min-width:150px;"
          @click="filterAuctionItems('All')" 
        />
      </div>

      <div class="row items-start justify-start q-mb-md">
        <!--<div v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 q-pa-xs">
          <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
            <q-skeleton height="200px" />
            <q-card-section class="q-py-sm">
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="40%" class="q-mt-xs" />
            </q-card-section>
          </q-card>
        </div>-->

        <div v-for="auction in filteredItems" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
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
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useQuasar, date } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

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
    type: "Dutch",
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
]

let filteredItems = ref([...auctionDetails])
const selectedAuctionType = ref('All')

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY') }

const filterAuctionItems = (type='All') => {
  filteredItems.value = (type === 'All') ? [...auctionDetails] : [...auctionDetails].filter(auction => auction.type === type)
  selectedAuctionType.value = type;
}

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