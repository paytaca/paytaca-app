<template>
  <q-pull-to-refresh
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Marketplace"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />
    <div class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="text-h5 q-px-xs">Shops</div>
      <div v-if="!initialized && fetchingStorefronts" class="row items-center justify-center">
        <q-spinner size="4em" color="brandblue"/>
      </div>
      <div class="row items-start justify-start q-mb-md">
        <div v-for="storefront in storefronts" :key="storefront?.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            :class="[darkMode ? 'pt-dark-card': 'text-black']"
            @click="$router.push({ name: 'app-marketplace-storefront', params: { storefrontId: storefront?.id }})"
          >
            <q-img :src="storefront?.imageUrl || noImage" ratio="1.75"/>
            <q-card-section class="q-py-sm">
              <div class="ellipsis-3-lines">{{ storefront.name }}</div>
              <div class="row items-start text-caption no-wrap">
                <div>
                  <q-icon name="location_on"/>
                </div>
                <div>
                  {{ [storefront?.location?.city, storefront?.location?.state || storefront?.location?.country].filter(Boolean).join(', ') }}
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      
      <div class="col-12 row items-center q-px-sm">
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
        <div v-if="!orders?.length && initialized" class="text-grey text-center q-mb-md">No active orders</div>
        <div v-else class="q-py-sm">
          <q-list separator >
            <q-item
              v-for="order in orders" :key="order?.id"
              v-ripple
              clickable
              :to="{ name: 'app-marketplace-order', params: { orderId: order?.id } }"
            >
              <q-item-section>
                <q-item-label>
                  #{{ order?.id }}
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
            class="text-underline"
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
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { computed, ref, onMounted, watch } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'

const $route = useRoute()
watch(() => [$route.name], () => {
  if ($route.name === 'app-marketplace') fetchOrders()
})


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

onMounted(() => refreshPage())

const fetchingStorefronts = ref(false)
const storefronts = ref([].map(Storefront.parse))
const storefrontsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchStorefronts(opts={ limit: 0, offset: 0 }) {
  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
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
    exclude_statuses: 'completed',
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