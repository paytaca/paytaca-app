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
      <div class="text-h5 q-px-sm">Checkout</div>
      <q-tabs v-model="tabs.active">
        <q-tab v-for="(tab, index) in tabs.opts" :key="index" v-bind="tab"/>
      </q-tabs>
      <q-tab-panels v-model="tabs.active" :class="{'pt-dark': darkMode }">
        <q-tab-panel name="items" :dark="darkMode">
          <div
            v-for="cartItem in checkout?.cart?.items" :key="cartItem?.variant?.id"
            class="row items-center no-wrap q-px-xs"
          >
            <div class="q-space">
              <q-btn
                flat no-caps
                padding="none"
                :to="{
                  name: 'app-marketplace-product',
                  params: { productId: cartItem?.variant?.product?.id },
                  query: { variantId: cartItem?.variant?.id },
                }"
              >
                <div class="row items-center justify-left no-wrap full-width text-left">
                  <q-img
                    v-if="cartItem?.variant?.itemImage"
                    :src="cartItem?.variant?.itemImage"
                    width="35px"
                    ratio="1"
                    class="rounded-borders q-mr-xs"
                  />
                  <div>{{ cartItem?.variant?.itemName }}</div>
                </div>
              </q-btn>
            </div>
            <div class="col-3 q-pa-xs">
              {{ cartItem?.variant?.price }}
              {{ checkoutCurrency }}
            </div>
            <div class="col-3 q-pa-xs">
              <q-input
                dense
                outlined
                :disable="checkout?.cart?.$state?.updating"
                :dark="darkMode"
                type="number"
                v-model.number="cartItem.quantity"
                :debounce="750"
                @update:model-value="() => saveCart()"
              >
              </q-input>
            </div>
          </div>
          <div class="q-px-xs q-mt-md row items-center text-subtitle1">
            <div class="q-space">Subtotal</div>
            <div>{{ checkout?.cart?.subtotal }} {{ checkoutCurrency }}</div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="delivery" :dark="darkMode">
          <q-form @submit="() => saveDeliveryAddress().then(() => nextTab())">

            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="First name"
                v-model="formData.delivery.firstName"
                class="col-12 col-sm-6"
                bottom-slots
              /> 
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Last name"
                v-model="formData.delivery.lastName"
                class="col-12 col-sm-6"
                bottom-slots
              />
            </div>
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Phone number"
              v-model="formData.delivery.phoneNumber"
              bottom-slots
            />
  
            <div class="text-subtitle1">Address</div>
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Address"
              v-model="formData.delivery.address.address1"
              bottom-slots
            />
            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Street"
                v-model="formData.delivery.address.street"
                class="col-12 col-sm-6"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="City"
                v-model="formData.delivery.address.city"
                class="col-12 col-sm-6"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
            </div>
  
            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="State / Province"
                v-model="formData.delivery.address.state"
                class="col-12 col-sm-6"
                bottom-slots
              />
              <q-select
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Country"
                clearable
                use-input
                fill-input
                hide-selected
                :options="filteredCountriesOpts"
                @filter="filterCountriesOpts"
                v-model="formData.delivery.address.country"
                class="col-12 col-sm-6"
                :popup-content-class="darkMode ? '': 'text-black'"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
            </div>
            <div class="row items-center q-gutter-x-sm q-mt-sm">
              <q-btn
                no-caps flat
                class="q-space"
                @click="selectCoordinates()"
              >
                <q-icon name="location_on"/>
                <template v-if="validCoordinates">
                  {{ formData.delivery.address.longitude }}, {{ formData.delivery.address.latitude }}
                </template>
                <template v-else>
                  Pin location
                </template>
              </q-btn>
              <q-btn
                v-if="validCoordinates"
                icon="close"
                padding="xs"
                flat
                @click="() => {
                  formData.delivery.address.longitude = null
                  formData.delivery.address.latitude = null
                }"
              />
            </div>
            <div class="q-mt-sm">
              <q-btn
                no-caps
                label="Save"
                type="submit"
                color="brandblue"
                class="full-width"
              />
            </div>
          </q-form>
        </q-tab-panel>
        <q-tab-panel name="payment" :dark="darkMode">
          <div class="row items-start text-subtitle1">
            <div class="q-space">Subtotal</div>
            <div class="text-right">
              <!-- <div>{{ checkout?.cart?.subtotal }} {{ checkoutCurrency }}</div> -->
              <div>
                {{ checkoutBchSubtotal }} BCH
                <q-icon
                  name="info"
                  size="1.25em"
                >
                  <q-menu :class="[darkMode ? 'pt-dark' : 'text-black', 'q-pa-sm']">
                    <div class="text-body2">{{ formData?.payment?.bchPrice?.currency }} Price</div>
                    <div class="">
                      {{ formData?.payment?.bchPrice?.rate }} {{ formData?.payment?.bchPrice?.currency }} / BCH
                    </div>
                    <div class="text-caption text-grey">
                      {{ formatTimestampToText(formData?.payment?.bchPrice?.timestamp) }}
                    </div>
                  </q-menu>
                </q-icon>
              </div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="review" :dark="darkMode" class="q-pa-sm">
          <div class="row items-start">
            <div class="q-space q-pa-xs">
              <table class="full-width items-table">
                <tr>
                  <th class="full-width">Item</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                </tr>
                <tr v-for="cartItem in checkout?.cart?.items" :key="cartItem?.variant?.id">
                  <td>
                    <q-btn
                      flat no-caps
                      padding="none"
                      :to="{
                        name: 'app-marketplace-product',
                        params: { productId: cartItem?.variant?.product?.id },
                        query: { variantId: cartItem?.variant?.id },
                      }"
                    >
                      <div class="row items-center justify-left no-wrap full-width text-left">
                        <q-img
                          v-if="cartItem?.variant?.itemImage"
                          :src="cartItem?.variant?.itemImage"
                          width="35px"
                          ratio="1"
                          class="rounded-borders q-mr-xs"
                        />
                        <div>{{ cartItem?.variant?.itemName }}</div>
                      </div>
                    </q-btn>
                  </td>
                  <td class="text-center" style="white-space:nowrap;">{{ cartItem?.quantity }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ cartItem?.variant?.price }} {{ checkoutCurrency }}</td>
                  <td class="text-center" style="white-space:nowrap;">{{ cartItem?.variant?.price * cartItem?.quantity }} {{ checkoutCurrency }}</td>
                </tr>
              </table>
              <q-separator :dark="darkMode" spaced/>
              <div class="row items-start text-subtitle2 q-px-xs">
                <div class="q-space">Subtotal</div>
                <div>{{ checkoutBchSubtotal }} BCH</div>
              </div>
            </div>
            <div v-if="checkout?.deliveryAddress?.id" class="col-12 col-sm-4 q-pa-xs q-mt-sm">
              <q-card
                :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-px-md q-py-sm']">
                <div class="text-subtitle1">Delivery</div>
                <div>
                  {{ checkout?.deliveryAddress?.firstName }}
                  {{ checkout?.deliveryAddress?.lastName }}
                </div>
                <div>{{ checkout?.deliveryAddress?.phoneNumber }}</div>
                <div>{{ checkout?.deliveryAddress?.location?.formatted }}</div>
              </q-card>
            </div>
          </div>
          <div class="q-mt-sm">
            <q-btn
              no-caps
              label="Order"
              color="brandblue"
              class="full-width"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-pull-to-refresh>  
