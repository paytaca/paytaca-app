<template>
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" :backnavpath="smartBackPath" class="header-nav" />

    <div class="q-pa-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row q-col-gutter-md justify-start items-start">
        <div v-if="!isLoading && auction">
          <div class="col-12 col-sm-auto flex justify-center q-mb-md">
            <q-img 
              :src="auction?.image || noImage" 
              width="340px" 
              height="350px" 
              class="rounded-borders shadow-1" 
            />
          </div>

          <div class="col-12 col-sm-auto flex column" style="max-width: 450px; min-width: 280px;">
            <div class="row items-center justify-between full-width q-mb-sm">
              <div class="row items-center q-gutter-sm">
                <q-badge color="primary" class="q-pa-sm q-px-sm text-weight-bold">
                  <q-icon name="gavel" size="12px" class="q-mr-xs" />
                  {{ auction.type }} Auction
                </q-badge>
                <q-badge
                  :color="getAuctionStatusInfo(auction).color"
                  class="q-pa-sm q-px-sm text-weight-bold"
                >
                  {{ getAuctionStatusInfo(auction).label }}
                </q-badge>
              </div>
              
              <div v-if="isAuthor && canEdit">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  :color="darkMode ? 'white' : 'grey-7'"
                  @click="$router.push({ 
                    name: 'app-auction-edit', 
                    params: { auctionId: auction.id }
                  })"
                />
              </div>
            </div>

            <div class="text-h5 text-weight-medium q-mb-md">
              {{ auction?.title || 'N/A' }}
            </div>

            <q-card flat bordered class="q-mb-md self-start full-width">
              <q-card-section class="q-pa-sm q-pb-none">
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="person" size="13px" class="q-mr-xs" />Auctioneer
                  </div>
                  <div class="col row items-center q-gutter-xs">
                    <span>{{ auction.getEllipsisInMiddleUserId() }}</span>
                    <q-badge v-if="isAuthor" color="positive" class="q-px-xs q-ml-sm">
                      <q-icon name="star" size="10px" class="q-mr-xs" />You
                    </q-badge>
                  </div>
                </div>

                <q-separator />

                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="star" size="13px" class="q-mr-xs" />Rating
                  </div>
                  <span>{{ auction?.rating || 'N/A' }}</span>
                </div>

                <q-separator />

                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="event" size="13px" class="q-mr-xs" />Posted on
                  </div>
                  <span>{{ formatAuctionDate(auction.creation_date) }}</span>
                </div>

              </q-card-section>
            </q-card>

            <div class="text-bold">Description:</div>
            <p class="q-mb-md text-left" style="white-space: pre-wrap;">
              {{ auction?.description || 'N/A' }}
            </p>

            <div class="row q-gutter-sm">
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_available" size="12px" class="q-mr-xs" />Start date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.start_date) }}
                </div>
              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.end_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="col-12 col-sm-auto flex column q-gutter-y-sm" style="max-width: 450px; min-width: 280px;">
          <q-skeleton type="rect" width="340px" height="350px" />
          <q-skeleton type="rect" width="160px" height="24px" />
          <q-skeleton type="rect" width="80%" height="32px" />
          <q-skeleton type="rect" height="100px" />
          <q-skeleton type="rect" height="60px" />
        </div>
      </div>
    </div>

    <!--EDIT THIS TO MAKE NEW LotSearch COMPONENT-->
    <div
      class="q-px-md q-pt-xs q-pb-md q-mt-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
      <LotSearch @search-change="lotSearchQuery = $event"/>
    </div>

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm q-mb-md">
        <div class="text-h5 q-px-xs">Lot Items</div>
        <q-select
          outlined
          dense
          v-model="lotType"
          :options="lotTypeOptions"
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

      <div>        
        <!--PLACE EACH CORRESP THING INSIDE A TEMPLATE WITH V-IFS AND V-FORS-->
        <div class="row items-start" ref="productsContainer">
          <!-- Skeleton loaders -->
          <div v-if="isLoading" v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 col-md-3 q-pa-sm">
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

          <div v-else-if="isLotEmpty"
            class="row flex-center q-mx-md q-mb-md rounded-borders"
            :class="darkMode ? 'bg-pt-dark' : 'bg-pt-light'"
            style="min-height: 70px; width: 100%;"
          >
            <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Lots Matched') }}</div>
          </div>

          <!-- Actual products -->
          <div v-else v-for="lot in filteredLots" :key="lot.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card
              class="pt-card text-bow cursor-pointer"
              :class="getDarkModeClass(darkMode)"
              @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: auctionId, lotId: lot.id } })"
            >
              <div class="relative-position">
                <q-img
                  :src="lot.image"
                  ratio="1.25"
                >
                  <template v-slot:loading>
                    <q-skeleton height="100%" width="100%" square />
                  </template>
                </q-img>

                <q-chip
                  dense
                  :color="lot.getStatus().color"
                  text-color="white"
                  class="absolute text-caption text-weight-bold"
                  style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
                >
                  {{ lot.getStatus().label }}
                </q-chip>
              </div>

              <q-card-section class="q-py-sm">
                <q-chip
                  dense
                  text-color="white"
                  class="text-caption text-weight-bold bg-primary"
                  style="margin: 0; padding: 3px 8px; height: auto;"
                >
                  <q-icon
                    :name="lot.category === 'Digital' ? 'computer' : 'delivery_dining'"
                    size="xs"
                    class="q-mr-xs"
                  />
                  {{ lot.category }}
                </q-chip>

                <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs">
                  {{ lot.title }}
                </div>

                <q-separator spaced="sm" />

                <div v-if="auction?.type === 'English'" class="column q-gap-y-none q-mb-xs">
                  <div class="text-caption text-weight-medium">{{ getEnglishPriceInfo(lot).label }}</div>

                  <template v-if="auction?.is_fiat">
                    <div class="text-caption text-weight-bold">
                      {{ formatFiat(getEnglishPriceInfo(lot).fiat) }}
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ formatBCH(getEnglishPriceInfo(lot).bch).main }}<span style="opacity: 0.4;">{{ formatBCH(getEnglishPriceInfo(lot).bch).zeros }}</span>&nbsp;BCH
                    </div>
                  </template>

                  <template v-else>
                    <div class="text-caption text-weight-bold">
                      {{ formatBCH(getEnglishPriceInfo(lot).bch).main }}<span style="opacity: 0.4;">{{ formatBCH(getEnglishPriceInfo(lot).bch).zeros }}</span>&nbsp;BCH
                    </div>
                    <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                      {{ formatFiat(getEnglishPriceInfo(lot).fiat) }}
                    </div>
                  </template>
                </div>
                
                <div v-else-if="auction?.type === 'Dutch'" class="column q-gap-y-sm q-mb-xs">
                  <div class="column q-gap-y-none">
                    <div class="text-caption text-weight-medium">START PRICE:</div>

                    <template v-if="auction?.is_fiat">
                      <div class="text-caption text-weight-bold">
                        {{ formatFiat(lot.starting_price_fiat) }}
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                      </div>
                    </template>

                    <template v-else>
                      <div class="text-caption text-weight-bold">
                        {{ formatBCH(lot.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.starting_price_bch).zeros }}</span>&nbsp;BCH
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        {{ formatFiat(lot.starting_price_fiat) }}
                      </div>
                    </template>
                  </div>

                  <q-separator spaced="sm" />

                  <div class="column q-gap-y-none text-negative">
                    <div class="text-caption text-weight-bold">DROPS EVERY {{ lot.getIntervalMinutes() }} MINUTES:</div>

                    <template v-if="auction?.is_fiat">
                      <div class="text-caption text-weight-bold">
                        -{{ formatFiat(lot.price_drop_fiat) }}
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                      </div>
                    </template>

                    <template v-else>
                      <div class="text-caption text-weight-bold">
                        -{{ formatBCH(lot.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot.price_drop_bch).zeros }}</span>&nbsp;BCH
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        -{{ formatFiat(lot.price_drop_fiat) }}
                      </div>
                    </template>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
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
import { useRoute } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'
import { AuctionList, LotsList } from 'src/auction/object.js'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import LotSearch from 'src/components/auction/LotSearch.vue'

