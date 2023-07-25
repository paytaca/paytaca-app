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
      <div v-if="fetchingCheckout || loading" class="row justify-center items-center">
        <q-spinner size="3rem"/>
      </div>
    </div>
    <div v-else-if="checkout?.orderId" class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="q-px-sm text-center">
        <div class="text-subtitle1">Checkout is already complete</div>
        <div>
          <q-btn
            flat
            no-caps
            label="Go to order"
            class="text-underline"
            padding="xs lg"
            :to="{ name: 'app-marketplace-order', params: { orderId: checkout.orderId }}"
          />
        </div>
      </div>
    </div>
    <div v-else class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="row no-wrap items-center q-px-sm">
        <div class="text-h5">Checkout</div>
        <q-spinner v-if="loading" size="1.5em" class="q-ml-xs"/>
        <q-slide-transition>
          <div :model-value="Boolean(loading && loadingMsg)" class="ellipsis-2-lines q-ml-xs">
            {{ loadingMsg }}
          </div>
        </q-slide-transition>
      </div>
      <div v-if="checkoutStorefront?.id" class="q-px-sm">
        <div class=text-subtitle1>{{ checkoutStorefront?.name }}</div>
        <div
          v-if="checkoutStorefront?.location?.formatted"
          class="text-subtitle2" style="margin-top:-0.5em;"
          @click="() => displayStorefrontLocation()"
        >
          <q-icon name="place"/>
          {{ checkoutStorefront?.location?.formatted }}
        </div>
      </div>
      <q-tabs v-model="tabs.active">
        <q-tab v-for="(tab, index) in tabs.opts" :key="index" v-bind="tab"/>
      </q-tabs>
      <q-tab-panels v-model="tabs.active" :class="{'pt-dark': darkMode }" animated keep-alive>
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
          <template v-if="formData?.delivery?.rider?.id">
            <div class="text-subtitle1">Rider</div>
            <q-field
              dense outlined readonly
              :dark="darkMode"
              :model-value="formData?.delivery?.rider?.id"
              class="q-mb-sm"
            >
              <template v-slot:control>
                <div class="">
                  <div>{{ formData?.delivery?.rider?.fullName }}</div>
                  <div>{{ formData?.delivery?.rider?.phoneNumber }}</div>
                </div>
              </template>
            </q-field>
          </template>
          <q-form @submit="() => submitDeliveryAddress().then(() => nextTab())">
            <q-banner v-if="formErrors?.delivery?.detail?.length" class="bg-red text-white rounded-borders q-mb-md">
              <div v-if="formErrors?.delivery?.detail?.length === 1">
                {{ formErrors?.delivery?.detail?.[0] }}
              </div>
              <ul v-else class="q-pl-md">
                <li v-for="(err, index) in formErrors?.delivery?.detail" :key="index">{{err}}</li>
              </ul>
            </q-banner>
            <q-banner v-if="formErrors?.payment?.deliveryFee" class="bg-red text-white rounded-borders q-mb-md">
              {{ formErrors?.payment?.deliveryFee }}
            </q-banner>

            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1">Contact</div>
              <q-space/>
            </div>
            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="First name*"
                v-model="formData.delivery.firstName"
                class="col-12 col-sm-6"    
                :error="Boolean(formErrors?.delivery?.firstName)"
                :error-message="formErrors?.delivery?.firstName"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              /> 
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Last name*"
                v-model="formData.delivery.lastName"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.lastName)"
                :error-message="formErrors?.delivery?.lastName"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
            </div>
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Phone number*"
              v-model="formData.delivery.phoneNumber"
              :error="Boolean(formErrors?.delivery?.phoneNumber)"
              :error-message="formErrors?.delivery?.phoneNumber"
              :rules="[
                val => !val || String(val).match(/^(0|(\+\d+))\d{3}-?\d{3}-?\d{4}$/) || $t('InvalidPhoneNumber', {}, 'Invalid phone number'),
              ]"
              @update:model-value="() => showNumberCodeSelector = true"
            >
              <PhoneCountryCodeSelector
                v-model="showNumberCodeSelector"
                :needle="formData.delivery.phoneNumber"
                @selected-code="code => replacePrimaryNumberCode(code)"
                :dark="darkMode"
              />
            </q-input>
  
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1">Address</div>
              <q-space/>
              <GeolocateBtn @geolocate="position => onGeolocate(position)"/>
            </div>
            <q-input
              outlined
              dense
              :disable="loading"
              :dark="darkMode"
              label="Address"
              v-model="formData.delivery.address.address1"
              :error="Boolean(formErrors?.delivery?.location?.address1)"
              :error-message="formErrors?.delivery?.location?.address1"
            />
            <div class="row items-start">
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="Street*"
                v-model="formData.delivery.address.street"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.location?.street)"
                :error-message="formErrors?.delivery?.location?.street"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
              <q-input
                outlined
                dense
                :disable="loading"
                :dark="darkMode"
                label="City*"
                v-model="formData.delivery.address.city"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.location?.city)"
                :error-message="formErrors?.delivery?.location?.city"
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
                label="State / Province *"
                v-model="formData.delivery.address.state"
                class="col-12 col-sm-6"
                :error="Boolean(formErrors?.delivery?.location?.state)"
                :error-message="formErrors?.delivery?.location?.state"
                :rules="[
                  val => Boolean(val) || 'Required',
                ]"
              />
              <CountriesFieldWrapper v-slot="{ filteredCountriesOpts, filterCountriesOpts }">
                <q-select
                  outlined
                  dense
                  :disable="loading"
                  :dark="darkMode"
                  label="Country*"
                  clearable
                  use-input
                  fill-input
                  hide-selected
                  :options="filteredCountriesOpts"
                  @filter="filterCountriesOpts"
                  v-model="formData.delivery.address.country"
                  class="col-12 col-sm-6"
                  :popup-content-class="darkMode ? '': 'text-black'"
                  :error="Boolean(formErrors?.delivery?.location?.country)"
                  :error-message="formErrors?.delivery?.location?.country"
                  :rules="[
                    val => Boolean(val) || 'Required',
                  ]"
                />
              </CountriesFieldWrapper>
            </div>
            <div class="row items-center q-gutter-x-sm q-mt-sm">
              <q-btn
                no-caps flat
                :disable="loading"
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
                :loading="loading"
                :disable="loading"
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
          <q-banner v-if="formErrors?.payment?.deliveryFee" class="bg-red text-white rounded-borders q-mb-md">
            {{ formErrors?.payment?.deliveryFee }}
          </q-banner>

          <q-input
            dense
            outlined
            autogrow
            label="Payment refund address"
            :dark="darkMode"
            :disable="loading"
            v-model="formData.payment.escrowRefundAddress"
            :rules="[
              val => Boolean(val) || 'Required',
            ]"
            :error="Boolean(formErrors?.payment?.escrowRefundAddress)"
            :error-message="formErrors?.payment?.escrowRefundAddress"
          >
            <template v-slot:append>
              <q-icon name="help">
                <q-menu
                  anchor="bottom right" self="top right"
                  :class="[
                    darkMode ? 'pt-dark' : 'text-black',
                    'q-pa-sm'
                  ]"
                >
                  BCH address of customer. Used as receipient in case of refund on payment
                </q-menu>
              </q-icon>
            </template>
          </q-input>
          <div class="row items-center">
            <q-space/>
            <div>
              {{ checkoutBchPrice }} {{ checkoutCurrency }} / BCH
              <q-icon name="info" size="1.25em">
                <q-menu :class="[darkMode ? 'pt-dark' : 'text-black', 'q-pa-sm']">
                  <div class="text-body2">{{ checkoutCurrency }} price at</div>
                  <div>{{ formatTimestampToText(checkout?.payment?.bchPrice?.timestamp) }}</div>
                </q-menu>
              </q-icon>
            </div>
          </div>
          <div class="row items-start text-subtitle1" @click="toggleAmountsDisplay">
            <div class="q-space">Subtotal</div>
            <div v-if="displayBch" class="text-right">{{ checkoutAmounts.subtotal.bch }} BCH</div>
            <div v-else class="text-right">{{ checkoutAmounts.subtotal.currency }} {{ checkoutCurrency }}</div>
          </div>
          <div class="row items-start text-subtitle1" @click="toggleAmountsDisplay">
            <div class="q-space">Delivery fee</div>
            <div v-if="checkout?.deliveryAddress?.distance" class="text-grey q-mx-xs">{{ (checkout?.deliveryAddress?.distance / 1000).toFixed(3) }} km</div>
            <div v-if="displayBch" class="text-right">{{ checkoutAmounts.deliveryFee.bch }} BCH</div>
            <div v-else class="text-right">{{ checkoutAmounts.deliveryFee.currency }} {{ checkoutCurrency }}</div>
          </div>
          <div class="row items-start text-h6" @click="toggleAmountsDisplay">
            <div class="q-space">Total</div>
            <div v-if="displayBch" class="text-right">{{ checkoutAmounts.total.bch }} BCH</div>
            <div v-else class="text-right">{{ checkoutAmounts.total.currency }} {{ checkoutCurrency }}</div>
          </div>
          <div class="q-mt-sm">
            <q-btn
              :disable="loading"
              no-caps
              label="Review"
              color="brandblue"
              class="full-width"
              @click="() => savePayment().then(() => nextTab())"
            />
          </div>
        </q-tab-panel>
        <q-tab-panel name="review" :dark="darkMode" class="q-pa-sm">
          <div class="row items-start review-panel-content">
            <div v-if="checkout?.deliveryAddress?.id" class="col-12 col-sm-4 q-pa-xs">
              <q-card
                :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-px-md q-py-sm']"
              >
                <div class="text-subtitle1">Delivery</div>
                <q-separator :dark="darkMode"/>
                <div>{{ checkout?.deliveryAddress?.fullName }}</div>
                <div>{{ checkout?.deliveryAddress?.phoneNumber }}</div>
                <div @click="() => displayDeliveryAddressLocation()">
                  <div>{{ checkout?.deliveryAddress?.location?.formatted }}</div>
                  <q-btn
                    v-if="checkout?.deliveryAddress?.location?.validCoordinates"
                    flat
                    padding="none"
                    no-caps
                    label="View location"
                    class="text-underline"
                  />
                </div>

                <div v-if="formData?.delivery?.rider?.id">
                  <q-separator spaced :dark="darkMode"/>
                  <div class="text-subtitle2">Rider</div>
                  <div>{{ formData?.delivery?.rider?.fullName }}</div>
                  <div>{{ formData?.delivery?.rider?.phoneNumber }}</div>
                </div>
              </q-card>
            </div>
            <div class="q-space q-pa-xs">
              <q-card :class="[darkMode ? 'text-white pt-dark-card' : 'text-black', 'q-pa-sm']">
              <div class="q-px-sm text-subtitle1">Items</div>
              <q-separator :dark="darkMode" class="q-mx-sm"/>
              <table class="full-width items-table">
                <tr>
                  <th class="full-width">Item</th>
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
                  <td class="text-center" style="white-space:nowrap;">{{ (cartItem?.variant?.price * cartItem?.quantity) }} {{ checkoutCurrency }}</td>
                </tr>
              </table>
              </q-card>
            </div>
          </div>

          <q-separator :dark="darkMode" spaced/>
          <div
            v-if="checkout?.payment?.escrowRefundAddress"
            class="row items-start no-wrap q-px-xs q-mb-sm"
          >
            <div class="q-space">
              <div class="text-grey text-caption" style="margin-bottom:-0.35em;">Payment refund address</div>
              <div style="word-break:break-all;">{{ checkout?.payment?.escrowRefundAddress || '---' }}</div>
            </div>
            <q-icon name="help" size="sm" class="q-my-sm"/>
            <q-menu
              anchor="bottom right" self="top right"
              :class="[ darkMode ? 'pt-dark' : 'text-black', 'q-pa-sm']"
            >
              BCH address of customer. Used as receipient in case of refund on payment
            </q-menu>
          </div>
          <div class="row items-center q-pa-xs">
            <div>BCH Price:</div>
            <q-space/>
            <div class="row items-center">
              <div>{{ checkoutBchPrice }} {{ checkoutCurrency }} / BCH</div>
              <q-icon name="info" size="1.25em"/>
              <q-menu :class="[darkMode ? 'pt-dark' : 'text-black', 'q-pa-sm']">
                <div class="text-body2">{{ checkoutCurrency }} price at</div>
                <div>{{ formatTimestampToText(checkout?.payment?.bchPrice?.timestamp) }}</div>
              </q-menu>
            </div>
          </div>
          <div class="q-px-xs" @click="toggleAmountsDisplay">
            <div class="row items-start text-subtitle2">
              <div class="q-space">Subtotal</div>
              <div v-if="displayBch">{{ checkoutAmounts.subtotal.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.subtotal.currency }} {{ checkoutCurrency }}</div>
            </div>
            <div class="row items-start text-subtitle2">
              <div class="q-space">Delivery fee</div>
              <div v-if="checkout?.deliveryAddress?.distance" class="text-grey q-mx-xs">{{ (checkout?.deliveryAddress?.distance / 1000).toFixed(3) }} km</div>
              <div v-if="displayBch">{{ checkoutAmounts.deliveryFee.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.deliveryFee.currency }} {{ checkoutCurrency }}</div>
            </div>
            <div class="row items-start text-h6">
              <div class="q-space">Total</div>
              <div v-if="displayBch">{{ checkoutAmounts.total.bch }} BCH</div>
              <div v-else>{{ checkoutAmounts.total.currency }} {{ checkoutCurrency }}</div>
            </div>
          </div>
          <div class="q-mt-sm">
            <q-btn
              no-caps
              label="Order"
              color="brandblue"
              class="full-width"
              @click="() => completeCheckout()"
            />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>
  </q-pull-to-refresh>  
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { Checkout, Rider } from 'src/marketplace/objects'
import { errorParser, formatTimestampToText, getISOWithTimezone } from 'src/marketplace/utils'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'
import PinLocationDialog from 'src/components/PinLocationDialog.vue'
import PhoneCountryCodeSelector from 'src/components/PhoneCountryCodeSelector.vue'
import CountriesFieldWrapper from 'src/components/marketplace/countries-field-wrapper.vue'
import GeolocateBtn from 'src/components/GeolocateBtn.vue'

