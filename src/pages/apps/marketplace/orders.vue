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

      <div v-if="initialized" class="q-mb-md">
        <div v-if="!orders?.length" class="text-grey text-center">No orders</div>
        <q-card v-else class="q-py-sm" :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
          <q-list separator >
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
        </q-card>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { Order } from 'src/marketplace/objects'
import { backend } from 'src/marketplace/backend'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'

const $route = useRoute()
watch(() => [$route.name], () => {
  if ($route.name === 'app-marketplace-orders') fetchOrders()
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  orders.value = []
  ordersPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}

onMounted(() => refreshPage())

const fetchingOrders = ref(false)
const orders = ref([].map(Order.parse))
const ordersPagination = ref({ count: 0, limit: 0, offset: 0 })
async function fetchOrders(opts={limit: 0, offset: 0 }) {
  const params = {
    ref: await $store.dispatch('marketplace/getCartRef'),
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
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
      fetchOrders(),
    ])
  } finally {
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
