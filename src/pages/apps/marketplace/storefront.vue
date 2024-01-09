<template>
  <q-pull-to-refresh
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Marketplace"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />

    <div class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="row items-center q-px-xs q-mb-md">
        <div class="text-h5 q-mr-xs">{{ storefront?.name }}</div>
        <q-chip v-if="!storefront?.active" color="grey" class="q-ma-none text-weight-medium">Inactive</q-chip>
        <q-chip v-if="!storefront?.isOpen" color="grey" class="q-ma-none text-weight-medium">Closed</q-chip>
        <div v-if="!storefront?.isOpen && storefront?.openingTimeText" class="col-12">
          {{ storefront?.openingTimeText }}
        </div>
      </div>
      <div class="row items-center justify-center">
        <q-spinner v-if="!initialized && fetchingStorefront" size="4em" color="brandblue"/>
      </div>
      <div v-if="collections?.length" class="q-mb-md">
        <div class="q-px-sm row items-center" @click="expandCollections = !expandCollections">
          <div class="text-h6 q-space">Collections</div>
          <q-icon :name="expandCollections ? 'expand_less' : 'expand_more'"/>
        </div>
        <q-slide-transition>
          <div v-if="expandCollections" class="row items-start" style="overflow:auto;">

            <div class="col-12 row items-center q-px-sm">
              <q-space/>
              <LimitOffsetPagination
                :pagination-props="{
                  maxPages: 5,
                  rounded: true,
                  padding: 'sm md',
                  boundaryNumbers: true,
                  disable: fetchingCollections,
                }"
                class="q-my-sm"
                :hide-below-pages="2"
                :modelValue="collectionsPagination"
                @update:modelValue="fetchCollections"
              />
            </div>
            <div
              v-for="collection in collections" :key="collection?.id"
              class="col-6 col-sm-4 col-md-3 q-pa-sm"
            >
              <q-card
                :class="[darkMode ? 'pt-dark-card': 'text-black']"
                @click="() => $router.push({ name: 'app-marketplace-collection', params: { collectionId: collection?.id }})"
              >
                <q-img :src="collection?.imageUrl || noImage" ratio="1">
                  <div class="absolute-bottom text-subtitle2 text-center">
                    <div>{{ collection?.name }}</div>
                    <div v-if="collection?.productsCount" class="text-caption">
                      {{ collection?.productsCount }}
                      {{ collection?.productsCount === 1 ? 'product' : 'products' }}
                    </div>
                  </div>

                  <template v-slot:error>
                    <img :src="noImage" class="q-img__image q-img__image--with-transition q-img__image--loaded"/>
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
          </div>
        </q-slide-transition>
      </div>
      <div v-if="initialized || products?.length" class="row items-start">
        <div class="text-h6 col-12 q-px-sm">
          Products
          <q-spinner v-if="fetchingProducts"/>
        </div>
        <template v-if="products?.length">
          <div class="col-12 row items-center no-wrap q-gutter-sm q-mx-xs" style="overflow:auto;">
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
            <q-card :class="[darkMode ? 'pt-dark-card': 'text-black']">
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
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'

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
  initialized.value = false
}


onMounted(() => refreshPage())
watch(() => [props?.storefrontId], () => {
  resetPage()
  refreshPage()
})

const fetchingStorefront = ref(false)
const storefront = ref(Storefront.parse())
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

const expandCollections = ref(true)
const fetchingCollections = ref(false)
const collections = ref([].map(Collection.parse))
const collectionsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchCollections(opts={ limit: 0, offset: 0 }) {
  const params = {
    storefront_id: props.storefrontId || null,
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
  }

  fetchingCollections.value = true
  return backend.get(`connecta/collections/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })

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