const props = defineProps({
  checkoutId: [String, Number],
  cartId: [String, Number],
})

const $q = useQuasar()
const $router = useRouter()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
onMounted(() => refreshPage())
function resetPage() {
  checkout.value.raw = Checkout.parse()
  resetFormData()
  resetFormErrors()
  tabs.value.active = tabs.value.opts?.[0]?.name
  tabs.value.opts.forEach(tab => tab.disable = tab.name === tabs.value.active)
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
    { label: 'Items', name: 'items', disable: true },
    { label: 'Delivery', name: 'delivery', disable: true },
    { label: 'Payment', name: 'payment', disable: true },
    { label: 'Review', name: 'review', disable: true },
  ]
})

function nextTab() {
  const _tabs = tabs.value.opts
  const index = _tabs.findIndex(tabOpt => tabOpt.name === tabs.value.active)
  const nextIndex = Math.min(index + 1, _tabs.length-1)

  tabs.value.active = _tabs.at(nextIndex).name
}

watch(() => [tabs.value.active], () => {
  tabs.value.opts.forEach(tab => {
    if (tab.name !== tabs.value.active) return
    tab.disable = false
  })

  const deliveryFee = checkout.value?.payment?.deliveryFee
  if (['payment', 'review'].indexOf(tabs.value.active) >= 0 && (isNaN(deliveryFee) || deliveryFee == null)) {
    updateDeliveryFee()
  }
})

