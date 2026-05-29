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
  </q-pull-to-refresh>
</template>

<script setup>

import noImage from 'src/assets/no-image.svg'
import { backend, cachedBackend } from 'src/marketplace/backend'
import { parseCashbackCampaign, getCashbackCampaign } from 'src/marketplace/cashback'
import { Collection, Product, Storefront } from 'src/marketplace/objects'
import { formatDateRelative, formatDuration, roundRating, round } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, onUnmounted, watchEffect, nextTick } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import ReviewsListDialog from 'src/components/marketplace/reviews/ReviewsListDialog.vue'
import StorePickupDialog from 'src/components/marketplace/checkout/StorePickupDialog.vue'
import { debounce } from 'quasar'


defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const props = defineProps({
  auctionFrontId: [Number, String],
})

const $store = useStore()

//DARKMODE STATUS
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

/*
const initialized = ref(false)
function resetPage() {
  auctionFront.value.raw = null

  collections.value = []
  collectionsPagination.value = { count: 0, limit: 0, offset: 0 }

  selectedCategory.value = ''
  productCategories.value = []

  products.value = []
  productsPagination.value = { count: 0, limit: 0, offset: 0 }

  searchBar.value.text = ''
  initialized.value = false

  deliveryCalculation.value = {
    fee: 0,
    currencySymbol: '',
    distance: 0,
    deliveryDuration: 0,
    preparationDuration: 0,
  }
}


onMounted(() => refreshPage())
watch(() => [props?.auctionFrontId], () => {
  resetPage()
  refreshPage()
})

const searchBar = ref({
  text: '',
  loading: false,
  lastSearch: '',
})
watch(() => searchBar.value.text, async () => {
  if (searchBar.value.loading) {
    searchBar.value.text = searchBar.value.lastSearch
    return
  }

  searchBar.value.lastSearch = searchBar.value.text
  searchBar.value.loading = true
  await Promise.allSettled([
    fetchProducts({ reset: true }),
    fetchCollections(),
  ])
  searchBar.value.loading = false
})


const fetchingStorefront = ref(false)
*/
const auctionFront = {
  id: 1,
  name: "TestStore",
  active: true,
  auctioneer: "testUser",
}//ref(Storefront.parse())
onActivated(() => {
  if (!props.auctionFrontId) return
  $store.commit('marketplace/setActiveStorefrontId', props.auctionFrontId)
})
function fetchStorefront() {
  fetchingStorefront.value = true
  return backend.get(`connecta/auctionFronts/${props.auctionFrontId}/`)
    .then(response => {
      const data = response?.data
      $store.commit('marketplace/cacheStorefront', data)
      auctionFront.value = Storefront.parse(data)
    })
    .finally(() => {
      fetchingStorefront.value = false
    })
}

const auctionFrontLiveness = ref({
  latest: [].map(() => new Date())[0],
  count: 0,
  data: [].map(() => Object({ userId: 0, timestamp: new Date() }))
})

const livenessUpdateIntervalId = ref()
onActivated(() => {
  clearInterval(livenessUpdateIntervalId.value)
  livenessUpdateIntervalId.value = setInterval(() => updateLivenessStatus(), 120 * 1000)
  updateLivenessStatus()
})
onDeactivated(() => clearInterval(livenessUpdateIntervalId.value))
function isRecentlyActive() {
  const diff = Date.now() - auctionFrontLiveness.value.latest
  return diff < 3600 * 1000
}
function updateLivenessStatus() {
  return backend.get(`connecta/auctionFronts/${props.auctionFrontId}/shop_liveness/`)
    .then(response => {
      const data = response?.data
      auctionFrontLiveness.value = {
        latest: data?.latest && new Date(data?.latest),
        count: data?.count,
        data: (Array.isArray(data?.data) ? data?.data : []).map(record => {
          return {
            userId: record?.userId,
            timestamp: record?.timestamp && new Date(record?.timestamp)
          }
        })
      }
      return response
    })
}

