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

    <div class="q-mx-sm q-my-sm">
      <SessionLocationWidget ref="sessionLocationWidget" />
    </div>

    <div
      class="q-px-md q-pt-xs q-pb-md sticky-below-header"
      :class="$q.platform.is.ios ? 'sticky-below-header--ios' : ''"
    >
      <MarketplaceSearch :customer-coordinates="customerCoordinates"/>
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
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 3,
            rounded: true,
            size: '0.8rem',
            padding: '0.3rem 0.8rem',
            boundaryNumbers: true,
            disable: fetchingStorefronts,
            color: 'pt-primary1',
          }"
          class="q-mb-xs"
          :hide-below-pages="2"
          :modelValue="storefrontsPagination"
          @update:modelValue="fetchStorefronts"
        />
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
      <div v-if="(!initialized || !storefronts.length) && fetchingStorefronts" class="row items-center justify-center">
        <q-spinner size="4em" color="pt-primary1"/>
      </div>
      <div class="row items-start justify-start q-mb-md">
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
            <q-img :src="storefront?.imageUrl || noImage" ratio="1.75"/>
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
      </div>

      <div
        v-intersection="ordersPanelIntersectionOptions"
        class="q-mb-md q-pt-md"
        :class="[orders.length ? 'orders--sticky-bottom' : '', getDarkModeClass(darkMode)]"
      >
        <div class="col-12 row items-center q-px-sm">
          <div class="text-h5 q-px-xs">Orders</div>
          <q-space/>
          <q-btn
            v-if="orders.length < ordersPagination.count"
            flat
            no-caps
            label="View all"
            :to="{ name: 'app-marketplace-orders'}"
          />
          
        </div>
        <div v-if="fetchingOrders" class="text-center q-px-md">
          <q-spinner v-if="!orders?.length" size="1.5rem" color="pt-primary1" class="q-mb-sm"/>
          <q-linear-progress v-else query reverse color="pt-primary1"/>
        </div>
        <div v-else class="q-mb-xs"></div>

        <div v-if="!orders?.length && initialized" class="text-grey text-center q-mb-md">No active orders</div>
        <div v-else class="q-py-sm orders-list">
          <q-list separator>
            <q-item
              v-for="order in orders" :key="order?.id"
              v-ripple
              clickable
              :to="{ name: 'app-marketplace-order', params: { orderId: order?.id } }"
            >
              <q-item-section>
                <q-item-label>
                  Order#{{ order?.id }}
                </q-item-label>
                <q-item-label>
                  {{ order?.storefront?.name }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar top>
                <q-item-label>

                  <q-badge v-if="order?.formattedStatus" :color="order?.statusColor" text-color="white">
                    {{ order?.formattedStatus }}
                  </q-badge>
                </q-item-label>
                <q-item-label>
                  {{ Number(order?.total).toFixed(2) }}
                  {{ order?.currency?.symbol }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div v-if="!orders.length" class="row items-center justify-center">
          <q-btn
            flat
            no-caps
            label="Go to orders"
            align="left"
            padding="none xs"
            class="text-underline text-weight-bold button button-text-primary"
            :class="getDarkModeClass(darkMode)"
            :to="{ name: 'app-marketplace-orders'}"
          />
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Order, Storefront, Checkout } from 'src/marketplace/objects'
import { formatDateRelative, formatTimestampToText, getISOWithTimezone, round, roundRating } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { bus } from 'src/wallet/event-bus'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, ref, onMounted, watch, nextTick, onActivated, onUnmounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import SessionLocationWidget from 'src/components/marketplace/SessionLocationWidget.vue'
import MarketplaceHeaderMenu from 'src/components/marketplace/MarketplaceHeaderMenu.vue'
import MarketplaceSearch from 'src/components/marketplace/MarketplaceSearch.vue'


const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  storefronts.value = []
  storefrontsPagination.value = { count: 0, limit: 0, offset: 0 }
  orders.value = []
  ordersPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}