function resetTabs() {
  tabs.value.opts.forEach(tab => tab.disable = true)
  tabs.value.opts[0].disable = false
  tabs.value.active = tabs.value.opts[0].name
  nextTab()
  setTimeout(() => {
    if (validCoordinates.value) {
      nextTab()
      findRider({ replaceExisting: false })
    }
  }, 1)
}

const loading = ref(false)
const loadingMsg = ref('')
const formData = ref({
  payment: {
    escrowRefundAddress: '',
  },
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
    rider: [].map(Rider.parse)[0],
  },
})

function resetFormData() {
  const existingRider = formData.value.delivery?.rider
  formData.value = {
    payment: {
      escrowRefundAddress: checkout.value?.payment?.escrowRefundAddress || bchAddress.value,
    },
    delivery: {
      rider: existingRider,
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
  }
}

const showNumberCodeSelector = ref(false)
function replacePrimaryNumberCode(code='') {
  const isPhoneNumberLike = RegExp("\\+?[0-9\\-]+").test(formData.value.delivery.phoneNumber)
  if (typeof formData.value.delivery.phoneNumber !== 'string' || !isPhoneNumberLike) {
    formData.value.delivery.phoneNumber = code
    return
  }
  formData.value.delivery.phoneNumber = code + formData.value.delivery.phoneNumber.substring(code.length)
}


const geocoding = ref(false)
const validCoordinates = computed(() => 
  Number.isFinite(formData.value.delivery.address.longitude) && Number.isFinite(formData.value.delivery.address.latitude)
)

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

function onGeolocate(response) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      initLocation: {
        latitude: response?.coords?.latitude,
        longitude: response?.coords?.longitude,
      }
    }
  }).onOk(pinLocationResp => {
    return reverseGeocode({ lat: pinLocationResp?.lat, lng: pinLocationResp?.lng, syncToForm: true })
  })
}

