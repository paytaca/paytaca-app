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
      <div class="row items-start no-wrap q-px-sm">
        <div class="q-space row items-start">
          <div class="text-h5 q-space">Order</div>
          <div style="margin-left:-4px;">
            <q-chip
              :color="parsePaymentStatusColor(order?.paymentStatus)"
              class="text-weight-medium text-white"
              clickable
              @click="() => showPaymentsDialog = true"
            >
              {{ order?.formattedPaymentStatus }}
            </q-chip>
            <q-chip v-if="order?.formattedStatus" :color="order?.statusColor" text-color="white" class="text-weight-medium">
              {{ order?.formattedStatus }}
            </q-chip>
          </div>
        </div>
        <q-btn flat icon="more_vert" padding="xs" rounded class="q-r-mr-md">
          <q-menu :class="[ darkMode ? 'pt-dark' : 'text-black' ]">
            <q-item
              v-close-popup clickable
              @click="() => showPaymentsDialog = true"
            >
              <q-item-section>
                <q-item-label>
                  View Payments
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-menu>
        </q-btn>
      </div>
      <div class="row items-center q-px-sm">
        <div v-if="order?.createdAt" class="text-caption text-grey q-space">
          {{ formatTimestampToText(order?.createdAt) }}
        </div>
        <div class="text-caption text-grey">#{{ order.id }}</div>
      </div>
      <q-banner v-if="order?.isCancelled && order?.cancelReason" class="text-white bg-red q-ma-sm rounded-borders">
        <div class="text-caption top">Cancel reason:</div>
        <div class="q-mt-xs">{{ order?.cancelReason }}</div>
      </q-banner>
      <template v-if="order?.balanceToPay > 0 && !order?.isCancelled">
        <q-banner
          :class="['q-mx-xs q-my-sm', darkMode ? 'pt-dark-card text-white' : '']"
        >
          <div class="row items-center">
            <div>
              <div class="text-caption top">
                Balance to pay
                <span v-if="payment?.id" class="text-grey">#{{ payment?.id }}</span>
              </div>
              <q-space/>
              <div class="text-subtitle1">{{ order?.balanceToPay }} {{ orderCurrency }}</div>
            </div>
            <q-space/>
            <q-btn
              rounded
              outlined
              :loading="creatingPayment"
              no-caps label="Pay"
              color="brandblue"
              padding="1px md"
              @click="() => showPaymentDialog = true"
            />
          </div>
        </q-banner>
      </template>
      <q-banner
        v-if="order?.status == 'delivered'" rounded
        :class="['q-mx-xs q-my-sm', darkMode ? 'pt-dark-card text-white' : '']"
      >
        <div class="row items-center q-gutter-y-sm">
          <div>
            <div>
              Order delivered!
              <q-spinner v-if="completingOrder"/>
            </div>
            <div class="text-caption text-grey">Review your order and mark completed if there are no problems</div>
          </div>
          <q-space/>
          <q-btn
            rounded
            no-caps
            :loading="completingOrder"
            label="Order Complete"
            color="brandblue"
            padding="1px sm"
            @click="() => completeOrder()"
          />
        </div>
      </q-banner>
      <div class="row items-start items-delivery-address-panel">
        <div v-if="order?.deliveryAddress?.id" class="col-12 col-sm-4 q-pa-xs">
          <q-card
            :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-px-md q-py-sm']"
          >
            <q-btn
              flat
              padding="none"
              no-caps
              label="Open Map"
              class="float-right q-mt-xs"
              @click="() => showMap = true"
            />
            <LeafletMapDialog v-model="showMap" :locations="mapLocations"/>
            <div class="text-subtitle1">Delivery</div>
            <q-separator :dark="darkMode"/>
            <div>
              {{ order?.deliveryAddress?.firstName }}
              {{ order?.deliveryAddress?.lastName }}
            </div>
            <div>{{ order?.deliveryAddress?.phoneNumber }}</div>
            <div>{{ order?.deliveryAddress?.location?.formatted }}</div>
            <div v-if="delivery?.id" class="q-mt-sm">
              <q-separator :dark="darkMode"/>
              <div>
                <div class="q-mt-xs float-right">
                  <q-icon v-if="delivery?.activeRiderId" name="check_circle" size="1.5em" color="green">
                    <q-menu :class="[ 'q-pa-sm', darkMode ? 'pt-dark' : 'text-black' ]">
                      Rider has accepted delivery
                      <span v-if="delivery?.acceptedAt">({{  formatDateRelative(delivery?.acceptedAt) }})</span>
                    </q-menu>
                  </q-icon>
                  <q-icon
                    v-if="delivery?.pickedUpAt || delivery?.deliveredAt"
                    name="delivery_dining"
                    size="2em"
                    :color="delivery?.deliveredAt ? 'green' : 'amber'"
                    class="q-mx-sm"
                  >
                    <q-menu :class="[ 'q-pa-sm', darkMode ? 'pt-dark' : 'text-black' ]">
                      <div v-if="delivery.pickedUpAt">
                        Picked up {{ formatDateRelative(delivery.pickedUpAt) }}
                      </div>
                      <div v-if="delivery.deliveredAt">
                        Delivered {{ formatDateRelative(delivery.deliveredAt) }}
                      </div>
                    </q-menu>
                  </q-icon>
                </div>
                <div class="text-subtitle1">Delivery status</div>
                <div class="text-caption bottom">Delivery #{{ delivery?.id }}</div>
                <div v-if="delivery?.rider?.id" class="q-mt-xs">
                  <div class="text-subtitle2">Rider</div>
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
                <td class="text-center" style="white-space:nowrap;">{{ orderItem?.displayPrice }} {{ orderCurrency }}</td>
                <td class="text-center" style="white-space:nowrap;">{{ orderItem?.displayPrice * orderItem?.quantity }} {{ orderCurrency }}</td>
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

        <template v-if="orderAmounts.totalPaid.currency || orderAmounts.totalPendingPayment.currency">
          <q-separator :dark="darkMode"/>
          <div class="row items-start text-body1">
            <div class="q-space">Total Paid</div>
            <div v-if="displayBch">{{ orderAmounts.totalPaid.bch || 0 }} BCH</div>
            <div v-else>{{ orderAmounts.totalPaid.currency || 0 }} {{ orderCurrency }}</div>
          </div>
          <div
            v-if="orderAmounts.totalPendingPayment.currency"
            class="row items-start text-grey"
            @click.stop
          >
            <div class="q-space">Pending amount</div>
            <div v-if="displayBch">{{ orderAmounts.totalPendingPayment.bch }} BCH</div>
            <div v-else>{{ orderAmounts.totalPendingPayment.currency }} {{ orderCurrency }}</div>
            <q-menu :class="[ 'q-pa-md', darkMode ? 'pt-dark' : 'text-black' ]">
              Amount sent by customer but not yet received
            </q-menu>
          </div>
          <template v-if="orderAmounts.totalRefunded.currency">
            <div class="row items-start text-grey" @click.stop>
              <div class="q-space">Total refunded</div>
              <div v-if="displayBch">{{ orderAmounts.totalRefunded.bch }} BCH</div>
              <div v-else>{{ orderAmounts.totalRefunded.currency }} {{ orderCurrency }}</div>
            </div>
            <div class="row items-start text-body1" @click.stop>
              <div class="q-space">Net paid</div>
              <div v-if="displayBch">{{ orderAmounts.netPaid.bch }} BCH</div>
              <div v-else>{{ orderAmounts.netPaid.currency }} {{ orderCurrency }}</div>
            </div>
          </template>
          <div
            v-if="orderAmounts.change.currency"
            class="row items-start text-h6"
            @click.stop
          >
            <div class="q-space">Change</div>
            <div v-if="displayBch">{{ orderAmounts.change.bch }} BCH</div>
            <div v-else>{{ orderAmounts.change.currency }} {{ orderCurrency }}</div>
          </div>
        </template>
      </div>
    </div>
    <OrderPaymentsDialog v-model="showPaymentsDialog" :payments="payments"/>
    <q-dialog v-model="showPaymentDialog" position="bottom">
      <q-card :class="[darkMode ? 'text-white pt-dark-card' : 'text-black']">
        <q-card-section>
          <div class="row no-wrap items-center justify-center">
            <div class="text-h6 q-mt-sm">Payment</div>
            <q-space/>
            <q-btn flat padding="sm" icon="close" v-close-popup />
          </div>
          <div class="row items-center q-mb-xs">
            <q-btn
              flat padding="xs"
              no-caps label="Payment details"
              class="text-underline"
              @click="() => showBchPaymentEscrowContract()"
            />
            <q-space/>
            <q-btn
              flat padding="xs"
              icon="content_copy"
              no-caps label="Copy link"
              @click.stop="() => copyToClipboard(bchPaymentData?.url)"
            />
          </div>
          <div class="row items-center justify-center">
            <div class="col-qr-code">
              <q-skeleton v-if="creatingPayment" height="250px" width="250px"/>
              <qr-code v-else :text="bchPaymentData?.url" :size="250"/>
            </div>
          </div>
          <div v-if="creatingPayment" class="q-gutter-sm column items-center q-mt-sm">
            <q-skeleton height="1.5em" width="10em"/>
            <q-skeleton height="1em" width="8em"/>
            <q-skeleton height="2.5em" width="100%"/>
          </div>
          <div v-else class="text-center">
            <div class="text-h6">{{ bchPaymentData?.bchAmount }} BCH</div>
            <div v-if="bchPaymentData?.fiatAmount" class="text-subtitle1" style="line-height:0.75em;">
              {{ bchPaymentData?.fiatAmount }} {{ bchPaymentData?.currency }}
            </div>
            <div class="text-subtitle2" style="word-break: break-all;">{{ bchPaymentData?.address }}</div>
          </div>
          <div class="text-caption q-mt-sm">
            Balance: {{ bchWalletBalance }} BCH
          </div>
        </q-card-section>
        <DragSlide v-if="!creatingPayment" disable-absolute-bottom @swiped="onSendBchPaymentSwipe"/>
      </q-card>
    </q-dialog>
    <q-dialog v-model="showOrderCompletedPrompt">
      <q-card :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'rounded-borders']">
        <q-btn flat icon="close" padding="sm" class="float-right" style="z-index:100;" v-close-popup/>
        <q-card-section class="text-center">
          <div class="text-h5">Order Complete</div>
          <q-icon name="check_circle" color="green" size="5rem"/>
          <div>Order has been completed, thank you for using our service!</div>
          <q-btn
            no-caps label="Go to marketplace"
            color="brandblue"
            padding="2px md"
            class="q-mt-md"
            v-close-popup
            :to="{ name: 'app-marketplace' }"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-pull-to-refresh>
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { marketplaceRpc } from 'src/marketplace/rpc'
import { Delivery, Order, Payment, Storefront } from 'src/marketplace/objects'
import { errorParser, formatDateRelative, formatTimestampToText, parsePaymentStatusColor } from 'src/marketplace/utils'
import { debounce, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted, inject, onActivated, onDeactivated } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import LeafletMapDialog from 'src/components/LeafletMapDialog.vue'
import OrderPaymentsDialog from 'src/components/marketplace/order-payments-dialog.vue'
import EscrowContractDialog from 'src/components/marketplace/escrow-contract-dialog.vue'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { loadWallet, Wallet } from 'src/wallet'
import { TransactionListener } from 'src/wallet/transaction-listener'