const canShowPickupDialog = computed(() => {
  return Number.isFinite(customerCoordinates.value?.longitude) &&
        Number.isFinite(customerCoordinates.value?.latitude)
})
const showPickupDialog = ref(false)
const customerCoordinates = computed(() => $store.getters['marketplace/customerCoordinates'])
const deliveryCalculation = ref({
  fee: 0,
  currencySymbol: '',
  distance: 0,
  deliveryDuration: 0,
  preparationDuration: 0,
})
watch(() => props.auctionFrontId, () => updateDeliveryCalculation())
onActivated(() => updateDeliveryCalculation())
const updateDeliveryCalculation = debounce(() => {
  console.log('Updating delivery calculation')
  const params = {
    auctionFront_id: props.auctionFrontId,
    delivery_location: [
      round(customerCoordinates.value?.latitude, 6),
      round(customerCoordinates.value?.longitude, 6),
    ].join(','),
  }
  return cachedBackend.get(`connecta-express/calculate_delivery/`, { params, cache: { ttle: 300 * 1000 } })
    .then(response => {
      deliveryCalculation.value = {
        fee: parseFloat(response?.data?.fee),
        currencySymbol: response?.data?.currency_symbol,
        distance: parseInt(response?.data?.distance),
        deliveryDuration: parseInt(response?.data?.delivery_duration),
        preparationDuration: parseInt(response?.data?.preparation_duration),
      }

      bus.emit('marketplace-auctionFront-delivery-calculation', {
        auctionFrontId: parseInt(params.auctionFront_id),
        ...deliveryCalculation.value,
      })
      return response
    })
}, 500)


const showReviewsListDialog = ref(false)
const reviewsListDialog = ref()


const expandCollections = ref(true)
const fetchingCollections = ref(false)
const collections = ref([].map(Collection.parse))
const collectionsPagination = ref({
  count: 0, limit: 0, offset: 0,
  canAppend: false, canPrepend: false,
})

watchEffect(() => {
  collectionsPagination.value.canAppend = collectionsPagination.value.count > collectionsPagination.value.limit + collectionsPagination.value.offset
  collectionsPagination.value.canPrepend = collectionsPagination.value.offset > 0
})

function fetchCollectionsIfNotLoading(opts) {
  if (fetchingCollections.value) return Promise.resolve()
  return fetchCollections(opts)
}

function fetchCollections(opts={ limit: 0, offset: 0, append: false, prepend: false }) {
  if (opts?.append && !collectionsPagination.value.canAppend) return Promise.resolve()
  if (opts?.prepend && !collectionsPagination.value.canPrepend) return Promise.resolve()
  if (opts?.append && opts?.prepend) return Promise.resolve()

  const params = {
    auctionFront_id: props.auctionFrontId || null,
    limit: opts?.limit || 4,
    offset: opts?.offset || undefined,
    s: searchBar.value?.text || undefined,
    ordering: '-created_at',
  }

  if (opts?.append) {
    params.offset = collectionsPagination.value.offset + collectionsPagination.value.limit
  } else if (opts?.prepend) {
    params.offset = Math.max(collectionsPagination.value.offset - params?.limit, 0)
  }

  fetchingCollections.value = true
  if (opts?.append) fetchingCollections.value = 'appending'
  if (opts?.prepend) fetchingCollections.value = 'prepending'
  return cachedBackend.get(`connecta/collections/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })

      const results = response?.data?.results.map(Collection.parse)
      if (opts?.append || opts?.prepend) {
        if (opts?.prepend) results.reverse()
        results.forEach(collection => {
          const index = collections.value.findIndex(_collection => _collection?.id === collection?.id)
          if (index >= 0) return collections.value[index] = collection
          if (opts?.prepend) collections.value.unshift(collection)
          else collections.value.push(collection)
        })
        const newLength = collections.value.length
        collectionsPagination.value.count = response?.data?.count
        collectionsPagination.value.limit = collections.value.length
        // response?.data?.offset + prevLength + (results.length + (newLength - prevLength))
        collectionsPagination.value.offset = response?.data?.offset + (results?.length - newLength)
        if (opts?.prepend) collectionsPagination.value.offset = response?.data?.offset

        return response
      }

      collections.value = response?.data?.results.map(Collection.parse)
      collectionsPagination.value.count = response?.data?.count
      collectionsPagination.value.limit = response?.data?.limit
      collectionsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingCollections.value = false
    })
}

const fetchingProductCategories = ref(false)
const productCategories = ref([].map(String))
const selectedCategory = ref('')
watch(selectedCategory, () => fetchProducts({ reset: true }))
function fetchProductCategories() {
  const params = { auctionFront_id: props?.auctionFrontId }
  fetchingProductCategories.value = true
  return cachedBackend.get(`product-categories/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      productCategories.value = response?.data?.results
        .map(category => category?.name)
        .filter(Boolean)
      return response
    })
    .finally(() => {
      fetchingProductCategories.value = false
    })
}

