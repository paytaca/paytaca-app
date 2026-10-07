<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable vue/no-use-v-if-with-v-for -->
<template>
  <!--
    This is the landing page for the Auction app. Redirects to appeals.vue if the user is
    set as Arbiter for the Auction app.

    NOTE: Lines-of-code and files for the Auction app are subject to change.
  -->
  <q-pull-to-refresh
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refresh"
  >
    <HeaderNav :title="$t('Auction')" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <template v-if="!isCheckingAccess">
          <AuctionHeaderMenu />
        </template>
      </template>
    </HeaderNav>

    <div v-if="isCheckingAccess" class="row justify-center q-pa-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else>
      <div class="q-px-md q-pt-xs q-pb-md sticky-below-header">
        <AuctionSearch @search-change="auctionSearchQuery = $event"/>
      </div>

      <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
        <div class="row items-center q-pa-sm q-mb-md">
          <div class="text-h5 q-px-xs">Listings</div>
          <q-select
            outlined
            dense
            v-model="auctionType"
            :options="auctionTypeOptions"
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
            <div :class="darkMode ? 'text-white' : 'text-black'">{{ $t('No Listings Listed') }}</div>
          </div>

          <div v-else v-for="auction in filteredListings" :key="auction?.id" class="col-6 col-sm-4 q-pa-xs">
            <q-card
              class="pt-card text-bow cursor-pointer"
              :class="getDarkModeClass(darkMode)"
              @click="$router.push({ name: 'app-auction-details', params: { auctionId: auction?.id }})"
            >
              <div class="relative-position">
                <q-img 
                  :src="auction?.image || noImage"
                  ratio="1.25"
                >
                  <template v-slot:loading>
                    <q-skeleton height="100%" width="100%" square />
                  </template>
                </q-img>

                <q-chip
                  dense
                  :color="auction?.status_color"
                  text-color="white"
                  class="absolute text-caption text-weight-bold"
                  style="top: 8px; right: 8px; margin: 0; padding: 3px 8px; height: auto;"
                >
                  {{ auction?.status }}
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
                  {{ auction?.type }}
                </q-chip>

                <div class="text-subtitle1 text-weight-medium ellipsis-3-lines q-mb-xs">{{ auction?.title }}</div>
                
                <q-separator spaced="sm" />

                <div class="column q-gutter-y-xs">
                  <div class="row items-center q-gutter-x-xs text-caption text-weight-bold">
                    <q-icon
                      :name="auction?.status === 'Upcoming' ? 'event_available' : 'event_busy'"
                      style="font-size: 11px;"
                    />
                    <strong class="text-bow">
                      {{ auction?.status === 'Upcoming' ? 'Starts' : (auction?.status === 'Closed' ? 'Ended' : 'Ends') }}
                    </strong>
                    <div>
                      {{
                        auction?.status === 'Upcoming'
                          ? formatAuctionDate(auction?.start_date)
                          : formatAuctionDate(auction?.end_date)
                      }}
                    </div>
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
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'
import AuctionSearch from 'src/components/auction/AuctionSearch.vue'
import noImage from 'src/assets/no-image.svg'
import { callIndexAuctionWebsocket } from 'src/auction/websocket'
import { formatAuctionDate, getArbiterServicerData } from './helper-functions'
import { AuctionList } from 'src/auction/object'

// Quasar-related variables
const $store = useStore()
const $router = useRouter()

// System variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(true)         // Controls auction listing loading
const isCheckingAccess = ref(true)  // Controls loading screen during profile checking

// Auction-related listings
const listingsTotalTime = computed(() => Date.now() - $store.getters['auction/listingsLastFetched'])
const username = computed(() => $store.getters['auction/username'])