const props = defineProps({
  orderId: [String, Number],  
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const $q = useQuasar()

onMounted(() => refreshPage())
const initialized = ref(false)
function resetPage() {
  initialized.value = false
  order.value.raw = null
  delivery.value = Delivery.parse()
  payments.value = []
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
const storefrontId = computed(() => order.value?.storefrontId)
watch(storefrontId,() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})
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
    subtotal: { currency: order.value?.markupSubtotal || 0, bch: 0 },
    deliveryFee: { currency: order.value?.payment?.deliveryFee || 0, bch: 0 },
    total: { currency: order.value?.total, bch: 0 },
    totalPaid: { currency: parseFloat(order.value?.totalPaid), bch: 0 },
    totalPendingPayment: { currency: parseFloat(order.value?.totalPendingPayment), bch: 0 },
    totalRefunded: { currency: parseFloat(order.value?.totalRefunded), bch: 0 },
    netPaid: { currency: parseFloat(order.value?.netPaid), bch: 0 },
    change: { currency: parseFloat(order.value.change), bch: 0}
  }

  if(!isNaN(orderBchPrice.value)) {
    data.subtotal.bch = parseBch(data.subtotal.currency / orderBchPrice.value)
    data.deliveryFee.bch = parseBch(data.deliveryFee.currency / orderBchPrice.value)
    data.total.bch = parseBch(data.total.currency / orderBchPrice.value)
    data.totalPaid.bch = parseBch(data.totalPaid.currency / orderBchPrice.value)
    data.totalPendingPayment.bch = parseBch(data.totalPendingPayment.currency / orderBchPrice.value)
    data.totalRefunded.bch = parseBch(data.totalRefunded.currency / orderBchPrice.value)
    data.netPaid.bch = parseBch(data.netPaid.currency / orderBchPrice.value)
    data.change.bch = parseBch(data.change.currency / orderBchPrice.value)
  } else {
    data.subtotal.bch = null
    data.deliveryFee.bch = null
    data.total.bch = null
    data.totalPaid.bch = null
    data.totalPendingPayment.bch = null
    data.totalRefunded.bch = null
    data.netPaid.bch = null
    data.change.bch = null
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


const storefront = ref(Storefront.parse())
watch(storefrontId, () => fetchStorefront())
function fetchStorefront() {
  if (!storefrontId.value) return Promise.reject()
  const cachedStorefront = $store.getters['marketplace/getStorefront']?.(storefrontId.value)
  if (storefrontId.value == cachedStorefront?.id) {
    storefront.value = Storefront.parse(cachedStorefront.raw)
    return Promise.resolve()
  }
  return backend.get(`connecta/storefronts/${storefrontId.value}/`)
    .then(response => {
      const storefrontData = response?.data
      storefront.value = Storefront.parse(storefrontData)
      $store.commit('marketplace/cacheStorefront', storefrontData)
      return response
    })
}

const trackRiderInterval = ref(null)
function stopTrackRider () {
  clearInterval(trackRiderInterval.value)
  trackRiderInterval.value = null
}
function trackRider() {
  stopTrackRider()
  updateRiderLocation()
  trackRiderInterval.value = setInterval(() => updateRiderLocation(), 5 * 1000)
}
async function updateRiderLocation() {
  const riderId = delivery.value?.rider?.id
  if (!riderId) return
  const params = { ids: riderId }
  const response = await backend.get(`connecta-express/riders/get_locations/`, { params })
  const currentLocation = response?.data?.results?.[0]?.coordinates
  if (isNaN(currentLocation?.[0]) || isNaN(currentLocation?.[1])) return
  delivery.value.rider.currentLocation = [currentLocation[1], currentLocation[0]]
  delivery.value.rider.currentLocationTimestamp = Date.now()
}
onUnmounted(() => stopTrackRider())

const showMap = ref(false)
watch(showMap, () => showMap.value ? trackRider() : stopTrackRider())
const mapLocations = computed(() => {
  const data = []
  if (storefront.value?.location?.validCoordinates) {
    data.push({
      popup: ['Pickup location', storefront.value?.location?.formatted].filter(Boolean).join(': '),
      lat: storefront.value?.location?.latitude,
      lon: storefront.value?.location?.longitude,
      icon: { prefix: '', glyph: 'Store' },
    })
  }

  const deliveryLoc = delivery.value?.deliveryLocation?.validCoordinates
    ? delivery.value?.deliveryLocation
    : order.value.deliveryAddress?.location

  if (deliveryLoc?.validCoordinates) {
    data.push({
      lat: deliveryLoc?.latitude,
      lon: deliveryLoc?.longitude,
      popup: ['Delivery address', deliveryLoc?.formatted].filter(Boolean).join(': '),
      icon: { prefix: '', glyph: 'Delivery' },
    })
  }

  const rider = delivery.value?.rider
  const riderLoc = rider?.currentLocation
  const riderLocTimestamp = rider?.currentLocationTimestamp
  if (!isNaN(riderLoc?.[0]) && !isNaN(riderLoc?.[1])) {
    let timestampText = ''
    if (!isNaN(riderLocTimestamp)) timestampText = `<br/>${formatDateRelative(riderLocTimestamp)}`
    const riderName = [rider?.firstName, rider?.lastName].filter(Boolean).join(' ')
    data.push({
      popup: [`Rider`, riderName].filter(Boolean).join(': ') + timestampText,
      lat: riderLoc[0],
      lon: riderLoc[1],
      icon: { prefix: '', glyph: 'Rider' },
    })
  }

  return data
})


const showPaymentsDialog = ref(false)
const payments = ref([].map(Payment.parse))
const fetchingPayments = ref(false)
function fetchPayments() {
  const params = { order_id: props?.orderId || null }

  fetchingPayments.value = true
  return backend.get(`connecta/payments/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      payments.value = response.data.results.map(Payment.parse)
      return response
    })
    .finally(() => {
      fetchingPayments.value = false
    })
}

const creatingPayment = ref(true)
const payment = computed(() => {
  return payments.value.find(payment => {
    return payment.status == 'pending' && payment?.totalAmount == order.value.balanceToPay
  })
})
const showPaymentDialog = ref(false)
watch(showPaymentDialog, () => {
  if(!showPaymentDialog.value) return
  if (payment.value?.id) return
  createPayment()
})
const bchAddress = computed(() => {
  return $store.getters['global/getWallet']('bch')?.lastAddress
})

const createPayment = debounce(async () => {
  if (order.value.balanceToPay <= 0) return Promise.resolve('Order paid')
  const data = {
    order_id: order.value.id,
    ignore_pending_payments: true,
    escrow: {
      buyer_address: order.value?.payment?.escrowRefundAddress || bchAddress.value,
    },
  }

  creatingPayment.value = true
  return backend.post(`connecta/orders/${order.value.id}/payment/`, data)
    .then(async (response) => {
      if (!response?.data?.id) return Promise.reject({ response })
      const newPayment = Payment.parse(response?.data)
      const index = payments.value.findIndex(_payment => _payment?.id == newPayment?.id)
      if (index >= 0) payments.value[index] = newPayment
      else payments.value.unshift(newPayment)
      await Promise.allSettled([
        fetchOrder(),
        fetchPayments(),
      ])
      return response
    })
    .then(() => {
      if (!payment.value?.id) fetchOrder()
    })
    .finally(() => {
      creatingPayment.value = false
    })
}, 250)

const bchPaymentData = computed(() => {
  const data = {
    escrowContract: payment.value?.escrowContract,
    bchPrice: payment.value?.bchPrice,
    address: payment.value?.escrowContract?.address || payment.value?.escrowContractAddress,
    bchAmount: parseFloat(payment.value?.escrowContract?.bchAmounts?.total),
    fiatAmount: 0,
    currency: payment.value?.bchPrice?.currency?.symbol,
    url: '',
  }

  if (!data.address || !data.bchAmount) return data

  const fiatPrice = parseFloat(payment.value?.bchPrice?.price)
  if (fiatPrice) data.fiatAmount = Math.round(data.bchAmount * fiatPrice * 10 ** 3) / 10 ** 3
  data.url = `${data?.address}?amount=${data.bchAmount}`
  return data
})

function showBchPaymentEscrowContract() {
  $q.dialog({
    component: EscrowContractDialog,
    componentProps: bchPaymentData.value,
  })
}

const txListener = ref(new TransactionListener())
const transactionsReceived = ref([].map(() => {
  const data = txListener.value.parseWebsocketDataReceived()
  return Object.assign({ marketValue: { symbol: '', price: 0, amount: 0 } }, data)
}))
watch(showPaymentDialog, () => {
  if (!showPaymentDialog.value) txListener.value.disconnect()
  else txListener.value.connect()
})

watch(() => [payment.value?.escrowContractAddress], debounce(() => {
  payment.value?.fetchEscrowContract?.().then(() => checkPaymentFundingTx())
}, 250))

watch(() => [bchPaymentData.value?.address], () => {
  txListener.value.address = bchPaymentData.value?.address
  txListener.value.addListener(txListenerCallback)
  if (txListener.value.readyState != WebSocket.OPEN && showPaymentDialog.value) {
    txListener.value.connect()
  }
})
const txListenerCallback = (msg, parsedData) => {
  const price = parseFloat(bchPaymentData.value.bchPrice?.price)
  const marketValue = {
    symbol: bchPaymentData.value?.currency,
    price: price,
    amount: (Math.floor(parsedData?.value * price) / 10 ** 8),
  }
  marketValue.amount = Number(marketValue.amount.toPrecision(3))

  parsedData.marketValue = marketValue

  console.log('Received transaction:', parsedData)
  const index = transactionsReceived.value.findIndex(data => data?.txid == parsedData?.txid)
  if (index >= 0) transactionsReceived.value[index] = parsedData
  else transactionsReceived.value.push(parsedData)

  const fundingTx = getFundingTxFromReceivedTxs()
  savePaymentFundingTx(fundingTx)
    .then(() => {
      showPaymentDialog.value = false
    })
}

function getFundingTxFromReceivedTxs() {
  return transactionsReceived.value.find(tx => {
    if (tx.address != bchPaymentData.value.address) return false
    if (tx.tokenName != 'bch') return false
    return parseInt(tx.value) == Math.floor(bchPaymentData.value.bchAmount * 10 ** 8)
  })
}

function savePaymentFundingTx(txData=txListener.value.parseWebsocketDataReceived()) {
  if (!txData?.txid) return Promise.reject()

  const data = {
    funding_txid: txData.txid,
    funding_vout: txData.index,
    funding_sats: txData.value,
  }
  creatingPayment.value = true
  const dialog = $q.dialog({
    title: 'Verifying payment',
    message: 'Payment received',
    progress: { color: 'brandblue' },
    persistent: true,
    ok: false,
    cancel: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  return backend.post(`connecta/escrow/${txData?.address}/set_funding_transaction/`, data)
    .then(response => {
      fetchOrder()
      dialog.hide()
      return response
    })
    .catch(error => {
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                        errorParser.firstElementOrValue(data?.detail)
      dialog.update({
        title: 'Payment verification error',
        message: errorMessage || 'Unable to verify payment',
      })
      return Promise.reject(error)
    })
    .finally(() => {
      dialog.update({ persistent: false, ok: { color: 'brandblue' } })
      creatingPayment.value = false
    })
}

function onSendBchPaymentSwipe(resetSwipe=()=>{}) {
  $q.dialog({
    component: SecurityCheckDialog,
  })
    .onOk(() => {
      sendBchPayment()
        .finally(() => resetSwipe())
    })
    .onCancel(() => resetSwipe())
}

const bchWalletBalance = computed(() => {
  const asset = $store.getters['assets/getAsset']?.('bch')?.[0]
  return asset?.spendable
})
const wallet = ref([].map(() => new Wallet())[0])
async function initWallet () {
  wallet.value = await loadWallet(undefined, $store.getters['global/getWalletIndex'])
}
function getChangeAddress(opts={chipnet: false}) {
  const walletTypes = opts?.chipnet
    ? $store.getters['global/getAllChipnetTypes']
    : $store.getters['global/getAllWalletTypes']

  const bchWalletData = walletTypes?.bch
  return bchWalletData?.lastChangeAddress
}

async function sendBchPayment() {
  const amount = bchPaymentData.value.bchAmount
  const address = bchPaymentData.value.address
  const chipnet = address.indexOf('bchtest:') >= 0
  const changeAddress = getChangeAddress({ chipnet })
  // const changeAddress = 'bchtest:qq4sh33hxw2v23g2hwmcp369tany3x73wuveuzrdz5'
  if (!wallet.value) await initWallet()

  const dialog = $q.dialog({
    title: 'Sending payment',
    mesage: `Sending ${amount} BCH to ${address}`,
    persistent: true,
    progress: true,
    ok: false,
    cancel: false,
    class: darkMode.value ? 'text-white pt-dark-card' : 'text-black',
  })

  const bchWallet = chipnet ? wallet.value.BCH_CHIP : wallet.value.BCH
  bchWallet.sendBch(amount, address, changeAddress)
    .then(result => {
      if (!result.success) return Promise.reject(result)
      savePaymentFundingTx({ txid: result.txid, address: address }).then(() => {
        showPaymentDialog.value = false
      })
      dialog.hide()
    })
    .catch(error => {
      let errorMessage = error?.error || ''
      if (errorMessage.indexOf('not enough balance in sender') > -1) {
        errorMessage = 'Not enough balance to cover the send amount and transaction fee'
      } else if (errorMessage.indexOf('has insufficient priority') > -1) {
        errorMessage = 'Not enough balance to cover the transaction fee'
      }

      dialog.update({ title: 'Unable to send payment', message: errorMessage })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false, ok: true })
    })
}


function checkPaymentFundingTx() {
  const escrowContract = bchPaymentData.value?.escrowContract
  if (!escrowContract?.address) return Promise.resolve()
  if (escrowContract?.fundingTxid) return Promise.resolve()

  creatingPayment.value = true
  return backend.post(`connecta/escrow/${escrowContract?.address}/resolve_funding_transaction/`)
    .then(response => {
      if (response?.data?.address != escrowContract?.address) return Promise.reject({ response })
      escrowContract.raw = response?.data
      refreshPage()
        .finally(() => {
          if (!order.value.balanceToPay) showPaymentDialog.value = false
        })
      return response
    })
    .finally(() => {
      creatingPayment.value = false
    })
}

window.t = () => $store.commit('darkmode/setDarkmodeSatus', !darkMode.value)
const completingOrder = ref(false)
const showOrderCompletedPrompt = ref(false)
function completeOrder() {
  if (order.value.status != 'delivered') return
  const data = { status: 'completed' }

  const dialog = $q.dialog({
    title: 'Completing order',
    progress: true,
    persistent: true,
    ok: false,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })

  completingOrder.value = true
  return backend.post(`connecta/orders/${order.value.id}/update_status/`, data)
    .then(response => {
      order.value.raw = response?.data
      showOrderCompletedPrompt.value = true
      dialog.hide()
    })
    .catch(error => {
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.detail) ||
                         errorParser.firstElementOrValue(data?.non_field_errors) ||
                         errorParser.firstElementOrValue(data?.status)

      if (typeof data === 'string' && data.length < 200) errorMessage = data
      dialog.update({
        title: 'Unable to complete order',
        message: errorMessage || 'An unknown error occurred',
      })
    })
    .finally(() => {
      dialog.update({ persistent: false, progress: false })
      completingOrder.value = false
    })
}

const orderUpdateEventName = 'order_updates'
const onNotificationHandler = notification  => {
  if (notification?.event != orderUpdateEventName) return
  if (notification?.data?.id != props.orderId) return
  fetchOrder()
}

watch(() => [props.orderId], () => {
  unsubscribeUpdatesToRpc().finally(() => subscribeUpdatesToRpc())
})
onActivated(() => subscribeUpdatesToRpc())
onDeactivated(() => unsubscribeUpdatesToRpc())
async function subscribeUpdatesToRpc() {
  if (!marketplaceRpc.isConnected()) await marketplaceRpc.connect()
  marketplaceRpc.client.call('subscribe', [orderUpdateEventName, { id: parseInt(props.orderId) }])

  if (!marketplaceRpc.client.onNotification.includes(onNotificationHandler)) {
    marketplaceRpc.client.onNotification.push(onNotificationHandler)
  }
}

async function unsubscribeUpdatesToRpc() {
  if (!marketplaceRpc.isConnected()) return
  marketplaceRpc.client.call('unsubscribe', [orderUpdateEventName])
  marketplaceRpc.client.onNotification = marketplaceRpc.client.onNotification
    .filter(handler => handler !== onNotificationHandler)
}

const $copyText = inject('$copyText')
function copyToClipboard(value, message) {
  $copyText(value)
  $q.notify({
    message: message || 'Copied to clipboard',
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchOrder(),
      fetchDelivery(),
      fetchPayments(),
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

.col-qr-code {
  display: flex;
  justify-content: center;
  border-radius: 16px;
  border: 4px solid #ed5f59;
  background: white;
  padding: 12px;
}
</style>
<style scoped lang="scss">
@media (min-width: $breakpoint-xs) {
  .items-delivery-address-panel {
    flex-direction: row-reverse;
  }
}
</style>