function reverseGeocode(opts = { lat: null, lng: null, syncToForm: false}) {
  const params = {
    lat: opts?.lat,
    lon: opts?.lng,
    format: 'json',
  }

  return backend.get(`https://nominatim.openstreetmap.org/reverse`, { params })
    .then(response => {
      const result = response?.data?.address
      const address1 = [
        result?.amenity || result?.shop || '',
        result?.village || result?.neighbourhood || result?.suburb || '',
      ].filter(Boolean).join(', ')

      const data = {
        address1: address1,
        address2: '',
        street: result?.road,
        city: result?.city,
        state: result?.state || result?.province || '', // most results have returned none so far
        country: result?.country || '',
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lon),
      }
      if (opts?.syncToForm) Object.assign(formData.value.delivery.address, data)
      return data
    })
}

function geocode() {
  let street = [
    formData.value?.delivery?.address?.address1,
    formData.value?.delivery?.address?.street
  ].filter(Boolean).join(' ')

  const params = {
    format: 'json',
    street: street,
    city: formData.value?.delivery?.address?.city,
    country: formData.value?.delivery?.address?.country || undefined,
  }

  geocoding.value = true
  return backend.get('https://nominatim.openstreetmap.org/search', { params })
    .then(response => {
      const result = response?.data?.[0]
      if (!result) return
      const lat = Number(result?.lat)
      const lon = Number(result?.lon)
      if (!isNaN(lat) && !isNaN(lon)) {
        formData.value.delivery.address.longitude = lon
        formData.value.delivery.address.latitude = lat
        return { lat, lon }
      }
    })
    .finally(() => {
      geocoding.value = false
    })
}

