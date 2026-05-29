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

    <div
      class="q-px-md q-pt-xs q-pb-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
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

      <div class="q-mx-xs q-mb-md row items-center justify-around">
        <q-btn
          rounded
          padding="xs md"
          no-caps label="English Auction"
          style="min-width:150px;"
        />

        <q-btn
          rounded
          padding="xs md"
          no-caps label="Dutch Auction"
          style="min-width:150px;"
        />

        <q-btn
          rounded
          padding="xs md"
          no-caps label="All Auctions"
          style="min-width:150px;"
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

        <div v-for="n in 6" :key="`card-${n}`" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
          >
            <q-img 
              src="./test.jpg" 
              ratio="1.75"
            >
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>

            <q-card-section class="q-py-sm">
              <div class="q-mb-xs">
                <q-badge color="primary" text-color="white" label="English Auction" class="text-bold q-pa-xs" />
              </div>

              <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">Auction Title</div>
              
              <div class="row items-center text-caption no-wrap q-mb-xs">
                <q-icon name="location_on" size="xs" class="q-mr-xs" />
                <div class="ellipsis">Tacloban City, Leyte</div>
              </div>

              <div class="text-caption">
                <span class="text-weight-medium">Dates:</span> May 28, 2026 - July 1, 2026
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'

import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>

<style scoped lang="scss">
  
</style>