</template>
<script setup>
import countriesJson from 'src/assets/countries.json'
import { backend } from 'src/marketplace/backend'
import { Checkout } from 'src/marketplace/objects'
import { formatTimestampToText } from 'src/marketplace/utils'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'

const props = defineProps({
  checkoutId: [String, Number],
  cartId: [String, Number],
})

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
onMounted(() => refreshPage())
function resetPage() {
  checkout.value.raw = Checkout.parse()
  resetFormData()
  tabs.value.active = tabs.value.opts?.[0]?.name
  initialized.value = false
}

watch(
  () => [props.cartId, props.checkoutId],
  () => {
    resetPage()
    refreshPage()
  }
)

const tabs = ref({
  active: 'items',
  opts: [
    { label: 'Items', name: 'items' },
    { label: 'Delivery', name: 'delivery' },
    { label: 'Payment', name: 'payment' },
    { label: 'Review', name: 'review' },
  ]
})

function nextTab() {
  const _tabs = tabs.value.opts
  const index = _tabs.findIndex(tabOpt => tabOpt.name === tabs.value.active)
  const nextIndex = Math.min(index + 1, _tabs.length-1)

  tabs.value.active = _tabs.at(nextIndex).name
}

const loading = ref(false)
const formData = ref({
  delivery: {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: {
      address1: '',
      address2: '',
      street: '',
      city: '',
      state: '',
      country: '',
      longitude: null,
      latitude: null,
    },
  },

  payment: {
    bchPrice: { currency: '', rate: 0, timestamp: 0 },
  }
})

