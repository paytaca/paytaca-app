<!-- eslint-disable vue/no-use-v-if-with-v-for -->
<template>
  <!--
    This page contains the auction details and list of filteredLots.
  -->
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction - Details')" :backnavpath="smartBackPath" class="header-nav" />

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
                  {{ auction?.type }} Auction
                </q-badge>
                <q-badge
                  :color="auction?.status_color"
                  class="q-pa-sm q-px-sm text-weight-bold"
                >
                  {{ auction?.status }}
                </q-badge>
              </div>
              
              <div v-if="isAuctioneer && canEdit">
                <q-btn
                  flat
                  round
                  dense
                  icon="edit"
                  :color="darkMode ? 'white' : 'grey-7'"
                  @click="toggleEditAuction"
                />
              </div>
            </div>

            <div class="text-h5 text-weight-medium" :class="{ 'q-mb-md': auction?.status === 3 }">
              {{ auction?.title || 'N/A' }}
            </div>

            <div v-if="auction?.status !== 3" class="q-mb-md text-secondary">
              There {{ viewCount === 1 ? 'is' : 'are' }} {{ viewCount }} {{ viewCount === 1 ? 'person' : 'people' }} currently viewing this auction.
            </div>

            <q-card flat bordered class="q-mb-md self-start full-width">
              <q-card-section class="q-pa-sm q-pb-none">
                <div class="row items-center q-py-xs">
                  <div class="text-caption col-4 q-mr-sm">
                    <q-icon name="person" size="13px" class="q-mr-xs" />Auctioneer
                  </div>
                  
                  <div class="col column overflow-hidden">
                    <div class="row items-center no-wrap full-width">
                      <span v-if="auction?.auctioneer_username" class="text-weight-medium ellipsis col-shrink q-mr-xs">
                        {{ auction?.auctioneer_username }}
                      </span>
                      <q-badge v-if="isAuctioneer" color="positive" class="q-px-xs no-shrink">
                        <q-icon name="star" size="10px" class="q-mr-xs" />You
                      </q-badge>
                    </div>
                    <span class="text-caption ellipsis" style="opacity: 0.6;">
                      {{ auction?.getEllipsisInMiddleAddress() }}
                    </span>
                  </div>
                  
                  <q-btn flat round dense icon="content_copy" size="xs" @click="copyToClipboard(auction?.auctioneer)" />
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
                  <span>{{ formatAuctionDate(auction?.creation_date) }}</span>
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
                <div  v-if="auction?.status === 'Upcoming'" class="text-secondary">
                  Time Remaining: {{ auctionStartCountdown }}
                </div>
                <div  v-else class="text-secondary"></div>

              </div>
              <div class="col rounded-borders q-pa-sm" :class="darkMode ? 'bg-dark' : 'bg-grey-2'">
                <div class="text-caption q-mb-xs">
                  <q-icon name="event_busy" size="12px" class="q-mr-xs" />End date
                </div>
                <div class="text-body2 text-weight-medium">
                  {{ formatAuctionDate(auction?.end_date) }}
                </div>
                <div v-if="auction?.status === 'Open'" class="text-secondary">
                  Time Remaining: {{ auctionEndCountdown }}
                </div>
                <div  v-else class="text-secondary"></div>
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
          v-model="lotCategory"
          :options="lotCategoryOptions"
          autocomplete="off"
          color="pt-primary1"
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
          <div v-else v-for="lot in filteredLots" :key="lot?.id" class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card
              class="pt-card text-bow cursor-pointer"
              :class="getDarkModeClass(darkMode)"
              @click="$router.push({ name: 'app-auction-lot-details', params: { auctionId: auctionId, lotId: lot?.id } })"
            >
              <div class="relative-position">
                <q-img
                  :src="lot?.image"
                  ratio="1.25"
                >
                  <template v-slot:loading>
                    <q-skeleton height="100%" width="100%" square />
                  </template>
                </q-img>

                <q-chip
                  dense
                  :color="lot?.status_color"
                  text-color="white"
                  class="absolute text-caption text-weight-bold"
                  style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
                >
                  {{  lot?.status }}
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
                    :name="lot?.category === 'Digital' ? 'computer' : 'delivery_dining'"
                    size="xs"
                    class="q-mr-xs"
                  />
                  {{ lot?.category }}
                </q-chip>

                <div class="text-subtitle1 text-weight-medium ellipsis-2-lines q-mb-xs">
                  {{ lot?.title }}
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
                        {{ formatFiat(lot?.starting_price_fiat) }}
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        {{ formatBCH(lot?.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot?.starting_price_bch).zeros }}</span>&nbsp;BCH
                      </div>
                    </template>

                    <template v-else>
                      <div class="text-caption text-weight-bold">
                        {{ formatBCH(lot?.starting_price_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot?.starting_price_bch).zeros }}</span>&nbsp;BCH
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        {{ formatFiat(lot?.starting_price_fiat) }}
                      </div>
                    </template>
                  </div>

                  <q-separator spaced="sm" />

                  <div class="column q-gap-y-none text-negative">
                    <div class="text-caption text-weight-bold">DROPS EVERY {{ lot?.getIntervalMinutes() }} MINUTES:</div>

                    <template v-if="auction?.is_fiat">
                      <div class="text-caption text-weight-bold">
                        -{{ formatFiat(lot?.price_drop_fiat) }}
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        -{{ formatBCH(lot?.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot?.price_drop_bch).zeros }}</span>&nbsp;BCH
                      </div>
                    </template>

                    <template v-else>
                      <div class="text-caption text-weight-bold">
                        -{{ formatBCH(lot?.price_drop_bch).main }}<span style="opacity: 0.4;">{{ formatBCH(lot?.price_drop_bch).zeros }}</span>&nbsp;BCH
                      </div>
                      <div style="opacity: 0.65; margin-top: -2px; font-size: 11px;">
                        -{{ formatFiat(lot?.price_drop_fiat) }}
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
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, date } from 'quasar'
import { callAPI } from 'src/auction/api'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import LotSearch from 'src/components/auction/LotSearch.vue'
import { callAuctionWebsocket } from 'src/auction/websocket'
import { formatAuctionCountdown, formatFiat, formatBCH, formatAuctionDate } from './helper-functions'

