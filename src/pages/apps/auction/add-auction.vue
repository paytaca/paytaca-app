<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div>
      <AddAuctionDetails :auction-type="auctionType" />
    </div>

    <div>        
      <!--PLACE EACH CORRESP THING INSIDE A TEMPLATE WITH V-IFS AND V-FORS-->
      <div class="row items-start" ref="productsContainer">
        <!-- Skeleton loaders -->
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

        <!-- Actual products -->
        <div class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card 
            class="pt-card text-bow cursor-pointer" 
            :class="getDarkModeClass(darkMode)"
          >
            <q-img :src="collection?.imageUrl || noImage" ratio="1">
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>
            <q-card-section>
              <div class="q-mb-xs">
                <q-badge color="primary" text-color="white" :label="`Physical`" class="text-bold q-pa-sm" />
              </div>
              <div class="row items-center">
                <div class="q-space text-body1 ellipsis text-bold">Test Lot</div>
              </div>
              <div>Lot 1</div>
              <div>Est. Php 300 - Php 1,000</div>
              <div>Php 450 (5 bids)</div>
            </q-card-section>
          </q-card>
        </div>
        
        <!-- Empty state -->
        <div>
          {{ $t('NoProducts') }}
        </div>
      </div>
      
      <!-- Infinite scroll loading indicator -->
      <!--
      <div class="row justify-center q-py-md">
        <q-spinner size="2em" color="pt-primary1"/>
      </div>
      -->

      <!-- Scroll sentinel for infinite loading -->
      <!--
      <div ref="productScrollSentinel" style="height: 1px; width: 100%;"></div>
      -->
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AddAuctionDetails from 'src/components/auction/AddAuctionDetails.vue'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
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