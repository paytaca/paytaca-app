<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" backnavpath="/apps" class="header-nav">
      <template v-slot:top-right-menu>
        <MarketplaceHeaderMenu/>
      </template>
    </HeaderNav>

    <div class="pt-card br-15 q-mt-md q-mx-md q-pa-sm" :class="getDarkModeClass(darkMode)">
      <div class="q-mx-sm q-my-sm">
        <SessionLocationWidget ref="sessionLocationWidget" />
      </div>  

      <div
        class="q-px-md q-pt-xs q-pb-md sticky-below-header"
        :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
      >
        <MarketplaceSearch :customer-coordinates="customerCoordinates"/>
      </div>
    </div>    

    <div class="q-pa-sm text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-pa-sm">
        <div class="text-h5 q-px-xs">Shops</div>
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
      <div v-if="initialized" class="q-mx-xs q-mb-md row items-center justify-around">
        <q-btn
          rounded
          :outline="shopDeliveryTypeFilter != Checkout.DeliveryTypes.STORE_PICKUP"
          :color="shopDeliveryTypeFilter == Checkout.DeliveryTypes.STORE_PICKUP ? 'pt-primary1' : ''"
          :disable="fetchingStorefronts"
          padding="xs md"
          no-caps label="Pickup"
          icon="storefront"
          style="min-width:150px;"
          @click="() => toggleDeliveryType(Checkout.DeliveryTypes.STORE_PICKUP)"
        />
        <q-btn
          rounded
          :outline="shopDeliveryTypeFilter != Checkout.DeliveryTypes.LOCAL_DELIVERY"
          :color="shopDeliveryTypeFilter == Checkout.DeliveryTypes.LOCAL_DELIVERY ? 'pt-primary1' : ''"
          :disable="fetchingStorefronts"
          padding="xs md"
          no-caps label="Delivery"
          icon="delivery_dining"
          style="min-width:150px;"
          @click="() => toggleDeliveryType(Checkout.DeliveryTypes.LOCAL_DELIVERY)"
        />
      </div>
      <div class="row items-start justify-start q-mb-md" ref="storefrontsContainer">
        <!-- Skeleton loaders -->
        <template v-if="(!initialized || !storefronts.length) && fetchingStorefronts">
          <div v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 q-pa-xs">
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-skeleton height="200px" />
              <q-card-section class="q-py-sm">
                <q-skeleton type="text" width="60%" />
                <q-skeleton type="text" width="40%" class="q-mt-xs" />
              </q-card-section>
            </q-card>
          </div>
        </template>
        
        <!-- Empty state message -->
        <template v-else-if="initialized && !fetchingStorefronts && storefronts.length === 0 && customerCoordinatesValid">
          <div class="col-12 q-pa-lg text-center" style="min-height: 50vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <q-icon name="storefront" size="64px" :class="darkMode ? 'text-grey-6' : 'text-grey-4'" class="q-mb-md" />
            <div class="text-h6 q-mb-sm" :class="getDarkModeClass(darkMode)">
              {{ $t('NoShopsInArea', {}, 'No shops in your area yet') }}
            </div>
            <div class="text-body2" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('NoShopsInAreaDescription', {}, 'We\'re working on expanding our network. Check back soon!') }}
            </div>
          </div>
        </template>
        
        <!-- Actual storefronts -->
        <template v-else-if="storefronts.length > 0">
          <div v-for="storefront in storefronts" :key="storefront?.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            class="pt-card text-bow"
            :class="getDarkModeClass(darkMode)"
            @click="
              !storefront?.inPrelaunch
                ? $router.push({ name: 'app-marketplace-storefront', params: { storefrontId: storefront?.id }})
                : undefined
            "
          >
            <q-img 
              :src="storefront?.imageUrl || noImage" 
              ratio="1.75"
              :class="{ 'closed-shop-image': !storefront?.isOpen && !storefront?.inPrelaunch }"
            >
              <template v-slot:loading>
                <q-skeleton height="100%" width="100%" square />
              </template>
            </q-img>
            <q-card-section class="q-py-sm">
              <div
                v-if="Number.isFinite(storefront?.ordersReviewSummary?.averageRating)"
                class="float-right row items-center no-wrap"
                @click.stop
              >
                <q-rating :model-value="1" readonly max="1" size="1em" color="pt-primary1"/>
                {{ roundRating(storefront?.ordersReviewSummary?.averageRating) }}
                <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                  <div class="row items-center no-wrap">
                    <q-rating
                      readonly
                      max="5"
                      :model-value="roundRating(storefront?.ordersReviewSummary?.averageRating, { forceDecimals: false})"
                      size="1em"
                      color="pt-primary1"
                      class="no-wrap"
                      icon-half="star_half"
                    />
                    <div>
                      {{ roundRating(storefront?.ordersReviewSummary?.averageRating) }}
                    </div>
                  </div>
                  <div>
                    ({{ storefront?.ordersReviewSummary?.count }}
                    {{ storefront?.ordersReviewSummary?.count === 1 ? 'review' : 'reviews' }})
                  </div>
                </q-menu>
              </div>
              <q-badge v-if="!storefront?.inPrelaunch && !storefront?.isOpen" color="grey" class="q-mr-xs">
                Closed
              </q-badge>
              <q-badge v-if="!storefront?.inPrelaunch && storefront?.isStorepickupOnly" color="info" class="q-mr-xs">
                Store pickup
              </q-badge>
              <div class="ellipsis-3-lines">{{ storefront.name }}</div>
              <div v-if="!storefront?.isOpen && storefront?.openingTimeText" class="text-caption bottom">
                {{ storefront?.openingTimeText }}
              </div>
              <div v-if="storefront?.location?.formattedCityAddress" class="row items-start text-caption no-wrap">
                <div><q-icon name="location_on" style="line-height: 90%;"/></div>
                <div>
                  {{ storefront?.location?.formattedCityAddress }}
                  <span v-if="storefront?.distance" class="text-grey">
                    (~{{ round(storefront?.distance/1000, 2) }} km)
                  </span>
                </div>
              </div>
              <q-badge v-if="storefront?.inPrelaunch" color="pt-primary1">
                <div>Will be live soon!</div>
                <template v-if="storefront?.launchDate">
                  <!-- <div>{{ formatDateRelative(storefront?.launchDate) }}</div> -->
                  <q-menu class="q-pa-sm text-bow pt-card-2" :class="getDarkModeClass(darkMode)">
                    Live on: {{ formatTimestampToText(storefront?.launchDate) }}
                  </q-menu>
                </template>
              </q-badge>
            </q-card-section>
          </q-card>
          </div>
        </template>
      </div>
      
      <!-- Infinite scroll loading indicator -->
      <div v-if="fetchingMoreStorefronts" class="row justify-center q-py-md">
        <q-spinner size="2em" color="pt-primary1"/>
      </div>
      
      <!-- Scroll sentinel for infinite loading -->
      <div ref="storefrontScrollSentinel" style="height: 1px; width: 100%;"></div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Storefront, Checkout } from 'src/marketplace/objects'
