<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="col-12 row items-center q-px-sm">
        <div class="text-h5">Orders</div>
        <q-space/>
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 5,
            rounded: true,
            size: 'sm',
            padding: 'sm md',
            boundaryNumbers: true,
            disable: fetchingOrders,
            color: 'pt-primary1',
          }"
          class="q-my-sm"
          :hide-below-pages="2"
          :modelValue="ordersPagination"
          @update:modelValue="fetchOrders"
        />
      </div>
      <div v-if="storefront?.id" class="text-caption bottom q-mb-md q-px-sm">
        {{ storefront?.name }}
      </div>

      <div v-if="!initialized && fetchingOrders" class="text-center">
        <q-spinner size="3rem" color="pt-primary1"/>
      </div>
      <div v-if="initialized" class="q-mb-md">
        <q-linear-progress v-if="fetchingOrders" query reverse rounded color="pt-primary1"/>
        <div v-else class="q-mb-xs"></div>
        <div v-if="!orders?.length" class="text-grey text-center">No orders</div>
        <q-card v-else class="q-py-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
          <q-list separator >
            <q-item
              v-for="order in orders" :key="order?.id"
              v-ripple
              clickable
              :to="{ name: 'app-marketplace-order', params: { orderId: order?.id } }"
            >
              <q-item-section top>
                <q-item-label>
                  Order#{{ order?.id }}
                  <q-badge
                    v-if="order?.formattedStatus"
                    :color="order?.statusColor"
                    text-color="white"
                  >
                    {{ order?.formattedStatus }}
                  </q-badge>
                </q-item-label>
                <q-item-label v-if="storefront?.id != order?.storefront?.id">
                  {{ order?.storefront?.name }}
                </q-item-label>
              </q-item-section>
              <q-item-section avatar top>
                <q-item-label>
                  {{ formatDateRelative(order?.createdAt) }}
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
import { Order, Storefront } from 'src/marketplace/objects'
import { backend } from 'src/marketplace/backend'
import { formatDateRelative } from 'src/marketplace/utils'
import { useStore } from 'vuex'
import { computed, onActivated, onMounted, ref, watch } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'

const props = defineProps({
  storefrontId: [Number, String],
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

onMounted(() => refreshPage())
onActivated(() => {
  if (!initialized.value) return
  refreshPage()
})
watch(() => [props.storefrontId], () => {
  resetPage()
  refreshPage()
})

const initialized = ref(false)
function resetPage() {
  orders.value = []
  ordersPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}

const storefront = ref(Storefront.parse())
async function setStorefront(storefrontId) {
  const _storefront = $store.getters['marketplace/getStorefront'](storefrontId)
  storefront.value = _storefront
  if (!storefront.value?.id && storefrontId) {
    const response = await backend.get(`connecta/storefronts/${storefrontId}/`)
    storefront.value = Storefront.parse(response?.data)
    $store.commit('marketplace/cacheStorefront', reponse?.data)
  }

  $store.commit('marketplace/setActiveStorefrontId', storefront.value?.id)
  return storefront.value
}

const fetchingOrders = ref(false)
const orders = ref([].map(Order.parse))
const ordersPagination = ref({ count: 0, limit: 0, offset: 0 })
async function fetchOrders(opts={limit: 0, offset: 0 }) {
  console.log('storefront id: ', props.storefrontId)
  const params = {
    ref: await $store.dispatch('marketplace/getCartRef'),
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
    storefront_id: props.storefrontId || undefined,
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

        if (order.storefront) return

        order.fetchStorefront()?.then(() => {
          $store.commit('marketplace/cacheStorefront', order.storefront?.raw)
        })
      })
      ordersPagination.value.count = response?.data?.count
      ordersPagination.value.limit = response?.data?.limit
      ordersPagination.value.offset = response?.data?.offset
      setStorefront(params.storefront_id)
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
