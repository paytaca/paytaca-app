<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row items-center q-px-sm">
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
      <div v-if="!storefront?.isStorepickupOnly && deliveryCalculation?.fee" class="row items-center no-wrap q-px-sm">
        <div class="q-space">
          Delivery:
          {{ deliveryCalculation?.fee }} {{ deliveryCalculation?.currencySymbol }}
          <span v-if="deliveryCalculation?.distance">
            &nbsp;| {{ round(deliveryCalculation?.distance, 1) / 1000 }} km
          </span>
          <span v-if="deliveryCalculation?.deliveryDuration && deliveryCalculation.preparationDuration">
            | ~{{ formatDuration(deliveryCalculation?.deliveryDuration + deliveryCalculation?.preparationDuration, { roundDecimals: 0 }) }}
          </span>
          <span v-else-if="deliveryCalculation?.deliveryDuration">
            &nbsp;| >{{ formatDuration(deliveryCalculation?.deliveryDuration, { roundDecimals: 0 }) }}
          </span>
        </div>
        <q-btn
          v-if="deliveryCalculation?.deliveryDuration"
          flat
          padding="none xs"
          no-caps label="Info"
          color="brandblue"
        >
          <q-menu class="q-pa-sm pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
            <div style="min-width: min(250px, 75vw);">
              <div v-if="deliveryCalculation?.fee" class="row items-center">
                <div class="q-space">Delivery fee:</div>
                <div>{{ deliveryCalculation?.fee }} {{ deliveryCalculation?.currencySymbol }}</div>
              </div>
              <div class="row items-center">
                <div class="q-space">Delivery time:</div>
                <div>
                  {{ formatDuration(deliveryCalculation?.deliveryDuration, { roundDecimals: 0 }) }}
                </div>
              </div>
              <div class="row items-center">
                <div class="q-space">Preparation time:</div>
                <div v-if="deliveryCalculation?.preparationDuration">
                  {{ formatDuration(deliveryCalculation?.preparationDuration, { roundDecimals: 0 }) }}
                </div>
                <div v-else class="text-grey"><i>{{ $t('NoData') }}</i></div>
              </div>
            </div>
          </q-menu>
        </q-btn>
      </div>
      <div
        v-if="Number.isFinite(storefront?.ordersReviewSummary?.averageRating)"
        class="row items-center no-wrap q-mx-sm"
      >
        <q-rating :model-value="1" readonly max="1" size="1.5em" color="brandblue" class="q-mr-xs"/>
        <div>
          {{ roundRating(storefront?.ordersReviewSummary?.averageRating) }}
          ({{ storefront?.ordersReviewSummary?.count }}
          {{ storefront?.ordersReviewSummary?.count === 1 ? 'review' : 'reviews' }})
        </div>
        <q-space/>
        <q-btn
          flat
          no-caps label="See reviews"
          color="brandblue"
          padding="xs md"
          class="q-r-mr-lg"
          @click="() => showReviewsListDialog = true"
        />
        <ReviewsListDialog
          ref="reviewsListDialog"
          v-model="showReviewsListDialog"
          :storefront-id="storefrontId"
        />
      </div>
      <div class="q-py-sm"></div>
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
      <q-banner
        v-if="storefront?.isStorepickupOnly === true"
        rounded
        inline-actions
        class="q-my-md q-mx-sm bg-grad"
      >
        <template v-if="!canShowPickupDialog" v-slot:avatar>
          <q-icon name="storefront"/>
        </template>
        <template v-else v-slot:action>
          <q-btn
            outline
            round
            icon="storefront"
            padding="0.75rem"
            size="1.25rem"
            @click="() => showPickupDialog = true"
          />
          <StorePickupDialog
            v-model="showPickupDialog"
            view-only
            title="Store location"
            message=""
            :storefront="storefront"
            :relativeLocation="customerCoordinates"
          />
        </template>
        <div class="text-h6" style="line-height:1.2">Store pickup only</div>
        <div>This store is for store pickup only</div>
        <div v-if="deliveryCalculation?.distance">
          {{ round(deliveryCalculation?.distance, 1) / 1000 }} km away
        </div>
      </q-banner>
      <q-banner
        v-if="cashbackCampaign?.id"
        rounded
        class="q-my-md q-mx-sm bg-grad"
      >
        <div class="text-h6" style="line-height:1.2" v-if="cashbackCampaign?.is_one_time_claim">
          {{
            $t(
              'MarketplaceCashbackMsgOneTime',
              { percent: parseInt(cashbackCampaign?.firstCashbackPercentage * 100) },
              `Get ${parseInt(cashbackCampaign?.firstCashbackPercentage * 100)}% ` +
              'cashback!'
            )
          }}
        </div>
        <div class="text-h6" style="line-height:1.2" v-else>
          {{
            $t(
              'MarketplaceCashbackMsg',
              {
                min: parseInt(cashbackCampaign?.succeedingCashbackPercentage * 100),
                max: parseInt(cashbackCampaign?.firstCashbackPercentage * 100)
              },
              `Get ${parseInt(cashbackCampaign?.succeedingCashbackPercentage * 100)}` +  
              ` - ${parseInt(cashbackCampaign?.firstCashbackPercentage * 100)}% ` +
              'cashback!'
            )
          }}
        </div>
        <div >{{ cashbackCampaign?.name }}</div>
        <q-slide-transition>
          <div v-if="showCashbackCampaignDetails" class="text-caption" style="line-height:1.3">
            <div v-if="cashbackLimitFiat">
              <div v-if="cashbackCampaign?.is_one_time_claim">
                {{
                  $t(
                    'MarketplaceCashbackDescOneTime',
                    { percent: parseInt(cashbackCampaign?.firstCashbackPercentage * 100) },
                    `Order now and get ${parseInt(cashbackCampaign?.firstCashbackPercentage * 100)}% cashback!`
                  )
                }}
              </div>
              <div v-else>
                {{
                  $t(
                    'MarketplaceCashbackDesc',
                    {
                      min: parseInt(cashbackCampaign?.succeedingCashbackPercentage * 100),
                      max: parseInt(cashbackCampaign?.firstCashbackPercentage * 100)
                    },
                    `Order now and get ${parseInt(cashbackCampaign?.succeedingCashbackPercentage * 100)}` +  
                    ` - ${parseInt(cashbackCampaign?.firstCashbackPercentage * 100)}% ` +
                    'cashback!'
                  )
                }}
              </div>
              {{
                $t(
                  'MarketplaceCashbackDescSub',
                  { amount: cashbackLimitFiat, currency: currency },
                  `Get up to maximum cashback value of ${cashbackLimitFiat} ${currency}.`
                )
              }}
            </div>
          </div>
        </q-slide-transition>
        <template v-slot:action>
          <q-btn
            v-if="cashbackLimitFiat || cashbackCampaign?.description"
            flat
            padding="xs md"
            no-caps :label="$t('MoreInfo', {}, 'More info')"
            class="q-r-mr-md"
            @click="() => showCashbackCampaignDetails = !showCashbackCampaignDetails"
          />
        </template>
      </q-banner>
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
                      ({{ product?.reviewSummary?.count }}
                      {{ product?.reviewSummary?.count === 1 ? 'review' : 'reviews' }})
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
          {{ $t('NoProducts') }}
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
import { ref, computed, watch, onMounted, onActivated, onDeactivated, watchEffect } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import ReviewsListDialog from 'src/components/marketplace/reviews/ReviewsListDialog.vue'
import StorePickupDialog from 'src/components/marketplace/checkout/StorePickupDialog.vue'
import { debounce } from 'quasar'


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

  deliveryCalculation.value = {
    fee: 0,
    currencySymbol: '',
    distance: 0,
    deliveryDuration: 0,
    preparationDuration: 0,
  }
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
watch(() => props.storefrontId, () => updateDeliveryCalculation())
onActivated(() => updateDeliveryCalculation())
const updateDeliveryCalculation = debounce(() => {
  console.log('Updating delivery calculation')
  const params = {
    storefront_id: props.storefrontId,
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

      bus.emit('marketplace-storefront-delivery-calculation', {
        storefrontId: parseInt(params.storefront_id),
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
watch(selectedCategory, () => fetchProducts())
function fetchProductCategories() {
  const params = { storefront_id: props?.storefrontId }
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

const currency = computed(() => getStorefrontCurrency(props.storefrontId))
function getStorefrontCurrency(storefrontId) {
  return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
}


const showCashbackCampaignDetails = ref(false)
const cashbackCampaign = ref(parseCashbackCampaign())
watch(() => props.storefrontId, () => updateCashbackCampaign({ clearFirst: true }))
async function updateCashbackCampaign(opts= { clearFirst: false }) {
  if (opts?.clearFirst) {
    cashbackCampaign.value = parseCashbackCampaign()
  }
  // const resp = await backend.get('https://engagementhub.paytaca.com/api/cashback/campaign/1/')
  // cashbackCampaign.value = parseCashbackCampaign(resp?.data)
  cashbackCampaign.value = await getCashbackCampaign({ storefrontId: props.storefrontId })
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
      fetchProducts(),
      fetchProductCategories(),
      fetchCollections(),
      updateDeliveryCalculation(),
      reviewsListDialog.value?.fetchReviews?.(),
      updateCashbackCampaign(),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', storefront.value?.id)
    initialized.value = true
    done()
  }
}
</script>