const fetchingProducts = ref(false)
const fetchingMoreProducts = ref(false)
const products = ref([].map(Product.parse))
const productsPagination = ref({ count: 0, limit: 0, offset: 0 })
const productsContainer = ref(null)
const productScrollSentinel = ref(null)

function fetchProducts(opts={ limit: 0, offset: 0, reset: false }) {
  // If resetting, clear the list
  if (opts.reset) {
    products.value = []
    productsPagination.value = { count: 0, limit: 0, offset: 0 }
  }

  const params = {
    auctionFront_id: props.auctionFrontId,
    limit: opts?.limit || 6,
    offset: opts?.offset !== undefined ? opts?.offset : productsPagination.value.offset,
    categories: selectedCategory.value || undefined,
    s: searchBar.value?.text || undefined,
  }

  const isLoadingMore = params.offset > 0
  if (isLoadingMore) {
    fetchingMoreProducts.value = true
  } else {
    fetchingProducts.value = true
  }

  return backend.get(`products/info/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })

      const newProducts = response?.data?.results?.map(Product.parse)
      
      // Append to existing list if loading more, otherwise replace
      if (isLoadingMore) {
        products.value = [...products.value, ...newProducts]
      } else {
        products.value = newProducts
      }

      productsPagination.value.count = response?.data?.count
      productsPagination.value.limit = response?.data?.limit
      productsPagination.value.offset = response?.data?.offset + response?.data?.results.length
      
      // Set up infinite scroll observer after initial data is loaded
      if (!isLoadingMore && response?.data?.results.length > 0) {
        setupProductInfiniteScroll()
      }
      
      return response
    })
    .finally(() => {
      fetchingProducts.value = false
      fetchingMoreProducts.value = false
    })
    .then((response) => {
      // After loading completes and loading states are cleared, check again if we need more
      if (response?.data?.results.length > 0) {
        checkAndLoadMoreProducts()
      }
    })
}

// Infinite scroll setup for products
let productObserver = null
let productScrollListenerCleanup = null

function onProductScroll(event) {
  if (fetchingProducts.value || fetchingMoreProducts.value) return
  
  const hasMore = products.value.length < productsPagination.value.count
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
    fetchProducts({ offset: productsPagination.value.offset })
  }
}

function setupProductInfiniteScroll() {
  // Clean up existing observer and listeners
  if (productObserver) {
    productObserver.disconnect()
  }
  if (productScrollListenerCleanup) {
    productScrollListenerCleanup()
    productScrollListenerCleanup = null
  }
  
  nextTick(() => {
    if (!productScrollSentinel.value) return
    
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
    
    productObserver = new IntersectionObserver(
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
        
        if (entry.isIntersecting && !fetchingProducts.value && !fetchingMoreProducts.value) {
          // Check if there are more items to load
          const hasMore = products.value.length < productsPagination.value.count
          if (hasMore) {
            fetchProducts({ offset: productsPagination.value.offset })
          }
        }
      },
      options
    )
    productObserver.observe(productScrollSentinel.value)
    
    // Add scroll listener as backup for Safari full screen mode
    const cleanupFns = []
    
    // Listen to window scroll
    window.addEventListener('scroll', onProductScroll, { passive: true })
    cleanupFns.push(() => window.removeEventListener('scroll', onProductScroll))
    
    // Listen to scroll container if found
    if (scrollRoot) {
      scrollRoot.addEventListener('scroll', onProductScroll, { passive: true })
      cleanupFns.push(() => scrollRoot.removeEventListener('scroll', onProductScroll))
    }
    
    productScrollListenerCleanup = () => cleanupFns.forEach(fn => fn())
  })
}

onUnmounted(() => {
  if (productObserver) {
    productObserver.disconnect()
  }
  if (productScrollListenerCleanup) {
    productScrollListenerCleanup()
  }
})

// Check if sentinel is visible and load more if needed
function checkAndLoadMoreProducts() {
  // Wait a bit for DOM to update
  setTimeout(() => {
    if (!productScrollSentinel.value) return
    if (fetchingProducts.value || fetchingMoreProducts.value) return
    
    const hasMore = products.value.length < productsPagination.value.count
    if (!hasMore) return
    
    const rect = productScrollSentinel.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    
    // Check if sentinel is in viewport (with some margin for safety)
    const isVisible = rect.top < viewportHeight && rect.bottom >= 0
    
    // If sentinel is visible, load more items
    if (isVisible) {
      fetchProducts({ offset: productsPagination.value.offset })
    }
  }, 100)
}

const currency = computed(() => getStorefrontCurrency(props.auctionFrontId))
function getStorefrontCurrency(auctionFrontId) {
  return $store.getters['marketplace/getStorefrontCurrency']?.(auctionFrontId)
}


const showCashbackCampaignDetails = ref(false)
const cashbackCampaign = ref(parseCashbackCampaign())
watch(() => props.auctionFrontId, () => updateCashbackCampaign({ clearFirst: true }))
async function updateCashbackCampaign(opts= { clearFirst: false }) {
  if (opts?.clearFirst) {
    cashbackCampaign.value = parseCashbackCampaign()
  }
  // const resp = await backend.get('https://engagementhub.paytaca.com/api/cashback/campaign/1/')
  // cashbackCampaign.value = parseCashbackCampaign(resp?.data)
  cashbackCampaign.value = await getCashbackCampaign({ auctionFrontId: props.auctionFrontId })
}
const currentBchPrice = ref({ value: 0, timestamp: 0 })
watch(currency, () => updateBchPrice())
onMounted(() => updateBchPrice())
async function updateBchPrice() {
  const params = { currencies: currency.value }
  return backend.get('https://watchtower.cash/api/bch-prices/', { params })
    .then(response => {
      currentBchPrice.value = {
        value: Number(response?.data?.[0]?.price_value),
        timestamp: new Date(response?.data?.[0]?.timestamp).getTime(),
      }
      return response
    })
}

const cashbackLimitFiat = computed(() => {
  if (!cashbackCampaign.value?.id) return
  cashbackCampaign.value.firstCashbackPercentage
  cashbackCampaign.value.succeedingCashbackPercentage
  const limit = Math.min(
    cashbackCampaign.value.perCustomerCashbackLimit || 0,
    cashbackCampaign.value.perMerchantCashbackLimit || 0,
    cashbackCampaign.value.perTransansactionCashbackLimit || 0,
  )

  const cashbackLimit = round(currentBchPrice.value.value * (limit / 10 ** 8), 3)
  return cashbackLimit
})

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchStorefront(),
      updateLivenessStatus(),
      fetchProducts({ reset: true }),
      fetchProductCategories(),
      fetchCollections(),
      updateDeliveryCalculation(),
      reviewsListDialog.value?.fetchReviews?.(),
      updateCashbackCampaign(),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', auctionFront.value?.id)
    initialized.value = true
    done()
  }
}
</script>