// add delay to get loadAppPromise from MarketplaceLayout to initialize
onMounted(() => setTimeout(() => refreshPage(), 100))
onActivated(() => {
  if (!initialized.value) return
  fetchOrders()
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
const sessionLocationWidget = ref()
function manualSelectLocation() {
  if (!sessionLocationWidget.value) return
  sessionLocationWidget.value.openLocationSelector = true
  nextTick(() => {
    sessionLocationWidget.value?.updateDeviceLocation?.()
  })
}


const customerCoordinates = computed(() => $store.getters['marketplace/customerCoordinates'])
watch(customerCoordinates, () => fetchStorefronts())
const customerCoordinatesValid = computed(() => {
  return !Number.isNaN(customerCoordinates.value?.latitude) &&
         !Number.isNaN(customerCoordinates.value.longitude)
})

const fetchingStorefronts = ref(false)
const storefronts = ref([].map(Storefront.parse))
const storefrontsPagination = ref({ count: 0, limit: 0, offset: 0 })
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
watch(storefrontListOpts, () => fetchStorefronts(), { deep: true })
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
async function fetchStorefronts(opts={ limit: 0, offset: 0 }) {
  const params = {
    limit: opts?.limit || 6,
    offset: opts?.offset || undefined,
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

  fetchingStorefronts.value = true
  return backend.get(`connecta/storefronts/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      storefronts.value = response?.data?.results.map(storefrontData => {
        $store.commit('marketplace/cacheStorefront', storefrontData)
        return Storefront.parse(storefrontData)
      })
      storefrontsPagination.value.count = response?.data?.count
      storefrontsPagination.value.limit = response?.data?.limit
      storefrontsPagination.value.offset = response?.data?.offset
    })
    .finally(() => {
      fetchingStorefronts.value = false
    })
}

const fetchingOrders = ref(false)
const orders = ref([].map(Order.parse))
const ordersPagination = ref({ count: 0, limit: 0, offset: 0 })
async function fetchOrders(opts = { limit: 0, offset: 0 }) {
  const params = {
    ref: await $store.dispatch('marketplace/getCartRef'),
    limit: opts?.limit || 2,
    offset: opts?.offset || undefined,
    exclude_statuses: ['completed', 'cancelled'].join(','),
  }
  fetchingOrders.value = true
  return backend.get(`connecta/orders/`, { params })
    .then(response => {
      if(!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      orders.value = response?.data?.results?.map(Order.parse)

      orders.value.forEach(order => {
        if (!order?.storefrontId) return
        order.storefront = $store.getters['marketplace/storefronts']
          .find(storefront => storefront?.id == order?.storefrontId)
        if (!order.storefront) order.fetchStorefront()
      })
      ordersPagination.value.count = response?.data?.count
      ordersPagination.value.limit = response?.data?.limit
      ordersPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingOrders.value = false
    })
}

const ordersPanelIntersectionOptions = {
  /**
   * @param {IntersectionObserverEntry} observerEntry 
   */
  handler(observerEntry) {
    const stuckStateClasses = [
      'orders--sticky-bottom--stuck',
      'q-r-mx-md',
      'q-px-sm',
      'br-15',
      'shadow-2',
      'pt-card'
    ]
    const target = observerEntry.target
    const hasStickyBottom = target.classList.contains('orders--sticky-bottom')
    
    if (observerEntry.intersectionRatio < 0.95 && hasStickyBottom) {
      observerEntry.target.classList.add(...stuckStateClasses)
    } else {
      observerEntry.target.classList.remove(...stuckStateClasses)
    }
  },
  cfg: {
    threshold: new Array(100).fill(0).map((e, index) => index / 100)
  }
}

async function refreshPage(done=() => {}) {
  try {
    await loadAppPromise.value
    if (initialized.value && !customerCoordinatesValid.value) await manualSelectLocation()
    await Promise.all([
      fetchStorefronts(),
      fetchOrders(),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', null)
    initialized.value = true
    done()
  }
}
</script>
<style scoped lang="scss">
@import '/src/css/shared.scss'; // Using this should get you the variables
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
.sticky-below-header.sticky-below-header--ios {
  top: 110px;
}

.orders--sticky-bottom {
  position: sticky;
  bottom: -20px;
  left: 0;
  right: 0;
  padding-bottom: 30px;
  transition: all 0.15s ease-out;
}

.orders--sticky-bottom.orders--sticky-bottom--stuck {
  .orders-list {
    max-height: 20vh;
    overflow-y: auto;
  }
}

.orders--sticky-bottom.orders--sticky-bottom--stuck {
  @extend .shadow-2 !optional;
}

#app-container.dark {
  .orders--sticky-bottom.orders--sticky-bottom--stuck {
    background-color: $brand_dark;
  }
}
#app-container.light {
  .orders--sticky-bottom.orders--sticky-bottom--stuck {
    background-color: $brand_light;
  }
}

</style>