const validCoordinates = computed(() => 
  Number.isFinite(formData.value.delivery.address.longitude) && Number.isFinite(formData.value.delivery.address.latitude)
)

function resetFormData() {
  formData.value = {
    delivery: {
      firstName: checkout?.value?.deliveryAddress?.firstName || '',
      lastName: checkout?.value?.deliveryAddress?.lastName || '',
      phoneNumber: checkout?.value?.deliveryAddress?.phoneNumber || '',
      address: {
        address1: checkout?.value?.deliveryAddress?.location?.address1 || '',
        address2: checkout?.value?.deliveryAddress?.location?.address2 || '',
        street: checkout?.value?.deliveryAddress?.location?.street || '',
        city: checkout?.value?.deliveryAddress?.location?.city || '',
        state: checkout?.value?.deliveryAddress?.location?.state || '',
        country: checkout?.value?.deliveryAddress?.location?.country || '',
        longitude: Number(checkout?.value?.deliveryAddress?.location?.longitude) || null,
        latitude: Number(checkout?.value?.deliveryAddress?.location?.latitude) || null,
      },
    },

    payment: {
      bchPrice: {
        currency: checkout?.value?.payment?.currency?.symbol || '',
        rate: checkout?.value?.payment?.bchPrice || 0,
        timestamp: checkout?.value?.payment?.bchPriceTimestamp,
      }
    }
  }
}

const countriesOpts = computed(() => {
  if (!Array.isArray(countriesJson)) return []
  return countriesJson
    .map(countryJson => countryJson?.name)
    .filter(Boolean)
    .filter((e,i,s) => s.indexOf(e) === i)
})
const filteredCountriesOpts = ref([])
function filterCountriesOpts (val, update) {
  if (!val) {
    filteredCountriesOpts.value = countriesOpts.value
  } else {
    const needle = String(val).toLowerCase()
    filteredCountriesOpts.value = countriesOpts.value
      .filter(country => String(country).toLowerCase().indexOf(needle) >= 0)
  }
  update()
}

function selectCoordinates() {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: formData.value.delivery.address.latitude,
        longitude: formData.value.delivery.address.longitude,
      }
    }
  })
    .onOk(coordinates => {
      formData.value.delivery.address.longitude = coordinates.lng
      formData.value.delivery.address.latitude = coordinates.lat
    })
}

