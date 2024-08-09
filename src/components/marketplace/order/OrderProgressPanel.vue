<template>
  <q-banner
    v-if="statusMessage || statusSubtext"
    rounded
    :class="[
      order.isCancelled ? 'text-white bg-red' : 'pt-card text-bow',
      getDarkModeClass(darkMode),
    ]"
  >
    <div>
      <!-- <q-linear-progress :color="order?.statusColor" :value="1"/> -->
      <div class="text-subtitle1 text-weight-medium">{{ statusMessage }}</div>
      <div v-if="order?.isCancelled && order?.cancelReason">
        <div><i>{{ order?.cancelReason }}</i></div>
      </div>
      <div v-else-if="statusSubtext">{{ statusSubtext }}</div>
      <slot name="bottom"/>
    </div>
  </q-banner>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Order, Storefront } from 'src/marketplace/objects'
import { parseOrderStatusColor } from 'src/marketplace/utils'
import { useStore } from 'vuex'
import { computed, defineComponent } from 'vue'


const props = defineProps({
  order: Order,
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const progressMarkers = computed(() => {
  const result = [
    { status: 'confirmed', color: parseOrderStatusColor('confirmed') },
    { status: 'preparing', color: parseOrderStatusColor('preparing') },
    { status: 'ready_for_pickup', color: parseOrderStatusColor('ready_for_pickup') },
  ]

  if (props?.order?.isStorePickup) {
    return result
  }

  result.push(
    { status: 'on_delivery', color: parseOrderStatusColor('on_delivery') },
    { status: 'delivered', color: parseOrderStatusColor('delivered') },
  )

  return result
})


const statusMessage = computed(() => {
  switch(props.order.status) {
    case 'pending':
      return 'Waiting confirmation'
    case 'confirmed':
      return 'Order confirmed'
    case 'preparing':
      return 'Preparing order'
    case 'ready_for_pickup':
      return props.order.isStorePickup
        ? 'Order is ready for pickup!'
        : 'Order prepared'
    case 'picked_up':
      return 'Order picked up'
    case 'on_delivery':
      return 'Delivering order'
    case 'delivered':
      return 'Order delivered'
    case 'completed':
      return 'Order completed'
    case 'cancelled':
      return 'Order cancelled'
    default:
      return ''
  }
})


const statusSubtext = computed(() => {
  switch(props.order.status) {
    case 'pending':
      return 'Merchant will confirm your order'
    case 'confirmed':
      return orderDeadlines.value.preparation.text || 'Your order will be prepared soon'
    case 'preparing':
      return orderDeadlines.value.preparation.text || 'Order is being prepared'
    case 'ready_for_pickup':
      return props.order.isStorePickup
        ? 'Pickup your order from the store and mark the order as completed.'
        : 'Order has been prepared and waiting for pick up by the rider'
    case 'picked_up':
      return props.order?.isStorePickup
        ? 'Review your order and mark completed if there are no problems'
        : ''
    case 'on_delivery':
      return orderDeadlines.value.delivery.text || 'Order is being delivered by rider'
    case 'delivered':
      return 'Review your order and mark completed if there are no problems'
    case 'completed':
      return 'Order has been completed, thank you for using our service!'
    default:
      return ''
  }
})

/**
 * @param {Date} timestamp
 */
function parseDeadlineTimestamp(timestamp) {
  const response = { actual: 0, min: 0, max: 0, text: '' }
  if (!timestamp) return response
  const delta = timestamp - Date.now()
  const minutes = delta / (60 * 1000)
  response.actual = minutes
  response.min = Math.floor(minutes / 5) * 5
  response.max = Math.ceil(minutes / 5) * 5
  response.text = `${response.min}-${response.max} minutes`
  if (response.min >= 60) response.text = `${Math.ceil(response.min/60)} hour${response.min>60 ? 's' : ''}`
  else if (response.actual <= 5) response.text = `less than 5 minutes`
  else if (response.min == response.max) response.text = `${response.max} minutes`
  return response
}
const orderDeadlines = computed(() => {
  const data = {
    preparation: parseDeadlineTimestamp(props.order?.preparationDeadline),
    delivery: parseDeadlineTimestamp(props.order?.deliveryDeadline),
  }
  if (data.preparation.text) {
    data.preparation.text = `Your order will be ready for pickup in ${data.preparation.text}`
  }
  if (data.delivery.text) {
    data.delivery.text = `Your order will be delivered in ${data.delivery.text}`
  }

  return data
})
</script>