function createEmptyFormErrors() {
  return {
    detail: [],
    payment: { deliveryFee: '', escrowRefundAddress: '' },
    delivery: {
      detail: [],
      firstName: '',
      lastName: '',
      phoneNumber: '',
      location: {
        address1: '', address2: '',
        street: '', city: '',
        state: '', country: '',
        longitude: '', latitude: '',
      },
    }
  }
} 
const formErrors = ref(createEmptyFormErrors())
function resetFormErrors() {
  formErrors.value = createEmptyFormErrors()
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

const fetchingCheckout = ref(false)
const checkout = ref(Checkout.parse())
const checkoutCurrency = computed(() => checkout.value?.currency?.symbol)
const checkoutBchPrice = computed(() => checkout?.value?.payment?.bchPrice?.price || undefined)
const displayBch = ref(true)
const checkoutAmounts = computed(() => {
  const parseBch = num => Math.floor(num * 10 ** 8) / 10 ** 8
  const data = {
    subtotal: { currency: checkout.value?.cart?.subtotal || 0, bch: 0 },
    deliveryFee: { currency: checkout.value?.payment?.deliveryFee || 0, bch: 0 },
    total: { currency: 0, bch: 0 },
  }
  data.total.currency = Number(checkout.value?.cart?.subtotal) + Number(checkout.value?.payment?.deliveryFee)
  data.total.currency = Math.round(data.total.currency * 10 ** 3) / 10 ** 3

  if (!isNaN(checkoutBchPrice.value)) {
    data.subtotal.bch = parseBch(data.subtotal.currency / checkoutBchPrice.value)
    data.deliveryFee.bch = parseBch(data.deliveryFee.currency / checkoutBchPrice.value)
    data.total.bch = parseBch(data.total.currency / checkoutBchPrice.value)
  } else {
    data.subtotal.bch = null
    data.deliveryFee.bch = null
    data.total.bch = null
  }
  return data
})
function toggleAmountsDisplay() {
  displayBch.value = !displayBch.value && !isNaN(checkoutBchPrice.value)
}

function fetchCheckout() {
  let request
  if (props.checkoutId) request = backend.get(`connecta/checkouts/${props.checkoutId}`)
  else if (props.cartId) request = backend.post(`connecta/carts/${props.cartId}/checkout/`)

  if (!request) return Promise.reject()
  fetchingCheckout.value = true
  return request.then(response => {
    checkout.value = Checkout.parse(response?.data)
    if (!initialized.value) resetTabs()
    return response
  }).finally(() => {
    fetchingCheckout.value = false
  })
}

function saveCart() {
  $store.dispatch('marketplace/saveCart', checkout.value.cart)
}

function updateBchPrice(opts={age: 60 * 1000, abortIfCompleted: true }) {
  loading.value = true
  return checkout.value.updateBchPrice(opts)
    .then(() => resetFormData())
    .finally(() => loading.value = false)
}

async function findRider(opts={ replaceExisting: false }) {
  if (!opts?.replaceExisting && formData.value?.delivery?.rider?.id) return
  loading.value = true
  loadingMsg.value = 'Finding a rider'

  const riders = await findRiders().catch(() => [])
  loading.value = false
  loadingMsg.value = ''

  formData.value.delivery.rider = riders[0]
  if (!riders?.length) {
    $q.dialog({
      title: 'No riders nearby found',
      message: 'We might have trouble delivering your order. Do you wish to proceed?',
      persistent: true,
      cancel: { flat: true, noCaps: true, label: 'Cancel', color: 'grey' },
      ok: { flat: true, noCaps: true, label: 'Proceed', color: 'brandblue' },
      class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
    }).onCancel(() => {
      $router.replace({ params: { cartId: undefined } })
      $router.go(-1)
    })
  }
}

function findRiders() {
  const searchParams = { limit: 3, offset: 0, active: true }
  const data = {
    longitude: checkoutStorefront.value?.location?.longitude,
    latitude: checkoutStorefront.value?.location?.latitude,
    unit: "m",
    radius: 5000,
    sort: "asc",
  }

  const listParams = Object.assign({
    availability: getISOWithTimezone(new Date()),
  }, searchParams) 
  return Promise.all([
    backend.post('connecta-express/riders/search/', data, { params: searchParams }),
    backend.get('connecta-express/riders/', { params: listParams }),
  ]).then(responses => {
    const toArray = (val) => Array.isArray(val) ? val : []
    const riders = responses
      .map(response => toArray(response?.data?.results))
      .reduce((list, results) => list.concat(results), [])
      .map(Rider.parse)
      .filter((e, i, s) => s.findIndex(e1 => e1?.id === e?.id) === i)
    return riders
  })
}

function updateDeliveryFee() {
  loading.value = true
  loadingMsg.value = 'Calculating delivery fee'
  return backend.post(`connecta/checkouts/${checkout.value.id}/update_delivery_fee/`)
    .finally(() => resetFormData())
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      checkout.value.raw = response?.data
      resetFormData()
    })
    .catch(error => {
      const data = error?.response?.data
      formErrors.value.payment.deliveryFee = data?.detail
      return Promise.reject(error)
    })
    .finally(() => {
      loading.value = false
      loadingMsg.value = ''
    })
}