// Quasar variables
const $q = useQuasar()
const $store = useStore()
const $route = useRoute()
const $router = useRouter()

// System-related variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(false)

// Props
const props = defineProps({
  auctionId: {
    type: [String, Number],
    required: true
  }
})

// Auction-related variables
const auction = computed(() => $store.getters['auction/auctionData'])
const auctionEndCountdown = ref('Loading...')
const auctionStartCountdown = ref('Loading...')
const listingsTotalTime = computed(() => Date.now() - $store.getters['auction/listingsLastFetched'])

// Lot-related variables
const lotCategory = ref($store.getters['auction/auctionLotCategory'] ?? 'All')
const lotCategoryOptions = $store.getters['auction/lotCategoryOptions']
const lotSearchQuery = ref('') 

const auctionLotsTotalTime = computed(() => Date.now() - $store.getters['auction/auctionLotsLastFetched'])
const isLotEmpty = computed(() => !isLoading.value && filteredLots.value.length === 0)

const filteredLots = computed(() => {
  let targetLots = $store.getters['auction/filteredLots'] ?? []
  const query = lotSearchQuery.value.trim().toLowerCase()
  return (query) ? targetLots.filter(lot => lot?.title.toLowerCase().includes(query)) : targetLots
})

watch(lotCategory, (newType) => {
  $store.dispatch('auction/filterAuctionLots', { type: newType })
})

const loadPageData = async () => {
  // Check if props.auctionId is the same as stored auctionId (to prevent repeated fetching)
  console.log('auctionId: ', props.auctionId)
  const isSameAuctionId = $store.getters['auction/auctionId'] === Number(props.auctionId)

  console.log('2. fetching data', {
      isSameAuctionId,
      listingsTotalTime: listingsTotalTime.value,
      auctionLotsTotalTime: auctionLotsTotalTime.value
  })

  await Promise.all([
    (!isSameAuctionId || listingsTotalTime.value > 30000)
      ? $store.dispatch('auction/fetchAuctionData', props.auctionId)
      : $store.dispatch('auction/fetchExistingAuctionData', props.auctionId),

    (!isSameAuctionId || auctionLotsTotalTime.value > 30000)
      ? $store.dispatch('auction/fetchAuctionLots', props.auctionId)
      : Promise.resolve()
  ])

  if (auction.value?.type === 'Dutch' && filteredLots.value.length) {
    const allSold = filteredLots.value.every(l => l.is_sold)
    const notYetClosed = new Date(auction.value?.end_date) > new Date()
    
    if (allSold && notYetClosed) {
      const endDate = new Date().toISOString()
      await callAPI('listings', props.auctionId, 'patch', {
        end_date: endDate
      })
      $store.commit('auction/updateAuctionData', {
        attribute_name: 'end_date', 
        data: endDate
      })
    }
  }

  console.log('3. Promise.all finished')
}

onMounted(async () => {
  isLoading.value = true
  if (!auction.value) $router.replace(smartBackPath.value)
  await loadPageData()
  isLoading.value = false

  // call the connectWebsocket function
  socket = connectWebsocket()
})

onBeforeUnmount(() => {
  clearSocket()
})


// ===========================
// WEBSOCKET-RELATED FUNCTIONS
// ===========================

