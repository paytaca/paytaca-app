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
            <div class="relative-position">
              <q-responsive :ratio="1.25">
                <q-skeleton height="100%" width="100%" square />
              </q-responsive>
              
              <q-skeleton
                type="QChip"
                class="absolute"
                style="top: 8px; right: 8px; margin: 0; width: 65px; height: 20px;"
              />
            </div>

            <q-card-section class="q-py-sm column q-gutter-y-sm">
              <q-skeleton type="text" class="text-subtitle1" width="40%" />
              <q-skeleton type="text" class="text-subtitle1" width="85%" />
              <q-skeleton type="text" class="text-caption" width="60%" />
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
            <div class="relative-position">
              <q-img 
                :src="auction.image || noImage"
                ratio="1.25"
              >
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
                <div class="row items-center q-gutter-x-xs text-caption text-weight-bold">
                  <q-icon
                    :name="getAuctionStatusInfo(auction).label === 'Upcoming' ? 'event_available' : 'event_busy'"
                    style="font-size: 11px;"
                  />
                  <strong class="text-bow">
                    {{ getAuctionStatusInfo(auction).label === 'Upcoming' ? 'Starts' : (getAuctionStatusInfo(auction).label === 'Closed' ? 'Ended' : 'Ends') }}
                  </strong>
                  <div>
                    {{
                      getAuctionStatusInfo(auction).label === 'Upcoming'
                        ? formatAuctionDate(auction.start_date)
                        : formatAuctionDate(auction.end_date)
                    }}
                  </div>
                </div>
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
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref, computed, watch, onMounted } from 'vue'
import { AuctionList } from 'src/auction/object.js'
import { getBidderPublicKey } from 'src/auction/payment'
import { callAPI } from 'src/auction/api'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

const auctionType = ref($store.state.auction?.auctionType || 'All');
const auctionTypeOptions = ['English', 'Dutch', 'All']

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = computed(() => $store.state.auction?.isLoading || false)

onMounted(async () => {
  $q.loading.show()

  await Promise.all([
    $store.dispatch('auction/refreshCatalog'),
    $store.dispatch('auction/fetchArbiterPublicKey'),
    $store.dispatch('auction/fetchServicerPublicKey'),
    $store.dispatch('auction/fetchUsername'),
  ])

  $q.loading.hide()

  if (!$store.getters['auction/username']) {
    console.warn('User details missing, redirecting...')
    $router.push({ name: 'app-auction-profile' })
  }
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