async function submitDeliveryAddress() {
  try {
    loading.value = true
    loadingMsg.value = 'Locating address'
    if (!validCoordinates.value) await geocode()
    if (!validCoordinates.value) {
      resetFormErrors()
      formErrors.value.delivery.detail = ['Unable to locate delivery address. Please pin location of address']
      return Promise.reject()
    }
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }

  return saveDeliveryAddress().then(() => updateDeliveryFee())
    .then(() => findRider({ replaceExisting: false }))
}

function saveDeliveryAddress() {
  loadingMsg.value = 'Updating address'
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
  .finally(() => resetFormErrors())
  .catch(error => {
    const data = error?.response?.data
    formErrors.value.delivery.detail = errorParser.toArray(data?.delivery_address?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.delivery_address?.location) 
    formErrors.value.delivery.firstName = errorParser.firstElementOrValue(data?.delivery_address?.first_name)
    formErrors.value.delivery.lastName = errorParser.firstElementOrValue(data?.delivery_address?.last_name)
    formErrors.value.delivery.phoneNumber = errorParser.firstElementOrValue(data?.delivery_address?.phone_number)
    formErrors.value.delivery.location = {
      address1: errorParser.firstElementOrValue(data?.delivery_address?.location?.address1),
      address2: errorParser.firstElementOrValue(data?.delivery_address?.location?.address2),
      street: errorParser.firstElementOrValue(data?.delivery_address?.location?.street),
      city: errorParser.firstElementOrValue(data?.delivery_address?.location?.city),
      state: errorParser.firstElementOrValue(data?.delivery_address?.location?.state),
      country: errorParser.firstElementOrValue(data?.delivery_address?.location?.country),
      longitude: errorParser.firstElementOrValue(data?.delivery_address?.location?.longitude),
      latitude: errorParser.firstElementOrValue(data?.delivery_address?.location?.latitude),
    }
    if (!formErrors.value.delivery.detail?.length) {
      if (Array.isArray(data)) formErrors.value.delivery.detail = data
      if (data?.detail) formErrors.value.delivery.detail = [data?.detail]
    }
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = ['Unable to update delivery info']
    return Promise.reject(error)
  })
  .finally(() => {
    loadingMsg.value = ''
  })
}

