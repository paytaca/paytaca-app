<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav title="Marketplace" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-px-sm q-mb-md">
        <div class="text-h5 q-mr-xs q-space">{{ storefront?.name }}</div>
        <template v-if="storefront?.id">
          <q-icon
            size="1.25rem"
            name="circle"
            :color="isRecentlyActive() ? 'green' : 'grey'"
          >
            <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
              <template v-if="!isRecentlyActive()">
                <template v-if="storefrontLiveness?.latest">
                  Online {{ formatDateRelative(storefrontLiveness?.latest) }}
                </template>
                <template v-else>
                  Offline for more than 1 day ago
                </template>
              </template>
              <template v-else>
                Online
              </template>
            </q-menu>
          </q-icon>
          <q-chip v-if="!storefront?.active" color="grey" class="q-ma-none text-weight-medium">Inactive</q-chip>
          <q-chip v-if="!storefront?.isOpen" color="grey" class="q-ma-none text-weight-medium">Closed</q-chip>
          <div v-if="!storefront?.isOpen && storefront?.openingTimeText" class="col-12">
            {{ storefront?.openingTimeText }}
          </div>
        </template>
      </div>
      <div v-if="storefront?.id" class="q-px-sm q-mb-sm">
        <q-input
          outlined
          dense
          :loading="Boolean(fetchingCollections) || fetchingProducts"
          clearable
          v-model="searchBar.text"
          placeholder="Search product/collection name"
          color="brandblue"
          debounce="500"
        >
          <template v-slot:append>
            <q-icon name="search"/>
          </template>
        </q-input>
      </div>
      <div class="row items-center justify-center">
        <q-spinner v-if="!initialized && fetchingStorefront" size="4em" color="brandblue"/>
      </div>
      <div v-if="collections?.length" class="q-mb-lg">
        <div class="q-px-sm row items-center" @click="expandCollections = !expandCollections">
          <div class="text-h6 q-space">Collections</div>
          <q-icon :name="expandCollections ? 'expand_less' : 'expand_more'"/>
        </div>
        <q-slide-transition>
          <div v-if="expandCollections">
            <div class="row items-start no-wrap" style="overflow:auto;">
              <div
                v-if="collectionsPagination.canPrepend"
                v-element-visibility="() => fetchCollectionsIfNotLoading({ prepend: true, limit: 2 })"
              >
              </div>
              <div v-if="fetchingCollections === 'prepending'" class="row items-center self-center q-pa-sm">
                <q-spinner size="3rem" color="brandblue"/>
              </div>
              <div
                v-for="collection in collections" :key="collection?.id"
                class="col-12 col-sm-6 col-md-3 q-pa-sm"
              >
                <q-card
                  class="pt-card text-bow"
                  :class="getDarkModeClass(darkMode)"
                  @click="() => $router.push({ name: 'app-marketplace-collection', params: { collectionId: collection?.id }})"
                >
                  <q-img :src="collection?.imageUrl || noImage" ratio="1.75">
                    <div class="absolute-bottom text-subtitle2 text-center">
                      <div>{{ collection?.name }}</div>
                      <div v-if="collection?.productsCount" class="text-caption">
                        {{ collection?.productsCount }}
                        {{ collection?.productsCount === 1 ? 'product' : 'products' }}
                      </div>
                    </div>
  
                    <template v-slot:error>
                      <img :src="noImage" class="q-img__image q-img__image--with-transition q-img__image--loaded" alt="" />
                      <div class="absolute-bottom text-subtitle2 text-center">
                        <div>{{ collection?.name }}</div>
                        <div v-if="collection?.productsCount" class="text-caption">
                          {{ collection?.productsCount }}
                          {{ collection?.productsCount === 1 ? 'product' : 'products' }}
                        </div>
                      </div>
                    </template>
                  </q-img>
                </q-card>
              </div>
              <div
                v-if="collectionsPagination.canAppend"
                v-element-visibility="() => fetchCollectionsIfNotLoading({ append: true, limit: 2 })"
                class="self-center"
              >
              </div>
              <div v-if="fetchingCollections === 'appending'" class="row items-center self-center q-pa-sm">
                <q-spinner size="3rem" color="brandblue"/>
              </div>
            </div>
          </div>
        </q-slide-transition>
      </div>
      <div v-if="initialized || products?.length" class="row items-start">
        <div class="col-12 q-pr-xs q-pl-sm">
          <div class="row items-center no-wrap q-gutter-sm" style="overflow:auto;">
            <q-chip
              v-for="category in productCategories" :key="category"
              :outline="category !== selectedCategory"
              :color="darkMode ? 'white' : 'brandblue'"
              :text-color="darkMode ? 'black' : 'white'"
              clickable
              @click="selectedCategory = category === selectedCategory ? '' : category"
            >
              {{ category }}
            </q-chip>
          </div>
        </div>
        <div class="col-12 q-px-sm q-mt-sm">
          <q-linear-progress v-if="fetchingProducts" indeterminate color="brandblue" size="4px"/>
          <div v-else style="height:4px;"></div>
        </div>
        <template v-if="products?.length">
          <div class="col-12 row items-center q-px-sm">
            <q-space/>
            <LimitOffsetPagination
              :pagination-props="{
                maxPages: 5,
                rounded: true,
                padding: 'sm md',
                boundaryNumbers: true,
                disable: fetchingProducts,
              }"
              class="q-my-sm"
              :hide-below-pages="2"
              :modelValue="productsPagination"
              @update:modelValue="fetchProducts"
            />
          </div>
          <div
            v-for="product in products" :key="product?.id"
            class="col-6 col-sm-4 col-md-3 q-pa-sm"
            @click="() => $router.push({ name: 'app-marketplace-product', params: { productId: product?.id } })"
          >
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-img :src="product?.imageUrl || product?.variantImageUrl || noImage" ratio="1"/>
              <q-card-section>
                <div class="row items-center">
                  <div class="q-space text-body1 ellipsis">{{ product?.name }}</div>
                  <q-chip
                    v-if="product?.availableAtStorefront(product?.storefrontId) == false"
                    dense
                    color="grey" text-color="white"
                    class="q-ma-none"
                  >
                    Unavailable
                  </q-chip>
                </div>
                <div>
                  {{ product.minMarkupPrice }}
                  <template v-if="product?.minMarkupPrice != product?.maxMarkupPrice">
                    - {{ product?.maxMarkupPrice }}
                  </template>
                  {{ getStorefrontCurrency(product?.storefrontId) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        <div v-else-if="initialized" class="text-grey text-center col-12">
          No products
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Collection, Product, Storefront } from 'src/marketplace/objects'
import { formatDateRelative } from 'src/marketplace/utils'
import { vElementVisibility } from '@vueuse/components'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated, onDeactivated, watchEffect } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'


