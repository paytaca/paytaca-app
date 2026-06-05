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
      <AuctionSearch />
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
          :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
          class="q-ml-sm"
          style="width: 135px;"
        >
          <template v-slot:prepend>
            <q-icon name="filter_list" size="xs" />
          </template>
        </q-select>
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
            @click="$router.push({ name: 'app-auction-details', params: { auctionId: auction.id }})"
          >
            <q-img 
              :src="noImage"
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

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction.title }}</div>
              
              <div class="row items-center text-caption no-wrap q-mb-xs">
                <q-icon name="location_on" size="xs" class="q-mr-xs" />
                <div class="ellipsis">{{ auction.location || "None" }}</div>
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
import { ref, computed, watch } from 'vue'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()

const auctionType = ref($store.state.auction?.filters?.auctionType || 'All');
const auctionTypeOptions = ['English', 'Dutch', 'All']

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = computed(() => $store.state.auction?.isLoading || false)
const selectedAuctionType = computed(() => $store.state.auction?.filters?.auctionType || 'All')
const filteredItems = computed(() => $store.getters['auction/processedItems'])

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY') }

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