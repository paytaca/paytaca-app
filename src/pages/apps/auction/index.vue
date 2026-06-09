<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
      <AuctionSearch @search-change="auctionSearchQuery = $event"/>
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">Auctions</div>
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

        <div v-else-if="isAuctionEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Auctions Listed') }}</div>
        </div>

        <div v-else v-for="auction in filteredItems" :key="auction.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow cursor-pointer"
            :class="getDarkModeClass(darkMode)"
            @click="$router.push({ name: 'app-auction-details', params: { auctionId: auction.id }})"
          >
            <q-img 
              :src="auction.image || noImage"
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
                  :label="`${auction.type}`"
                  class="text-bold"
                  flat
                  color="transparent"
                />
              </div>

              <div>
                <q-chip
                  dense
                  :color="getAuctionStatusInfo(auction).color"
                  text-color="white"
                  class="text-bold q-px-sm"
                >
                  {{ getAuctionStatusInfo(auction).label }}
                </q-chip>
              </div>

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>

              <div class="text-caption">
                <span class="text-weight-medium">Start Date:</span> {{ formatAuctionDate(auction.start_date) }}
              </div>

              <div class="text-caption">
                <span class="text-weight-medium">End Date:</span> {{ formatAuctionDate(auction.end_date) }}
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
import { ref, computed, watch, onMounted } from 'vue'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'
import noImage from 'src/assets/no-image.svg'
import { AuctionList } from 'src/auction/object.js'

const $q = useQuasar()
const $store = useStore()

const auctionType = ref($store.state.auction?.auctionType || 'All');
const auctionTypeOptions = ['English', 'Dutch', 'All']

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = computed(() => $store.state.auction?.isLoading || false)

onMounted(async () => {
  await $store.dispatch('auction/refreshCatalog')
})

const auctionSearchQuery = ref('')
const filteredItems = computed(() => {
  let items = $store.getters['auction/processedItems'] || []
  
  items = items.map(item => (item instanceof AuctionList ? item : AuctionList.parse(item)))

  if (auctionSearchQuery.value && auctionSearchQuery.value.trim() !== '') {
    const query = auctionSearchQuery.value.toLowerCase().trim()
    items = items.filter(item => item.title?.toLowerCase().includes(query))
  }

  return items
})

const isAuctionEmpty = computed(() => {
  return !isLoading.value && filteredItems.value.length === 0
})

const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const formatAuctionDate = (dateString) => { 
  if (!dateString) return 'N/A'
  return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') 
}

watch(auctionType, (newType) => {
  $store.dispatch('auction/filterAuctionItems', newType)
})

const refresh = async (done) => {
  await $store.dispatch('auction/refreshCatalog')
  done()
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