function savePayment() {
  loadingMsg.value = 'Updating payment'
  return updateCheckout({
    payment: { escrow_refund_address: formData.value.payment.escrowRefundAddress },
  })
  .finally(() => resetFormErrors())
  .catch(error => {
    const data = error?.response?.data
    formErrors.value.delivery.detail = errorParser.toArray(data?.non_field_errors)
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = errorParser.toArray(data?.payment?.non_field_errors)
    formErrors.value.payment.escrowRefundAddress = errorParser.firstElementOrValue(data?.payment?.escrow_refund_address)
    formErrors.value.payment.deliveryFee = errorParser.firstElementOrValue(data?.payment?.delivery_fee)

    if (!formErrors.value.delivery.detail?.length) {
      if (Array.isArray(data)) formErrors.value.delivery.detail = data
      if (data?.detail) formErrors.value.delivery.detail = [data?.detail]
    }
    if (!formErrors.value.delivery.detail?.length) formErrors.value.delivery.detail = ['Unable to update delivery info']
    return Promise.reject(error)
  })
  .finally(() => {
    loadingMsg.value = ''
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

async function completeCheckout() {
  const data = {
    rider_id: formData.value?.delivery?.rider?.id || undefined,
  }

  const dialog = $q.dialog({
    title: 'Creating order',
    progress: true,
    ok: false,
    persistent: true,
    class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
  })
  loading.value = true
  loadingMsg.value = 'Creating order'
  await updateBchPrice()
  return backend.post(`connecta/checkouts/${checkout.value.id}/complete/`, data)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })

      const orderId = response?.data?.id
      dialog.update({ title: 'Order placed!' }).onDismiss(() => {
        $router.replace({ name: 'app-marketplace-order', params: { orderId }})
      })
      return response
    })
    .catch(error => {
      const data = error?.response?.data
      const errorMessage = data?.detail ||
                           errorParser.firstElementOrValue(data?.non_field_errors) ||
                           errorParser.firstElementOrValue(data?.checkout_id) ||
                           'Encountered error in completing checkout'

      if (errorMessage === 'BCH price is not updated') updateBchPrice()
      dialog.update({ title: 'Error', message: errorMessage })
      return Promise.reject(error)
    })
    .then(() => {
      $store.dispatch('marketplace/refreshCart', {
        cartId: checkout.value?.cart?.id,
        existsInCache: true,
      })
    })
    .finally(() => {
      dialog.update({ progress: false, ok: true })
      loading.value = false
      loadingMsg.value = ''
    })
}