onMounted(async () => {
  // Refresh the list of listings
  await (
    (listingsTotalTime.value > 300000)
    ?  $store.dispatch('auction/fetchListings')
    : Promise.resolve()
  )
  isLoading.value = false

  // Fetch username and if it doesn't exist, print the error
  await (
    (!username.value)
    ? $store.dispatch('auction/fetchUsername')
    : Promise.resolve()
  )
  if (!username.value) {
    // Route to username/profile page
    console.warn('User details missing, redirecting...')
    $router.push({ name: 'app-auction-profile' })
    return
  }

  // Reroute user to arbiter page if they're an assigned arbiter
  const isUserArbiter = $store.getters['auction/isArbiter']
  if (isUserArbiter) {
    $router.push({ name: 'app-auction-appeals' })
    return
  }
  
  // close profile checking loading screen 
  isCheckingAccess.value = false

  // fetch arbiter servicer data
  await getArbiterServicerData()

  // Connect to the WS (Review)
  socket = connectWebsocket()
})

onBeforeUnmount(() => {
  if (socket) clearSocket()
})

// ===============
// AUCTION-RELATED
// =============== 

// Variables
const auctionTypeOptions = $store.getters['auction/auctionTypeOptions']
const auctionType = ref($store.getters['auction/indexAuctionType'] ?? 'All')
const auctionSearchQuery = ref('') 

// Filters the auction items
const filteredListings = computed(() => {
  let items = $store.getters['auction/filteredListings'] ?? []
  const query = auctionSearchQuery.value.trim().toLowerCase()
  return (query) ? items.filter(item => item.title?.toLowerCase().includes(query)) : items
})

// Checks if auction is empty
const isAuctionEmpty = computed(() => !isLoading.value && filteredListings.value.length === 0)

// Keep tabs on the auction type so it would filter the items
watch(auctionType, (newType) => {
  $store.dispatch('auction/filterAuctionItems', {
    type: newType,
    isIndex: true
  })
})


// ===================
// WEBSOCKET FUNCTIONS
// ===================

// Websocket-related
let socket = null
let reconnectTimeout = null
let reconnectAttempts = 0
let maxReconnectAttempts = 10

// Websocket (WS)
const connectWebsocket = () => {
  const ws = callIndexAuctionWebsocket()

  // Upon connection
  ws.onopen = () => {
    reconnectAttempts = 0
    console.log("Connected to the index websocket!")
  };

  // Receiving WS messages/data from the server:
  ws.onmessage = async (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch (error) {
      console.error("Invalid index websocket message:", error)
      return
    }
    const { type, data } = message
    switch (type) {
      case "index.refresh_listings":
        await refresh()
        break
      case "index.update_auction":
        { 
          if (!data?.id) break
        
          const listings = $store.getters['auction/listings']
          const auctionExists = listings.some(auction => Number(auction.id) === Number(data.id))
          if (auctionExists) $store.commit('auction/updateListing', data)
          else $store.commit('auction/addListing', AuctionList.parse(data))

          $store.commit('auction/mergeAuctionData', data)
          $store.commit('auction/updateMyAuction', data)
          break 
        }
      case "index.remove_auction":
        if (data?.id) $store.commit('auction/removeListing', data.id)
        break
      // For unexpected WS messages
      default:
        console.warn("Unknown websocket message:", type, data)
    }
  }

  // Upon disconnection 
  ws.onclose = (event) => {
    console.log("Disconnected from the index auction websocket!")
    
    // In case it was accidental, make reconnection attempts 
    if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * 2 ** reconnectAttempts, 300000)
      reconnectAttempts++
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null
        socket = connectWebsocket()
      }, delay)
    }
  };

  // If an error occurs with the WS
  ws.onerror = (event) => {
    console.error("Index websocket error:", event)
  }

  return ws
}

// Close or clear up the socket
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


// ================
// HELPER FUNCTIONS
// ================

// ======================
// PAGE-RELATED FUNCTIONS
// ======================

// Check if the arbiterPK and servicerPK are not null (prevents dispatching it every time)

const refresh = async (done) => {
  await (
    (listingsTotalTime.value > 300000)
    ?  $store.dispatch('auction/fetchListings')
    : Promise.resolve()
  )

  await getArbiterServicerData()
  if (typeof done === 'function') done()
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