import { formatDateRelative, formatTimestampToText, getISOWithTimezone, round, roundRating } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import SessionLocationWidget from 'src/components/marketplace/SessionLocationWidget.vue'
import MarketplaceHeaderMenu from 'src/components/marketplace/MarketplaceHeaderMenu.vue'
import MarketplaceSearch from 'src/components/marketplace/MarketplaceSearch.vue'


const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const loaded = false

const initialized = ref(false)
function resetPage() {
  storefronts.value = []
  storefrontsPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}


// add delay to get loadAppPromise from MarketplaceLayout to initialize
onMounted(() => setTimeout(() => refreshPage(), 100))
onActivated(() => {
  if (!initialized.value) return
})

const loadAppPromise = ref()
async function onLoadAppInit(_loadAppPromise) {
  loadAppPromise.value = _loadAppPromise
  try {
    await loadAppPromise.value
  } finally {
    loadAppPromise.value = undefined
  }
}
onMounted(() => bus.on('marketplace-init-promise', onLoadAppInit))
onUnmounted(() => bus.off('marketplace-init-promise', onLoadAppInit))


onMounted(() => bus.on('marketplace-manual-select-location', manualSelectLocation))
onUnmounted(() => bus.off('marketplace-manual-select-location', manualSelectLocation))

// Infinite scroll setup
let storefrontObserver = null
let scrollListenerCleanup = null
const storefrontsContainer = ref(null)

function onScroll(event) {
  if (fetchingStorefronts.value || fetchingMoreStorefronts.value) return
  
  const hasMore = storefronts.value.length < storefrontsPagination.value.count
  if (!hasMore) return
  
  const element = event?.target || window
  let scrollTop, scrollHeight, clientHeight
  
  if (element === window || element === document) {
    scrollTop = window.pageYOffset || document.documentElement.scrollTop
    scrollHeight = document.documentElement.scrollHeight
    clientHeight = window.innerHeight || document.documentElement.clientHeight
  } else {
    scrollTop = element.scrollTop
    scrollHeight = element.scrollHeight
    clientHeight = element.clientHeight
  }
  
  const scrollBottom = scrollHeight - scrollTop - clientHeight
  
  // Load more when user is within 300px of the bottom
  if (scrollBottom < 300) {
    fetchStorefronts({ offset: storefrontsPagination.value.offset })
  }
}