const checkoutStorefrontId = computed(() => checkout.value?.cart?.storefrontId)
watch(checkoutStorefrontId, () => {
  if (!checkout.value?.cart?.storefrontId) return
  $store.commit('marketplace/setActiveStorefrontId', checkout.value?.cart?.storefrontId)
  if (!checkoutStorefront.value?.id) fetchCheckoutStorefront()
})

const checkoutStorefront = computed(() => $store.getters['marketplace/getStorefront']?.(checkout.value?.cart?.storefrontId))
function fetchCheckoutStorefront() {
  if (!checkoutStorefrontId.value) Promise.reject()
  backend.get(`connecta/storefronts/${checkoutStorefrontId.value}/`)
    .then(response => $store.commit('marketplace/cacheStorefront', response?.data))
}

function displayStorefrontLocation() {
  if (!checkoutStorefront.value?.location?.validCoordinates) return

  return displayCoordinates({
    hideCancel: true,
    headerText: checkoutStorefront.value?.name,
    latitude: Number(checkoutStorefront.value?.location?.latitude),
    longitude: Number(checkoutStorefront.value?.location?.longitude),
  })
}

function displayDeliveryAddressLocation() {
  if (!checkout.value?.deliveryAddress?.location?.validCoordinates) return

  return displayCoordinates({
    hideCancel: true,
    headerText: 'Delivery address',
    latitude: Number(checkout.value?.deliveryAddress?.location?.latitude),
    longitude: Number(checkout.value?.deliveryAddress?.location?.longitude),
  })
}

function displayCoordinates(opts={latitude: 0, longitude: 0, headerText: undefined, hideCancel: undefined }) {
  $q.dialog({
    component: PinLocationDialog,
    componentProps: {
      static: true,
      headerText: opts?.headerText,
      hideCancel: opts?.hideCancel,
      initLocation: { latitude: opts?.latitude, longitude: opts?.longitude }
    }
  })
}

const bchAddress = computed(() => {
  return $store.getters['global/getWallet']('bch')?.lastAddress
})

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchCheckout().finally(() => resetFormData()).then(() => { updateBchPrice() }),
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
<style scoped lang="scss">
@media (min-width: $breakpoint-xs) {
  .review-panel-content {
    flex-direction: row-reverse;
  }
}
</style>
