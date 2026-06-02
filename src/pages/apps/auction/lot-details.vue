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
        <!-- 1-img auction -->
        <div class="column">
          <div class="text-h5 q-mr-xs">Lot {{'1'}}: {{'N/A'}}</div>
          <span class="q-mr-xs q-mb-md text-bold">Highest Bid: {{'N/A'}}</span>
          
          <q-img :src="collection?.imageUrl || noImage" width="340px" height="350px">
            <div class="full-width bg-transparent items-center absolute-center">  
              <span class="absolute-right material-symbols-outlined" style="font-size: 32px">arrow_forward_ios</span>
              <span class="absolute-left material-symbols-outlined" style="font-size: 32px; margin-left: 8px;">arrow_back_ios</span>
            </div>
            <div class="full-width absolute-bottom q-pa-md text-center" style="opacity: 70%">
              Images 1/3
            </div>
          </q-img>
          
          <div class="flex justify-between q-mt-md">
            <q-img :src="collection?.imageUrl || noImage" width="110px" height="110px" />
            <q-img :src="collection?.imageUrl || noImage" width="110px" height="110px" />
            <q-img :src="collection?.imageUrl || noImage" width="110px" height="110px" />
          </div>
          <q-btn 
            class="q-mt-md "
            style="background-color: var(--q-secondary)"
            label="PLACE BID"
            @click="openDialog = !openDialog"
          />
        </div>
        <!-- auction title -->
        <div class="flex column padding q-pl-md q-mr-auto q-mt-md">
          <div class="text-h5 q-mr-xs q-mb-md">Lot Details</div>

          <span class="q-mr-xs">Auction Title: {{'N/A'}}</span>
          <span class="q-mr-xs">Auctioneer By: {{'N/A'}}</span>
          <span class="q-mr-xs q-mb-lg">Posted On: {{'N/A'}}</span>

          <span class="q-mr-xs">Bidding Status:</span>
          <q-btn class="q-mb-lg" style="background-color: #097000;" :label="N/A"/>
          
          <span class="q-mr-xs">Item Type: : {{'N/A'}}</span>
          <span class="q-mr-xs q-mb-lg">Estimated Price: {{'N/A'}}</span>
          
          <span class="q-mr-xs">Auction Start: {{'N/A'}}</span>
          <span class="q-mr-xs q-mb-lg">Auction End: {{'N/A'}}</span>
          
          <span class="q-mr-xs">Description:</span>
          <span class="q-mr-xs q-space">{{'N/A' }}</span>
        </div>
      </div>
    </div>

    <BiddingPopup v-model="openDialog" />
  </q-pull-to-refresh>
</template>

<script setup>

import noImage from 'src/assets/no-image.svg'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, watchEffect, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'src/components/header-nav.vue'
import BiddingPopup from 'src/components/auction/BiddingPopup.vue'

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const openDialog = ref(false);

const $store = useStore();
//DARKMODE STATUS
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $route = useRoute()

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from

  if (sourceContext === 'activity') {
    return '/apps/auction/activity'
  }

  return `/apps/auction/${$route.params.auctionId}`
})

const refresh = (done) => {
  setTimeout(() => {
    done()
  }, 1000)
}
</script>