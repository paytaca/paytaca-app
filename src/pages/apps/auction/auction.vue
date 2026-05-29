<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Auction')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row q-px-sm">
        <!-- 1-img auction -->
        <q-img :src="collection?.imageUrl || noImage" width="300px" height="350px"> </q-img>
        <!-- auction title -->
        <div class="flex column padding q-pl-md">
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

    <!--EDIT THIS TO MAKE NEW AUCTIONSEARCH COMPONENT-->
    <div
      class="q-px-md q-pt-xs q-pb-md q-mt-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
      <MarketplaceSearch/>
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
          icon="auctionfront"
          style="min-width:150px;"
        />
        <q-btn
          rounded
          padding="xs md"
          no-caps label="Digital"
          icon="delivery_dining"
          style="min-width:150px;"
        />
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
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-img :src="product?.imageUrl || product?.variantImageUrl || noImage" ratio="1">
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>
              <q-card-section>
                <div class="row items-center">
                  <div class="q-space text-body1 ellipsis text-bold">Test Lot</div>
                  <q-chip
                    dense
                    color="red" text-color="white"
                    class="q-pa-md"
                  >
                  Bidding Closed
                  </q-chip>
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
import MarketplaceSearch from 'src/components/marketplace/MarketplaceSearch.vue'


defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const $store = useStore();
//DARKMODE STATUS
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const auctionfronts = [
  {
    id: 1,
    imageUrl: noImage,
    isOpen: true,
    inPrelaunch: false,

  }
]

</script>