const viewCount = ref(0)
let socket = null
let reconnectTimeout = null
let reconnectAttempts = 0
let maxReconnectAttempts = 10

const connectWebsocket = () => {
  const ws = callAuctionWebsocket(Number(props.auctionId))

  ws.onopen = () => {
    reconnectAttempts = 0
    console.log("Connected to the auction websocket!")
  }

  ws.onmessage = (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch (error) {
      console.error("Invalid auction websocket message:", error)
      return
    }
    const { type, data = {} } = message
    
    switch(type) {
      case "live.viewing":
        viewCount.value = data.viewer_count
        break
      case "auction.start_countdown":
        auctionStartCountdown.value = formatAuctionCountdown(data.time_left)
        break
      case "auction.end_countdown":
        console.log(data.time_left)
        auctionEndCountdown.value = formatAuctionCountdown(data.time_left, true)
        if (auctionStartCountdown.value) auctionStartCountdown.value = ""
        break
      case "auction.start":
        console.log("auction.start")
        $store.commit('auction/updateAuctionData', {
          attribute_name: 'status', 
          data: data.status
        })

        $store.commit('auction/updateAuctionLotsData', {
          attribute_name: 'start_date', 
          data: auction.value?.start_date
        })
        $store.commit('auction/updateAuctionLotsData', {
          attribute_name: 'end_date', 
          data: auction.value?.end_date
        })
        break
      case "auction.end": {
        console.log("auction.end")
        auctionStartCountdown.value = "Time's Up!"
        $store.commit('auction/updateAuctionData', {
          attribute_name: 'status', 
          data: data.status
        })

        const endDate = data?.end_date || new Date().toISOString()
        $store.commit('auction/updateAuctionData', {
          attribute_name: 'end_date', 
          data: endDate
        })
        $store.commit('auction/updateAuctionLotsData', {
          attribute_name: 'end_date', 
          data: endDate
        })
        break
      }
      case "auction.update":
        $store.dispatch('auction/updateAuctionFromWebsocket', data)
        break
      case "auction.delete":
        $store.dispatch('auction/removeAuctionFromWebsocket', data.id)
        $router.replace({ name: 'app-auction' })
        break
      default:
        console.log("Unrecognized websocket event: " + type)
        break
    }
    console.log(data)
  }

  ws.onclose = (event) => {
    console.log("Disconnected from the auction websocket!")
    if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000)
      reconnectAttempts++
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        socket = connectWebsocket()
      }, delay)
    } 
  }

  ws.onerror = (event) => {
    console.error("Auction websocket error:", event)
  }

  return ws
}

const clearSocket = () => {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = null
  }
  if (!socket) return

  socket.close()
  socket.onmessage = null
  socket.onopen = null
  socket.onerror = null
  socket.onclose = null
  socket = null
}

// ========================================
// FETCHING AUCTION AND AUCTION LOT DETAILS
// ========================================

const toggleEditAuction = async () => {
  const now = new Date()
  const startDate = new Date(auction.value?.start_date)
  const minutesToStart = date.getDateDiff(startDate, now, 'minutes')

  if (minutesToStart > 30) {
    $router.push({ 
      name: 'app-auction-edit', 
      params: { auctionId: auction.value?.id }
    })
  } else {
    $q.notify({
      type: 'negative',
      message: 'You cannot modify this auction.'
    })
    await refresh(() => {})
  }
}

// ============================
// IS USER AUCTIONEER OR BIDDER
// ============================

const userWalletHash = computed(() => $store.getters['global/getWallet']('bch')?.walletHash)
const isAuctioneer = computed(() => userWalletHash.value === auction.value?.user)

// REVIEW THIS KAY WHY 30 MINS
const canEdit = computed(() => { 
  if (!isAuctioneer.value || !auction.value?.start_date) return false

  const now = new Date()
  const startDate = new Date(auction.value?.start_date)
  const minutesToStart = date.getDateDiff(startDate, now, 'minutes')
  
  return minutesToStart > 30
})

// =======================
// AUCTION STATUS UPDATING
// =======================

const getEnglishPriceInfo = (lot) => {
  return {
    label: lot?.hasBids() ? 'HIGHEST BID:' : 'STARTING PRICE:',
    fiat: lot?.threshold_bid_fiat,
    bch: lot?.threshold_bid_bch
  }
}

// ===================
// LOT STATUS UPDATING
// ===================




// ============
// PAGE-RELATED
// ============
const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copied to clipboard!', timeout: 1500 })
  })
}

const smartBackPath = computed(() => {
  const sourceContext = $route.query.from
  if (sourceContext === 'activity') return '/apps/auction/activity'
  return `/apps/auction`
})

const refresh = async (done) => {
  if (!auction.value) $router.replace(smartBackPath.value)
  await loadPageData()

  clearSocket()
  socket = connectWebsocket()
  done()
}
</script>
