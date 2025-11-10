<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-h5 q-px-sm">{{ collection?.name }}</div>

      <div class="row items-start" ref="productsContainer">
        <!-- Skeleton loaders -->
        <template v-if="(!initialized || !products.length) && fetchingProducts">
          <div v-for="n in 6" :key="`skeleton-${n}`" class="col-6 col-sm-4 col-md-3 q-pa-sm">
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-skeleton height="200px" square />
              <q-card-section>
                <q-skeleton type="text" width="30%" class="float-right" />
                <q-skeleton type="text" width="70%" />
                <q-skeleton type="text" width="50%" class="q-mt-xs" />
              </q-card-section>
            </q-card>
          </div>
        </template>
        
        <!-- Actual products -->
        <template v-else-if="products?.length">
          <div
            v-for="product in products" :key="product?.id"
            class="col-6 col-sm-4 col-md-3 q-pa-sm"
            @click="() => $router.push({ name: 'app-marketplace-collection-product', params: { collectionId: collectionId, productId: product?.id } })"
          >
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-img :src="product?.imageUrl || product?.variantImageUrl || noImage" ratio="1">
                <template v-slot:loading>
                  <q-skeleton height="100%" width="100%" square />
                </template>
              </q-img>
              <q-card-section>
                <div
                  v-if="Number.isFinite(product?.reviewSummary?.averageRating)"
                  class="float-right row items-center no-wrap"
                  @click.stop
                >
                  <q-rating :model-value="1" readonly max="1" size="1em" color="brandblue"/>
                  {{ roundRating(product?.reviewSummary?.averageRating) }}
                  <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                    <div class="row items-center no-wrap">
                      <q-rating
                        readonly
                        max="5"
                        :model-value="roundRating(product?.reviewSummary?.averageRating, { forceDecimals: false})"
                        size="1em"
                        color="brandblue"
                        class="no-wrap"
                        icon-half="star_half"
                      />
                      <div>
                        {{ roundRating(product?.reviewSummary?.averageRating) }}
                      </div>
                    </div>
                    <div>
                      {{
                        $t(
                          'ReviewCount',
                          { count: product?.reviewSummary?.count },
                          `(${ product?.reviewSummary?.count } review(s))`
                        )
                      }}
                    </div>
                  </q-menu>
                </div>
                <div class="row items-center">
                  <div class="q-space text-body1 ellipsis">{{ product?.name }}</div>
                  <q-chip
                    v-if="product?.availableAtStorefront(product?.storefrontId) == false"
                    dense
                    color="grey" text-color="white"
                    class="q-ma-none"
                  >
                    {{ $t('Unavailable') }}
                  </q-chip>
                </div>
                <div>
                  {{ product?.minMarkupPrice }}
                  <template v-if="product?.minMarkupPrice != product?.maxMarkupPrice">
                    - {{ product?.maxMarkupPrice }}
                  </template>
                  {{ getStorefrontCurrency(product?.storefrontId) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        
        <!-- Empty state -->
        <div v-else-if="initialized" class="text-grey text-center col-12">
          {{ $t('NoProducts') }}
        </div>
      </div>
      
      <!-- Infinite scroll loading indicator -->
      <div v-if="fetchingMoreProducts" class="row justify-center q-py-md">
        <q-spinner size="2em" color="brandblue"/>
      </div>
      
      <!-- Scroll sentinel for infinite loading -->
      <div ref="productScrollSentinel" style="height: 1px; width: 100%;"></div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Collection, Product } from 'src/marketplace/objects'
import { roundRating } from 'src/marketplace/utils'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onUnmounted, nextTick } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'

const props = defineProps({
  collectionId: [Number, String],
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  collection.value = Collection.parse()
  products.value = []
  productsPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}

onMounted(() => refreshPage())
watch(() => [props?.collectionId], () => {
  resetPage()
  refreshPage()
})

const storefrontId = computed(() => collection.value?.storefrontId)
onActivated(() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})

const collection = ref(Collection.parse())
const fetchingCollection = ref(false)
function fetchCollection() {
  fetchingCollection.value = true
  return backend.get(`connecta/collections/${props.collectionId}/`)
    .then(response => {
      collection.value = Collection.parse(response?.data)
    })
    .finally(() => {
      fetchingCollection.value = false
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
    collection_id: props.collectionId,
    limit: opts?.limit || 6,
    offset: opts?.offset !== undefined ? opts?.offset : productsPagination.value.offset,
  }

  const isLoadingMore = params.offset > 0
  if (isLoadingMore) {
    fetchingMoreProducts.value = true
  } else {
    fetchingProducts.value = true
  }

  return backend.get(`products/info`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      
      const newProducts = response?.data?.results.map(Product.parse)
      
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

function getStorefrontCurrency(storefrontId) {
  return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchCollection(),
      fetchProducts({ reset: true }),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', collection.value?.storefrontId)
    initialized.value = true
    done()
  }
}
</script>
