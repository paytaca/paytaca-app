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
    <div v-if="!initialized" class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="q-px-sm text-h5 q-space">Order</div>
      <div v-if="fetchingOrder" class="text-center">
        <q-spinner size="3em"/>
      </div>
    </div>
    <div v-else class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div>
        <div class="row items-start q-px-sm">
          <div class="text-h5 q-space">Order</div>
          <q-chip v-if="order?.formattedStatus" :color="order?.statusColor" text-color="white">
            {{ order?.formattedStatus }}
          </q-chip>
        </div>
      </div>
      <div class="q-px-sm text-caption text-grey">#{{ order.id }}</div>
      <div class="row items-start items-delivery-address-panel">
        <div v-if="order?.deliveryAddress?.id" class="col-12 col-sm-4 q-pa-xs">
          <q-card
            :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-px-md q-py-sm']"
          >
            <div class="text-subtitle1">Delivery</div>
            <q-separator :dark="darkMode"/>
            <div>
              {{ order?.deliveryAddress?.firstName }}
              {{ order?.deliveryAddress?.lastName }}
            </div>
            <div>{{ order?.deliveryAddress?.phoneNumber }}</div>
            <div @click="() => displayDeliveryAddressLocation()">
              <div>{{ order?.deliveryAddress?.location?.formatted }}</div>
              <q-btn
                v-if="order?.deliveryAddress?.location?.validCoordinates"
                flat
                padding="none"
                no-caps
                label="View location"
                class="text-underline"
              />
            </div>
            <div v-if="delivery?.id" class="q-mt-sm">
              <q-separator :dark="darkMode"/>
              <div>
                <div class="text-subtitle1">Delivery status</div>
                <div class="text-caption bottom">Delivery #{{ delivery?.id }}</div>
                <div v-if="delivery?.rider?.id" class="q-mt-xs">
                  <div class="text-subtitle2">
                    Rider
                    <q-icon v-if="delivery?.activeRiderId" name="check_circle" size="1.25em" color="green">
                      <q-menu
                        :class="[
                          'q-pa-sm',
                          darkMode ? 'pt-dark' : 'text-black',
                        ]"
                      >
                        Rider has accepted delivery
                      </q-menu>
                    </q-icon>
                  </div>
                  <div class="row items-start q-gutter-x-xs">
                    <div>{{ delivery?.rider?.firstName }} {{ delivery?.rider?.lastName }}</div>
                    <div>{{ delivery?.rider?.phoneNumber }}</div>
                  </div>
                </div>
                <div v-else class="text-grey">No rider yet</div>
              </div>
            </div>
          </q-card>
        </div>
        <div class="q-pa-xs q-space">
          <q-card
            :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-pa-sm']"
          >
            <div class="q-px-sm">
              <div class="text-subtitle1">Items</div>
              <q-separator :dark="darkMode"/>
            </div>
            <table class="full-width items-table">
              <tr>
                <th class="full-width">Item</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
              </tr>
              <tr v-for="orderItem in order?.items" :key="orderItem?.id">
                <td>
                  <q-btn
                    flat no-caps
                    padding="none"
                    :to="{
                      name: 'app-marketplace-product',
                      params: { productId: orderItem?.variant?.product?.id },
                      query: { variantId: orderItem?.variant?.id },
                    }"
                  >
                    <div class="row items-center justify-left no-wrap full-width text-left">
                      <q-img
                        v-if="orderItem?.variant?.itemImage"
                        :src="orderItem?.variant?.itemImage"
                        width="35px"
                        ratio="1"
                        class="rounded-borders q-mr-xs"
                      />
                      <div>{{ orderItem?.variant?.itemName }}</div>
                    </div>
                  </q-btn>
                </td>
                <td class="text-center" style="white-space:nowrap;">{{ orderItem?.quantity }}</td>
                <td class="text-center" style="white-space:nowrap;">{{ orderItem?.variant?.price }} {{ orderCurrency }}</td>
                <td class="text-center" style="white-space:nowrap;">{{ orderItem?.variant?.price * orderItem?.quantity }} {{ orderCurrency }}</td>
              </tr>
            </table>
          </q-card>
        </div>
      </div>

      <div class="q-px-xs" @click="toggleAmountsDisplay">
        <div class="row items-start text-subtitle2">
          <div class="q-space">Subtotal</div>
          <div v-if="displayBch">{{ orderAmounts.subtotal.bch }} BCH</div>
          <div v-else>{{ orderAmounts.subtotal.currency }} {{ orderCurrency }}</div>
        </div>
        <div class="row items-start text-subtitle2">
          <div class="q-space">Delivery fee</div>
          <div v-if="displayBch">{{ orderAmounts.deliveryFee.bch }} BCH</div>
          <div v-else>{{ orderAmounts.deliveryFee.currency }} {{ orderCurrency }}</div>
        </div>
        <div class="row items-start text-h6">
          <div class="q-space">Total</div>
          <div v-if="displayBch">{{ orderAmounts.total.bch }} BCH</div>
          <div v-else>{{ orderAmounts.total.currency }} {{ orderCurrency }}</div>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { Delivery, Order } from 'src/marketplace/objects'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

