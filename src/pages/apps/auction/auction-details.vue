<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Auction')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row q-px-sm justify-center">
        <!-- 1-img auction -->
        <q-img :src="collection?.imageUrl || noImage" width="340px" height="350px" />
        <!-- auction title -->
        <div class="flex column padding q-pl-md q-mr-auto q-mt-md">
          <div class="text-h5 q-mr-xs">{{ auctionFront?.name || 'N/A'}}</div>
          <span class="q-mr-xs">Auctioneer: {{ auctionFront?.auctioneer || 'N/A'}}</span>
          <span class="q-mr-xs">Auctioneer Rating: {{ auctionFront?.rating || 'N/A'}}</span>
          <span class="q-mr-xs q-mb-lg">Posted On: {{ auctionFront?.datePosted || 'N/A'}}</span>
          <span class="q-mr-xs">Auction Type: {{ auctionFront?.type || 'N/A'}}</span>
          <span class="q-mr-xs">Auction Status:</span>
          <q-btn class="q-mb-lg" style="background-color: #097000;" :label="auctionFront?.status || 'N/A' "/>
          <span class="q-mr-xs">Description:</span>
          <span class="q-mr-xs q-space">{{ auctionFront?.description || 'N/A' }}</span>
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
          <div v-for="lot in filteredLots" class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card 
              class="pt-card text-bow cursor-pointer" 
              :class="getDarkModeClass(darkMode)"
              @click="$router.push({ name: 'app-auction-lot-details', params: { lotId: lot.id }})"
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
      
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import noImage from 'src/assets/no-image.svg'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, watchEffect, nextTick } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LotSearch from 'src/components/auction/LotSearch.vue'

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

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

const filteredLots = ref([...lots])
const selectedLotType = ref('All')

const filterLotItems = (type='All') => {
  filteredLots.value = (type === 'All') ? [...lots] : [...lots].filter(auction => auction.type === type)
  selectedLotType.value = type;
}

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const refresh = (done) => {
  setTimeout(() => {
    done()
  }, 1000)
}
</script>