function setupInfiniteScroll() {
  // Clean up existing observer and listeners
  if (storefrontObserver) {
    storefrontObserver.disconnect()
  }
  if (scrollListenerCleanup) {
    scrollListenerCleanup()
    scrollListenerCleanup = null
  }
  
  nextTick(() => {
    if (!storefrontScrollSentinel.value) return
    
    // Find the scroll container - the q-pull-to-refresh's inner scroll div
    let scrollRoot = null
    const appContainer = document.getElementById('app-container')
    
    // q-pull-to-refresh creates a scroll wrapper div inside it
    if (appContainer) {
      const scrollWrapper = appContainer.querySelector('.q-scrollarea, .q-pull-to-refresh__scroll')
      scrollRoot = scrollWrapper || appContainer
    }
    
    let initialIntersectionHandled = false
    
    const options = {
      root: scrollRoot,
      rootMargin: '200px',
      threshold: 0.1
    }
    
    storefrontObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        
        // On first callback, just record the state and skip action
        if (!initialIntersectionHandled) {
          initialIntersectionHandled = true
          // If it's not initially intersecting, we're good to process next time
          if (!entry.isIntersecting) {
            return
          }
          // If it IS initially intersecting, skip this one but process the next
          return
        }
        
        if (entry.isIntersecting && !fetchingStorefronts.value && !fetchingMoreStorefronts.value) {
          // Check if there are more items to load
          const hasMore = storefronts.value.length < storefrontsPagination.value.count
          if (hasMore) {
            fetchStorefronts({ offset: storefrontsPagination.value.offset })
          }
        }
      },
      options
    )
    storefrontObserver.observe(storefrontScrollSentinel.value)
    
    // Add scroll listener as backup for Safari full screen mode
    const cleanupFns = []
    
    // Listen to window scroll
    window.addEventListener('scroll', onScroll, { passive: true })
    cleanupFns.push(() => window.removeEventListener('scroll', onScroll))
    
    // Listen to scroll container if found
    if (scrollRoot) {
      scrollRoot.addEventListener('scroll', onScroll, { passive: true })
      cleanupFns.push(() => scrollRoot.removeEventListener('scroll', onScroll))
    }
    
    scrollListenerCleanup = () => cleanupFns.forEach(fn => fn())
  })
}

onUnmounted(() => {
  if (storefrontObserver) {
    storefrontObserver.disconnect()
  }
  if (scrollListenerCleanup) {
    scrollListenerCleanup()
  }
})

// Check if sentinel is visible and load more if needed
function checkAndLoadMore() {
  // Wait a bit for DOM to update
  setTimeout(() => {
    if (!storefrontScrollSentinel.value) return
    if (fetchingStorefronts.value || fetchingMoreStorefronts.value) return
    
    const hasMore = storefronts.value.length < storefrontsPagination.value.count
    if (!hasMore) return
    
    const rect = storefrontScrollSentinel.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    
    // Check if sentinel is in viewport (with some margin for safety)
    const isVisible = rect.top < viewportHeight && rect.bottom >= 0
    
    // If sentinel is visible, load more items
    if (isVisible) {
      fetchStorefronts({ offset: storefrontsPagination.value.offset })
    }
  }, 100)
}
const sessionLocationWidget = ref()
function manualSelectLocation() {
  if (!sessionLocationWidget.value) return
  sessionLocationWidget.value.openLocationSelector = true
  nextTick(() => {
    sessionLocationWidget.value?.updateDeviceLocation?.()
  })
}


const customerCoordinates = computed(() => $store.getters['marketplace/customerCoordinates'])
watch(customerCoordinates, () => fetchStorefronts({ reset: true }))
const customerCoordinatesValid = computed(() => {
  return !Number.isNaN(customerCoordinates.value?.latitude) &&
         !Number.isNaN(customerCoordinates.value.longitude)
})

