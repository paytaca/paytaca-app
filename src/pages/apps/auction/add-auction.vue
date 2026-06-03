<template>
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps/auction/activity" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>

    <div>
      <AddAuctionDetails v-model:auction-type="auctionType" />
    </div>

    <div>
      <AddLotDetails
        :auctionType="auctionType"
        @add-lot="handleNewLot"
      />
    </div>

    <div>
      <div class="row items-start" ref="productsContainer">
        <div v-for="(lot, index) in lots" :key="index" class="col-6 col-sm-4 col-md-3 q-pa-sm">
          <q-card 
            class="pt-card text-bow" 
            :class="getDarkModeClass(darkMode)"
          >
            <q-img :src="lot.imageUrl || noImage" ratio="1">
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>

            <q-card-section>
              <div class="q-mb-xs">
                <q-badge
                  color="primary"
                  text-color="white"
                  :label="lot.type"
                  class="text-bold q-pa-sm"
                />
              </div>

              <div class="row items-center">
                <div class="q-space text-body1 ellipsis text-bold">{{ lot.title || 'Untitled Lot' }}</div>
              </div>

              <div class="row items-center q-mb-xs">
                <div class="q-space text-caption">Estimated Price: {{ lot.estimatedPrice }}</div>
              </div>

              <div v-if="auctionType === 'English Auction'">
                <div>Floor/Reserve: Php {{ lot.threshold }}</div>
              </div>

              <div v-else-if="auctionType === 'Dutch Auction'">
                <div>Ceiling Price: {{ lot.threshold }} BCH</div>
                <div class="text-caption text-negative">Drops by: {{ lot.price_drop }} BCH per 10 minutes</div>
              </div>

              <div class="row q-my-sm">
                <q-btn
                  icon="edit"
                  class="q-pa-sm"
                  size="sm"
                  color="green"
                  @click="editLotDetails(lot, index)"
                />

                <q-btn
                  icon="delete"
                  class="q-pa-sm q-ml-sm"
                  size="sm"
                  color="red"
                  @click="deleteLot(lot, index)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
        
        <!-- Empty state -->
        <div v-if="isLotEmpty"
          class="row flex-center q-mx-md q-mb-md rounded-borders"
          :class="$q.dark.isActive ? 'bg-pt-dark' : 'bg-pt-light'"
          style="min-height: 70px; width: 100%;"
        >
          <div>{{ $t('NoProducts') }}</div>
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
import AddLotDetails from 'src/components/auction/AddLotDetails.vue'
import EditLotDetails from 'src/components/auction/EditLotDetails.vue'
import noImage from 'src/assets/no-image.svg'

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const auctionType = ref('English Auction')
const lots = ref([])

const isLotEmpty = computed(() => lots.value.length === 0)

const handleNewLot = (lotData) => {
  lots.value.push(lotData)
}

const editLotDetails = (lot, index) => {
  $q.notify({
    type: 'positive',
    message: 'Lot edited!',
    timeout: 3000
  })
}

const deleteLot = (lot, index) => {
  $q.notify({
    type: 'positive',
    message: 'Lot deleted!',
    timeout: 3000
  })
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