defineOptions({
  directives: {
    'element-visibility': vElementVisibility
  }
})

const props = defineProps({
  storefrontId: [Number, String],
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  storefront.value.raw = null

  collections.value = []
  collectionsPagination.value = { count: 0, limit: 0, offset: 0 }

  selectedCategory.value = ''
  productCategories.value = []

  products.value = []
  productsPagination.value = { count: 0, limit: 0, offset: 0 }

  searchBar.value.text = ''
  initialized.value = false
}


onMounted(() => refreshPage())
watch(() => [props?.storefrontId], () => {
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
    fetchProducts(),
    fetchCollections(),
  ])
  searchBar.value.loading = false
})


const fetchingStorefront = ref(false)
const storefront = ref(Storefront.parse())
onActivated(() => {
  if (!props.storefrontId) return
  $store.commit('marketplace/setActiveStorefrontId', props.storefrontId)
})
function fetchStorefront() {
  fetchingStorefront.value = true
  return backend.get(`connecta/storefronts/${props.storefrontId}/`)
    .then(response => {
      const data = response?.data
      $store.commit('marketplace/cacheStorefront', data)
      storefront.value = Storefront.parse(data)
    })
    .finally(() => {
      fetchingStorefront.value = false
    })
}

const storefrontLiveness = ref({
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
  const diff = Date.now() - storefrontLiveness.value.latest
  return diff < 3600 * 1000
}
function updateLivenessStatus() {
  return backend.get(`connecta/storefronts/${props.storefrontId}/shop_liveness/`)
    .then(response => {
      const data = response?.data
      storefrontLiveness.value = {
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
    storefront_id: props.storefrontId || null,
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
  return backend.get(`connecta/collections/`, { params })
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
watch(selectedCategory, () => fetchProducts())
function fetchProductCategories() {
  const params = { storefront_id: props?.storefrontId }
  fetchingProductCategories.value = true
  return backend.get(`product-categories/`, { params })
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
const products = ref([].map(Product.parse))
const productsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchProducts(opts={ limit: 0, offset: 0 }) {
  const params = {
    storefront_id: props.storefrontId,
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
    categories: selectedCategory.value || undefined,
    s: searchBar.value?.text || undefined,
  }

  fetchingProducts.value = true
  return backend.get(`products/info/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })

      products.value = response?.data?.results?.map(Product.parse)
      productsPagination.value.count = response?.data?.count
      productsPagination.value.limit = response?.data?.limit
      productsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingProducts.value = false
    })
}

function getStorefrontCurrency(storefrontId) {
  return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchStorefront(),
      updateLivenessStatus(),
      fetchProducts(),
      fetchProductCategories(),
      fetchCollections(),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', storefront.value?.id)
    initialized.value = true
    done()
  }
}
</script>