const fetchingStorefronts = ref(false)
const fetchingMoreStorefronts = ref(false)
const storefronts = ref([].map(Storefront.parse))
const storefrontsPagination = ref({ count: 0, limit: 0, offset: 0 })
const storefrontScrollSentinel = ref(null)
const shopDeliveryTypeFilter = computed({
  get() {
    return $store.getters['marketplace/shopListOpts']?.deliveryType
  },
  set(value) {
    $store.commit('marketplace/setShopListOpts', { deliveryType: value })
  },
})

function toggleDeliveryType(value) {
  shopDeliveryTypeFilter.value = shopDeliveryTypeFilter.value == value ? '' : value
}
const storefrontListOpts = computed(() => {
  const data = {
    radius: ($store.getters['marketplace/shopListOpts']?.radius || 30) * 1000,
    deliveryType: shopDeliveryTypeFilter.value,
  }
  return data
})
watch(storefrontListOpts, () => fetchStorefronts({ reset: true }), { deep: true })
function openStorefrontListOptsForm() {
  $q.dialog({
    title: 'Shops options',
    message: 'Find shops within the set distance',
    position: 'bottom',
    prompt: {
      clearable: true,
      outlined: true,
      dark: darkMode.value,
      model: storefrontListOpts.value?.radius / 1000,
      type: 'number',
      suffix: 'km',
      isValid: val => val > 0,
    },
    color: 'pt-primary1',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  .onOk(data => $store.commit('marketplace/setShopListOpts', { radius: parseFloat(data) }))
}
async function fetchStorefronts(opts={ limit: 0, offset: 0, reset: false }) {
  // If resetting, clear the list
  if (opts.reset) {
    storefronts.value = []
    storefrontsPagination.value = { count: 0, limit: 0, offset: 0 }
  }
  
  const params = {
    limit: opts?.limit || 6,
    offset: opts?.offset !== undefined ? opts?.offset : storefrontsPagination.value.offset,
    delivery_types: shopDeliveryTypeFilter.value || undefined,
    distance: '',
    active: true,
    annotate_is_open_at: getISOWithTimezone(new Date()),
    ordering: 'in_prelaunch,-is_open',
  }
  if (customerCoordinatesValid.value) {
    params.distance = btoa(JSON.stringify({
      lat: customerCoordinates.value?.latitude,
      lon: customerCoordinates.value?.longitude,
      radius: storefrontListOpts.value?.radius,
    }))
    params.ordering = [params.ordering, 'distance'].join(',')
  } else {
    return
  }

  const isLoadingMore = params.offset > 0
  if (isLoadingMore) {
    fetchingMoreStorefronts.value = true
  } else {
    fetchingStorefronts.value = true
  }
  
  return backend.get(`connecta/storefronts/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      const newStorefronts = response?.data?.results.map(storefrontData => {
        $store.commit('marketplace/cacheStorefront', storefrontData)
        return Storefront.parse(storefrontData)
      })
      
      // Append to existing list if loading more, otherwise replace
      if (isLoadingMore) {
        storefronts.value = [...storefronts.value, ...newStorefronts]
      } else {
        storefronts.value = newStorefronts
      }
      
      storefrontsPagination.value.count = response?.data?.count
      storefrontsPagination.value.limit = response?.data?.limit
      storefrontsPagination.value.offset = response?.data?.offset + response?.data?.results.length
      
      // Set up infinite scroll observer after initial data is loaded
      if (!isLoadingMore && response?.data?.results.length > 0) {
        setupInfiniteScroll()
      }
      
      return response
    })
    .finally(() => {
      fetchingStorefronts.value = false
      fetchingMoreStorefronts.value = false
    })
    .then((response) => {
      // After loading completes and loading states are cleared, check again if we need more
      if (response?.data?.results.length > 0) {
        checkAndLoadMore()
      }
    })
}


async function refreshPage(done=() => {}) {
  try {
    await loadAppPromise.value
    if (initialized.value && !customerCoordinatesValid.value) await manualSelectLocation()
    await fetchStorefronts({ reset: true })
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', null)
    initialized.value = true
    done()
  }
}
</script>
<style scoped lang="scss">
@import '../../../css/shared.scss'; // Using this should get you the variables

table.orders-table {
  border-spacing: map-get($space-xs, "x") map-get($space-sm, "y");
}
table.orders-table td {
  vertical-align: top;
}

.sticky-below-header {
  position: sticky;
  top: 70px;
  z-index: 10 !important;
}

.closed-shop-image {
  opacity: 0.5;
}
.sticky-below-header.sticky-below-header--ios {
  top: 110px;
}

.pt-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInUp 0.4s ease-out;
}

/* ==================== ANIMATIONS ==================== */
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