const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  }
})

defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $route = useRoute()

const formatFiat = (value) => {
  const numValue = Number(value) || 0
  return `₱${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatBCH = (value) => {
  return getFormattedBCH(Number(value) || 0)
}

const isLoading = ref(false)

const lotType = ref('All')
const lotTypeOptions = ['Physical', 'Digital', 'All']

const auction = ref(null)
const lots = ref([])

const parseAuctionData = (data) => {
  if (!data) return null
  return data instanceof AuctionList ? data : AuctionList.parse(data)
}

const fetchAllData = async () => {
  try {
    const result = await callAPI('auctions', Number(props.auctionId))
    if (result.success && result.data) {
      auction.value = parseAuctionData(result.data)
    }
  } catch (err) {
    console.error('Failed to update auction details:', err)
  }

  try {
    const result = await callAPI('lots-by-auction', Number(props.auctionId))
    if (result.success && result.data) {
      lots.value = await Promise.all(
        result.data.map(async (item) => {
          const lot = LotsList.parse(item)
          lot.start_date = auction.value?.start_date || null
          lot.end_date = auction.value?.end_date || null
          
          try {
            const imageResult = await callAPI('lot-images-by-lot', lot.id, 'get')
            if (imageResult.success && Array.isArray(imageResult.data) && imageResult.data.length > 0) {
              const firstImageRecord = imageResult.data[0]
              
              lot.image = typeof firstImageRecord === 'object' && firstImageRecord !== null 
                ? (firstImageRecord.image || '') 
                : firstImageRecord
            } else {
              lot.image = noImage
            }
          } catch (imgErr) {
            console.error(`Failed to fetch images for lot ${lot.id}:`, imgErr)
            lot.image = noImage
          }
          
          if (auction.value?.type === 'English') {
            try {
              const bidResult = await callAPI(`lots/${lot.id}/highest-bid`)
              lot.hasBid = !!(bidResult.success && bidResult.data && bidResult.data.user_id !== null)
            } catch (bidErr) {
              console.error(`Failed to check bid status for lot ${lot.id}:`, bidErr)
              lot.hasBid = false
            }
          }

          return lot
        })
      )
    }
  } catch (err) {
    console.error('Failed to update lots:', err)
  }

  if (auction.value?.type === 'Dutch' && lots.value.length) {
    const allSold = lots.value.every(l => l.is_sold)
    const notYetClosed = new Date(auction.value.end_date) > new Date()
    if (allSold && notYetClosed) {
      await callAPI('auctions', props.auctionId, 'patch', {
        end_date: new Date().toISOString()
      })
      auction.value.end_date = new Date().toISOString()
    }
  }
}

onMounted(async () => {
  isLoading.value = true
  
  const auctionData = $store.getters['auction/processedItems'] || []
  const specificAuctionData = auctionData.find(item => item.id === Number(props.auctionId))
  auction.value = parseAuctionData(specificAuctionData)
  
  await fetchAllData()

  isLoading.value = false
})

const lotSearchQuery = ref('')

const filteredLots = computed(() => {
  let targetLots = lots.value 
  
  if (lotType.value !== 'All') {
    targetLots = targetLots.filter(lot => lot.category === lotType.value)
  }
  
  if (lotSearchQuery.value && lotSearchQuery.value.trim() !== '') {
    const query = lotSearchQuery.value.toLowerCase().trim()
    targetLots = targetLots.filter(lot => 
      lot.title?.toLowerCase().includes(query) || 
      lot.id?.toString().includes(query)
    )
  }
  return targetLots
})




const getFormattedBCH = (bch) => {
  const numStr = Number(bch).toFixed(8);
  const match = numStr.match(/^(.*?)0*$/);
  const main = match ? match[1] : numStr;
  const zeros = numStr.substring(main.length);
  return { main, zeros, full: numStr };
}

const getEnglishPriceInfo = (lot) => {
  return {
    label: lot.hasBid ? 'HIGHEST BID:' : 'STARTING PRICE:',
    fiat: lot.threshold_bid_fiat,
    bch: lot.threshold_bid_bch
  }
}

const getAuctionStatusInfo = (auction) => {
  if (auction && typeof auction.getStatus === 'function') {
    return auction.getStatus();
  }
  return { label: 'NaN', color: 'purple' };
}

const formatAuctionDate = (dateString) => { return date.formatDate(dateString, 'MMM DD, YYYY hh:mm A') }

const isLotEmpty = computed(() => {
  return !isLoading.value && filteredLots.value.length === 0
})

const isAuthor = computed(() => {
  const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
  return walletHash === auction?.value.user_id
})

const canEdit = computed(() => {
  if (!isAuthor.value || !auction.value?.start_date) return false

  const now = new Date()
  const startDate = new Date(auction.value.start_date)
  
  const minutesToStart = date.getDateDiff(startDate, now, 'minutes')
  
  return minutesToStart > 30
})

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction`
})

const refresh = async (done) => {
  try {
    isLoading.value = true
    await fetchAllData()
  } catch (error) {
    console.error('Failed to refresh lot details:', error)
  } finally {
    isLoading.value = false
    done()
  }
}
</script>