function updateBchPrice(opts={save: true, age: 60 * 1000}) {
  if (opts?.age && formData.value.payment.bchPrice.timestamp > Date.now() - opts?.age) {
    console.log(
      formData.value.payment.bchPrice.timestamp,
      new Date(Date.now() - opts?.age),
      formData.value.payment.bchPrice.timestamp > Date.now() - opts?.age,
    )
    return Promise.resolve('price is still new')
  }
  const coinId = 'bitcoin-cash'
  let currency = String(checkoutCurrency.value).toLowerCase()
  let convertToCurrency = null
  if (currency == 'ars') {
    convertToCurrency = currency
    currency = 'usd'
  }
  const params = { ids: coinId, vs_currencies: currency }
  return backend.get('https://api.coingecko.com/api/v3/simple/price', { params })
    .then(response => {
      const price = response?.data?.[coinId]?.[currency]
      if (!price) return Promise.reject({ response })
      return price
    })
    .then(async price => {
      if (!convertToCurrency) return price
      const { data } = await backend.get(`https://api.yadio.io/rate/${convertToCurrency}/${currency}`)
      const newPrice = Math.round(price * data?.rate * 10 ** 3) / 10 ** 3
      return newPrice
    })
    .then(price => {
      formData.value.payment.bchPrice = {
        currency: currency.toUpperCase(),
        rate: price,
        timestamp: new Date(),
      }

      if (opts?.save) savePayment()
      return price
    })
}

let unsubscribeCacheCartMutation = null 
onMounted(() => {
  unsubscribeCacheCartMutation = $store.subscribe(mutation => {
    if (mutation?.type !== 'marketplace/cacheCart') return
    const payload = mutation?.payload
    if (payload?.id !== checkout.value?.cart?.id) return
    checkout.value.cart.raw = payload
  })
})
onUnmounted(() => unsubscribeCacheCartMutation?.())

const checkout = ref(Checkout.parse())
const checkoutCurrency = computed(() => checkout.value?.payment?.currency?.symbol)
const checkoutBchSubtotal = computed(() => {
  if (isNaN(checkout.value?.cart?.subtotal) || isNaN(formData.value?.payment?.bchPrice?.rate)) return
  const subtotal = checkout.value?.cart?.subtotal / formData.value?.payment?.bchPrice?.rate
  return Math.ceil(subtotal * 10 ** 8) / 10 ** 8
})
function fetchCheckout() {
  let request
  if (props.checkoutId) request = backend.get(`connecta/checkouts/${props.checkoutId}`)
  else if (props.cartId) request = backend.post(`connecta/carts/${props.cartId}/checkout/`)

  if (!request) return Promise.reject()
  return request.then(response => {
    checkout.value = Checkout.parse(response?.data)
  })
}

function saveCart() {
  $store.dispatch('marketplace/saveCart', checkout.value.cart)
}

function savePayment() {
  loading.value = true
  return updateCheckout({
    payment: {
      bch_price: formData.value?.payment.bchPrice?.rate || null,
      bch_price_timestamp: formData.value?.payment.bchPrice?.timestamp || null,
    }
  }).finally(() => {
    loading.value = false
  })
}

function saveDeliveryAddress() {
  return updateCheckout({
    delivery_address: {
      first_name: formData.value?.delivery?.firstName,
      last_name: formData.value?.delivery?.lastName,
      phone_number: formData.value?.delivery?.phoneNumber,
      location: {
        address1: formData.value?.delivery?.address?.address1,
        address2: formData.value?.delivery?.address?.address2,
        street: formData.value?.delivery?.address?.street,
        city: formData.value?.delivery?.address?.city,
        state: formData.value?.delivery?.address?.state,
        country: formData.value?.delivery?.address?.country,
        longitude: formData.value?.delivery?.address?.longitude,
        latitude: formData.value?.delivery?.address?.latitude,
      },
    }
  })
}

function updateCheckout(data) {
  loading.value = true
  return backend.patch(`connecta/checkouts/${checkout.value.id}/`, data)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      checkout.value.raw = response?.data
      resetFormData()
      return response
    }).finally(() => {
      loading.value = false
    })
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchCheckout().finally(() => resetFormData()).then(() => updateBchPrice()),
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
.q-tab-panels {
  background: unset;
}
</style>