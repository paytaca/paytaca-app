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

    <div class="q-mx-sm q-mt-md">
      <SessionLocationWidget ref="sessionLocationWidget" />
    </div>

    <div class="q-px-sm q-py-sm">
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
      </div>
      <div class="row items-center q-px-sm">
        <q-space/>
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 5,
            rounded: true,
            size: '0.8rem',
            padding: 'sm md',
            boundaryNumbers: true,
            disable: fetchingStorefronts,
            color: 'brandblue',
          }"
          class="q-mb-xs"
          :hide-below-pages="2"
          :modelValue="storefrontsPagination"
          @update:modelValue="fetchStorefronts"
        />
      </div>
      <div v-if="!initialized && fetchingStorefronts" class="row items-center justify-center">
        <q-spinner size="4em" color="brandblue"/>
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
                <q-rating :model-value="1" readonly max="1" size="1em" color="brandblue"/>
                {{ roundRating(storefront?.ordersReviewSummary?.averageRating) }}
                <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                  <div class="row items-center no-wrap">
                    <q-rating
                      readonly
                      max="5"
                      :model-value="roundRating(storefront?.ordersReviewSummary?.averageRating, { forceDecimals: false})"
                      size="1em"
                      color="brandblue"
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
              <q-badge v-if="!storefront?.inPrelaunch && !storefront?.isOpen" color="grey">Closed</q-badge>
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
              <q-badge v-if="storefront?.inPrelaunch" color="brandblue">
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

      <div class="col-12 row items-center q-px-sm q-pt-md">
        <div class="text-h5 q-px-xs">Orders</div>
        <q-space/>
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 5,
            rounded: true,
            padding: 'sm md',
            boundaryNumbers: true,
            disable: fetchingOrders,
          }"
          class="q-my-sm"
          :hide-below-pages="2"
          :modelValue="ordersPagination"
          @update:modelValue="fetchOrders"
        />
      </div>

      <div class="q-mb-md">
        <div v-if="fetchingOrders" class="text-center q-px-md">
          <q-spinner v-if="!orders?.length" size="1.5rem" color="brandblue" class="q-mb-sm"/>
          <q-linear-progress v-else query reverse color="brandblue"/>
        </div>
        <div v-else class="q-mb-xs"></div>

        <div v-if="!orders?.length && initialized" class="text-grey text-center q-mb-md">No active orders</div>
        <div v-else class="q-py-sm">
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
        <div
          v-if="initialized"
          class="row items-center justify-center"
        >
          <q-btn
            flat
            no-caps
            :label="orders?.length ? 'View all' : 'Go to orders'"
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
import { Order, Storefront } from 'src/marketplace/objects'
import { formatDateRelative, formatTimestampToText, getISOWithTimezone, round, roundRating } from 'src/marketplace/utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { computed, ref, onMounted, watch, onActivated } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'
import SessionLocationWidget from 'src/components/marketplace/SessionLocationWidget.vue'
import MarketplaceHeaderMenu from 'src/components/marketplace/MarketplaceHeaderMenu.vue'
import MarketplaceSearch from 'src/components/marketplace/MarketplaceSearch.vue'


const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
window.s = $store

const initialized = ref(false)
function resetPage() {
  storefronts.value = []
  storefrontsPagination.value = { count: 0, limit: 0, offset: 0 }
  orders.value = []
  ordersPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}


onMounted(() => refreshPage())
onActivated(() => {
  if (!initialized.value) return
  fetchOrders()
})

const sessionLocationWidget = ref()
const sessionLocation = computed(() => $store.getters['marketplace/sessionLocation'])
onMounted(async () => {
  if (!sessionLocationWidget.value) {
    if(!sessionLocation.value?.isDeviceLocation && sessionLocation.value?.id) return
    return updateLocation()
      .then(() => $store.commit('marketplace/setSelectedSessionLocationId'))
      .catch(console.error)
  } else {
    sessionLocationWidget.value.openLocationSelector = true
  }

  if(!sessionLocation.value?.isDeviceLocation && sessionLocation.value?.id) return

  setTimeout(async () => {
    await sessionLocationWidget.value
      ?.setCurrentLocation?.({ keepSelectorOpen: true, hideDialogOnError: true })
      ?.catch(console.error)
    if (!sessionLocation.value?.validCoordinates) {
      sessionLocationWidget.value?.updateDeviceLocation({ keepSelectorOpen: true })
    }
  }, 250)
})
const updateLocationPromise = ref()
async function updateLocation() {
  if (!updateLocationPromise.value) {
    updateLocationPromise.value = $store.dispatch('marketplace/updateLocation', { maxAge: 60 * 1000 })
      .finally(() => updateLocationPromise.value = undefined)
  }

  return updateLocationPromise.value
}


const customerCoordinates = computed(() => $store.getters['marketplace/customerCoordinates'])
watch(customerCoordinates, () => fetchStorefronts())

const fetchingStorefronts = ref(false)
const storefronts = ref([].map(Storefront.parse))
const storefrontsPagination = ref({ count: 0, limit: 0, offset: 0 })
const storefrontListOpts = computed(() => {
  const data = {
    radius: ($store.getters['marketplace/shopListOpts']?.radius || 30) * 1000,
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
    },
    color: 'brandblue',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  })
  .onOk(data => $store.commit('marketplace/setShopListOpts', { radius: parseFloat(data) }))
}
async function fetchStorefronts(opts={ limit: 0, offset: 0 }) {
  await updateLocationPromise.value
  const params = {
    limit: opts?.limit || 6,
    offset: opts?.offset || undefined,
    distance: '',
    active: true,
    annotate_is_open_at: getISOWithTimezone(new Date()),
    ordering: 'in_prelaunch,-is_open',
  }
  if (!isNaN(customerCoordinates.value?.latitude) && !isNaN(customerCoordinates.value.longitude)) {
    params.distance = btoa(JSON.stringify({
      lat: customerCoordinates.value?.latitude,
      lon: customerCoordinates.value?.longitude,
      radius: storefrontListOpts.value?.radius,
    }))
    params.ordering = [params.ordering, 'distance'].join(',')
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
    limit: opts?.limit || 10,
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

async function refreshPage(done=() => {}) {
  try {
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
table.orders-table {
  border-spacing: map-get($space-xs, "x") map-get($space-sm, "y");
}
table.orders-table td {
  vertical-align: top;
}
</style>