const props = defineProps({
  orderId: [String, Number],  
})

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

onMounted(() => refreshPage())
const initialized = ref(false)
function resetPage() {
  initialized.value = false
  order.value.raw = null
}
watch(
  () => [props.orderId],
  () => {
    resetPage()
    refreshPage()
  }
)

const delivery = ref(Delivery.parse())
const fetchingDelivery = ref(false)
function fetchDelivery() {
  if (!props.orderId) return Promise.reject()
  const params = { order_id: props.orderId }

  fetchingDelivery.value = true
  return backend.get(`connecta-express/deliveries/`, { params })
    .then(response => {
      const data = response?.data?.results?.[0]
      delivery.value = Delivery.parse(data)
      return response
    })
    .finally(() => {
      fetchingDelivery.value = false
    })
}

const order = ref(Order.parse())
watch(
  () => [order.value?.storefrontId],
  () => {
    if (!order.value?.storefrontId) return
    $store.commit('marketplace/setActiveStorefrontId', order.value?.storefrontId)
  }
  )
const fetchingOrder = ref(false)
const orderCurrency = computed(() => order.value?.currency?.symbol)
const orderBchPrice = computed(() => order.value?.bchPrice?.price || undefined)
function fetchOrder() {
  if (!props.orderId) return Promise.reject()
  fetchingOrder.value = true
  return backend.get(`connecta/orders/${props.orderId}/`)
    .then(response => {
      order.value = Order.parse(response?.data)
      return response
    })
    .finally(() => {
      fetchingOrder.value = false
    })
}

const orderAmounts = computed(() => {
  const parseBch = num => Math.floor(num * 10 ** 8) / 10 ** 8
  const data = {
    subtotal: { currency: order.value?.subtotal || 0, bch: 0 },
    deliveryFee: { currency: order.value?.payment?.deliveryFee || 0, bch: 0 },
    total: { currency: 0, bch: 0 },
  }
  data.total.currency = Number(data.subtotal.currency) + Number(data.deliveryFee.currency)
  data.total.currency = Math.round(data.total.currency * 10 ** 3) / 10 ** 3

  if(!isNaN(orderBchPrice.value)) {
    data.subtotal.bch = parseBch(data.subtotal.currency / orderBchPrice.value)
    data.deliveryFee.bch = parseBch(data.deliveryFee.currency / orderBchPrice.value)
    data.total.bch = parseBch(data.total.currency / orderBchPrice.value)
  } else {
    data.subtotal.bch = null
    data.deliveryFee.bch = null
    data.total.bch = null
  }

  return data
})
const displayBch = ref(false)
function toggleAmountsDisplay() {
  if (isNaN(orderBchPrice.value)) {
    displayBch.value = false
    return
  }
  displayBch.value = !displayBch.value
}


function displayDeliveryAddressLocation() {
  if (!order.value?.deliveryAddress?.location?.validCoordinates) return

  return displayCoordinates({
    latitude: Number(order.value?.deliveryAddress?.location?.latitude),
    longitude: Number(order.value?.deliveryAddress?.location?.longitude),
  })
}

function displayCoordinates(opts={latitude: 0, longitude: 0, headerText: undefined }) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      static: true,
      headerText: opts?.headerText,
      initLocation: { latitude: opts?.latitude, longitude: opts?.longitude }
    }
  })
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchOrder(),
      fetchDelivery(),
    ])
  } finally {
    initialized.value = true
    done()
  }
}
</script>
<style scoped>
table.items-table {
  border-spacing: 4px;
}
table.items-table td {
  vertical-align: top;
}
</style>
<style scoped lang="scss">
@media (min-width: $breakpoint-xs) {
  .items-delivery-address-panel {
    flex-direction: row-reverse;
  }
}
</style>
