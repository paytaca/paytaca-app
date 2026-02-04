<template>
  <div>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" v-bind="{ cartDialog: { value: showCartsDialog, toggle: toggleShowCartsDialog, cart: activeStorefrontCart } }"/>
      </keep-alive>
    </router-view>
    <div class="row items-center fixed-bottom q-pa-sm footer-panel">
      <q-space/>
      <q-btn
        v-if="!$route.meta?.hideCartBtn"
        class="button"
        :round="!activeStorefrontCart?.totalItemsCount"
        :rounded="Boolean(activeStorefrontCart?.totalItemsCount)"
        :icon="showCartsDialog ? 'close' : 'shopping_cart'"
        :label="activeStorefrontCart?.totalItemsCount || undefined"
        :padding="activeStorefrontCart?.totalItemsCount ? '15px 18px' : '18px'"
        @click="() => toggleShowCartsDialog()"
      />
    </div>
    <q-dialog v-model="showCartsDialog" position="bottom" @before-show="() => refreshActiveCart()">
      <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
        <q-card-section>
          <div class="row items-center no-wrap">
            <div class="text-h5">Cart</div>
            <div v-if="activeStorefrontCart?.id">#{{ activeStorefrontCart?.id }}</div>
            <q-space/>
            <q-btn
              no-caps
              flat
              :round="Boolean(customer?.fullName)"
              padding="sm"
              :to="{ name: 'app-marketplace-customer', query: { returnOnSave: true } }"
              v-close-popup
            >
              <div class="row items-center">
                <div class="ellipsis" style="max-width:10em;">{{ customer?.fullName }}</div>
                <q-icon class="q-pl-xs button button-text-primary" :class="getDarkModeClass(darkMode)" name="person"/>
              </div>
            </q-btn>
          </div>

          <div class="row no-wrap items-center">
            <q-btn
              v-if="activeStorefront?.id"
              no-caps flat
              padding="none"
              class="text-underline ellipsis"
              :to="{ name: 'app-marketplace-storefront', params: { storefrontId: activeStorefront?.id } }"
            >
              {{ activeStorefront?.name }}
              #{{ activeStorefront?.id }}
            </q-btn>
            <q-chip v-if="activeStorefront?.id && !activeStorefrontIsActive" class="text-white" color="grey" size="sm">
              Inactive
            </q-chip>
            <q-space/>
            <q-btn
              v-if="activeStorefrontCart?.items?.length"
              :disable="!activeStorefrontIsActive"
              no-caps
              flat
              label="Clear cart"
              color="red"
              padding="xs md"
              style="text-wrap:nowrap;"
              @click="$store.dispatch('marketplace/clearCart', activeStorefrontCart)"
            />
          </div>
          <div class="q-mt-sm">
            <div v-if="!activeStorefrontCart?.items?.length && activeStorefront?.id" class="text-center text-grey q-mb-md q-mt-lg">
              Add items to cart
            </div>
            <CartItemsList
              v-if="activeStorefrontCart?.items?.length"
              use-quantity-input
              :disable="activeStorefrontCart?.$state?.updating || !activeStorefrontIsActive"
              :cart="activeStorefrontCart"
              :currency="getStorefrontCurrency(activeStorefrontCart?.storefrontId)"
            />
          </div>
          <div
            v-if="activeStorefrontCart?.items?.length"
            class="row items-center no-wrap q-px-sm"
            style="position:relative;" v-ripple
            @click="() => updatingCutlery ? null : toggleCartCutlery()"
          >
            <q-checkbox
              dense
              class="q-mr-xs"
              :model-value="Boolean(activeStorefrontCart?.requireCutlery)"
              @click="() => updatingCutlery ? null : toggleCartCutlery()"
            />
            <div>
              <div class="text-subtitle2">{{ $t('Cutlery') }}</div>
              <div class="text-grey text-caption bottom">
                <template v-if="activeStorefrontCart?.requireCutlery">
                  {{ $t('CutleryIncludedMsg') }}
                </template>
                <template v-else>
                  {{ $t('CutleryNotIncludedMsg') }}
                </template>
              </div>
            </div>
            <q-space/>
            <q-spinner v-if="updatingCutlery" class="q-mr-sm"/>
            <div>
              {{ activeStorefrontCart?.cutlerySubtotal }}
              {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
            </div>
          </div>
          <div v-if="activeStorefrontCart?.markupSubtotal" class="row items-center q-mx-xs q-mt-md">
            <div class="text-h6 q-space q-pr-xs">Subtotal</div>
            <div class="text-body1">
              {{ activeStorefrontCart?.markupSubtotal }}
              {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
            </div>
          </div>
          <template
            v-if="activeStorefrontCart?.markupSubtotal && 
                  activeStorefront?.id == deliveryCalculation?.storefrontId &&
                  deliveryCalculation?.fee &&
                  activeStorefrontCartDeliveryType !== Checkout.DeliveryTypes.STORE_PICKUP
            "
          >
            <div class="row items-center q-mx-xs q-pl-md">
              <div class="q-space q-pr-xs">Delivery fee</div>
              <div class="">
                ~ {{ deliveryCalculation?.fee }}
                {{ deliveryCalculation?.currencySymbol || getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
              </div>
            </div>
          </template>
          <div v-if="activeStorefrontCart?.markupSubtotal" class="q-mt-sm">
            <q-btn
              v-close-popup
              no-caps
              :disable="!activeStorefrontIsActive || activeStorefrontCart.hasLackingQuantity"
              label="Checkout"
              class="full-width button"
              :to="{
                name: 'app-marketplace-checkout',
                query: {
                  cartId: activeStorefrontCart?.id,
                  deliveryType: activeStorefrontCartDeliveryType,
                },
              }"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
<script>
import { backend, cachedBackend, getSignerData } from 'src/marketplace/backend'
import { marketplaceRpc } from 'src/marketplace/rpc'
import { marketplacePushNotificationsManager } from 'src/marketplace/push-notifications'
import { updateOrCreateKeypair } from 'src/marketplace/chat'
import { Cart, CartItem, Checkout } from 'src/marketplace/objects'
import { useMarketplaceLocationManager } from 'src/composables/marketplace/session-location'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import CartItemFormDialog from 'src/components/marketplace/CartItemFormDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import CartItemsList from 'src/components/marketplace/product/CartItemsList.vue'
import { bus } from 'src/wallet/event-bus'

export default {
  name: 'MarketplaceLayout',
  components: {
    CartItemsList,
  },
  setup() {
    const $q = useQuasar()
    const $route = useRoute()
    const $router = useRouter()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const {
      initializeLocation,
      validSessionLocationCoordinates,
    } = useMarketplaceLocationManager();

    onUnmounted(() => marketplaceRpc.disconnect())

    const isInIndexPage = computed(() => $route.name === 'app-marketplace')
    /**
     * Use loadAppPromise to ensure other initialization
     * processes have the correct data (e.g. request signer, customer id, etc)
     * 
     * Best use setTimeout inside an onMounted hook to prevent race conditions, for example:
     *  onMounted(setTimeout(() => {
     *    // code here
     *  }, 100))
     */
    const initialized = ref(false)
    const loadingApp = ref(false)
    const loadAppMsg = ref('')
    const loadAppPromise = ref(null)
    watch(() => [$route.meta.skipInit], () => attemptLoadApp())
    onMounted(() => attemptLoadApp())
    async function attemptLoadApp() {
      await loadAppPromise.value?.catch?.()
      if ($route.meta.skipInit) return
      if (initialized.value) return
      return loadApp()
    }
    async function loadApp() {
      if (loadAppPromise.value) return loadAppPromise.value
      loadAppPromise.value = new Promise(async resolve => {
        try {
          loadingApp.value = true

          loadAppMsg.value = 'Loading customer data'
          await $store.dispatch('marketplace/refetchCustomerData')
          loadAppMsg.value = 'Authenticating'
          const signerData = await getSignerData()
          const walletHash = signerData?.value?.split(':')[0]
          const walletHashMatch = walletHash == customer.value?.paytacaWallet?.walletHash
          if (!customer.value?.id || !signerData?.value || !walletHashMatch) {
            loadAppMsg.value = 'Updating session'
            await $store.dispatch('marketplace/updatePrivkey').catch(error => {
              console.error(error)
              return $store.dispatch('marketplace/updateCustomerVerifyingPubkey')
            })
          }

          loadAppMsg.value = 'Updating address'
          await $store.dispatch('marketplace/refetchCustomerLocations')?.catch(console.error)

          loadAppMsg.value = 'Resolving location'
          await initializeLocation()

          const customerId = $store.getters['marketplace/customer']?.id
          loadAppMsg.value = 'Subscribing notifications'
          await subscribePushNotifications(customerId)
        } catch(error) {
          reject(error)
        } finally {
          resolve()
        }
      })

      bus.emit('marketplace-init-promise', loadAppPromise.value)
      const wasInitialized = initialized.value
      return loadAppPromise.value
        .then(() => {
          initialized.value = true
        })
        .finally(() => {
          loadAppMsg.value = ''
          loadingApp.value = false
          loadAppPromise.value = null
        })
        .then(async () => {
          await attemptPromptUserDetails().catch(console.error)

          setTimeout(() => {
            if (!wasInitialized && !validSessionLocationCoordinates({ ignoreExpired: true }) && isInIndexPage.value) {
              bus.emit('marketplace-manual-select-location')
            }
          }, 100)
        })
    }

    async function subscribePushNotifications(id) {
      if (!window.promptedPushNotificationsSettings) {
        const promptResponse = await promptEnablePushNotificationSetting(
          'Enable notifications to receive updates'
        ).catch(console.error)
        window.promptedPushNotificationsSettings = promptResponse.prompted
      }
      return marketplacePushNotificationsManager.subscribe({ customerId: id, multiWalletIndex: $store.getters['global/getWalletIndex']})
    }

    async function promptEnablePushNotificationSetting(message='') {
      const response = { isPushNotificationEnabled: null, prompted: false }
      const pushNotificationsStatusResponse = await marketplacePushNotificationsManager.isPushNotificationEnabled()
      response.isPushNotificationEnabled = pushNotificationsStatusResponse?.isEnabled
      if (response.isPushNotificationEnabled === false) {
        const openSettingsResponse = await marketplacePushNotificationsManager.openPushNotificationsSettingsPrompt({
          message: message || undefined,
        })
        response.isPushNotificationEnabled = openSettingsResponse?.isEnabled
        response.prompted = true
      }
      return response
    }

    async function attemptPromptUserDetails() {
      if (window.$promptedMarketplaceCustomerDetails) return Promise.resolve('Prompted')
      return promptUserDetails().then(() => {
        window.$promptedMarketplaceCustomerDetails = true
      })
    }

    async function promptUserDetails() {
      if (customer.value?.defaultLocation?.validCoordinates) return Promise.resolve('valid_coordinates')
      if ($route.name === 'app-marketplace-customer') return Promise.reject('already in customer page')

      // Check if we're on the marketplace index page and if there are any storefronts
      // Only skip if coordinates are valid (meaning storefronts could have been fetched)
      // and there are no storefronts after waiting for them to load
      if ($route.name === 'app-marketplace') {
        const customerCoordinates = $store.getters['marketplace/customerCoordinates']
        const hasValidCoordinates = customerCoordinates?.validCoordinates
        
        // Only check for storefronts if coordinates are valid (storefronts are only fetched with valid coordinates)
        if (hasValidCoordinates) {
          // Poll for storefronts to be loaded (they're fetched when index page loads)
          // Wait up to 3 seconds, checking every 200ms
          let attempts = 0
          const maxAttempts = 15 // 15 * 200ms = 3 seconds
          
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200))
            const storefronts = $store.getters['marketplace/storefronts']
            
            // If storefronts are found, show the dialog
            if (storefronts && storefronts.length > 0) {
              break // Exit loop and show dialog
            }
            
            attempts++
          }
          
          // After waiting, check one more time
          const storefronts = $store.getters['marketplace/storefronts']
          // If there are no storefronts after waiting, don't show the dialog
          if (!storefronts || storefronts.length === 0) {
            return Promise.resolve('no_storefronts')
          }
        }
        // If coordinates are not valid yet, show the dialog anyway (user needs to set location)
      }

      return new Promise((resolve, reject) => {
        $q.dialog({
          title: 'Setup customer info',
          message: 'Update address and other info for faster checkout',
          ok: { noCaps: true, label: 'Go', color: 'brandblue', class: 'button' },
          cancel: { noCaps: true, flat: true, label: 'Skip for now', color: 'grey' },
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode)}`
        }).onOk(() => {
          $router.push({
            name: 'app-marketplace-customer',
            query: { returnOnSave: true, hideStayOnPageOpt: true },
          })
          resolve('go')
        })
        .onCancel(() => resolve('skipped'))
        .onDismiss(() => reject('dismissed'))
      })
    }

    const customer = computed(() => $store.getters['marketplace/customer'])
    const interceptor = backend.interceptors.response.use(null, async (error) => {
      const errorMsg = String(error?.response?.data?.detail)
      if (error?.response?.status == 403 && errorMsg.indexOf('Invalid auth header') >= 0){
        if (errorMsg.indexOf('Invalid signature') >= 0 || errorMsg.indexOf('Customer not found') >= 0) {
          $store.dispatch('marketplace/updateCustomerVerifyingPubkey')
        }
      }
      return Promise.reject(error)
    })
    onUnmounted(() => backend.interceptors.response.eject(interceptor))

    const showCartsDialog = ref(false)
    function toggleShowCartsDialog() {
      showCartsDialog.value = !showCartsDialog.value
    }

    const activeStorefront = computed(() => $store.getters['marketplace/activeStorefront'])
    const activeStorefrontIsActive = computed(() => activeStorefront.value?.active)
    const activeStorefrontId = computed(() => activeStorefront.value?.id)
    watch(activeStorefrontId,() => {
      if (!activeStorefrontId.value) return
      $store.dispatch('marketplace/refreshActiveStorefrontCarts')
    })

    const updatingCutlery = ref(false)
    async function toggleCartCutlery() {
      try {
        if (!activeStorefrontCart.value) return
        updatingCutlery.value = true
        activeStorefrontCart.value.requireCutlery = !activeStorefrontCart.value.requireCutlery
        await saveCart(activeStorefrontCart.value)
      } finally {
        updatingCutlery.value = false
      }
    }

    const customerCoordinates = computed(() => $store.getters['marketplace/customerCoordinates'])
    const deliveryCalculation = ref({
      storefrontId: 0,
      fee: 0,
      currencySymbol: '',
      distance: 0,
      deliveryDuration: 0,
      preparationDuration: 0,
    })
    watch(() => activeStorefront.value?.id, () => clearDeliveryCalculation())
    watch(() => customerCoordinates, () => clearDeliveryCalculation(), { deep: true })
    function clearDeliveryCalculation() {
      deliveryCalculation.value = {
        storefrontId: 0,
        fee: 0,
        currencySymbol: '',
        distance: 0,
        deliveryDuration: 0,
        preparationDuration: 0,
      }
    }

    onMounted(() => bus.on('marketplace-storefront-delivery-calculation', onDeliveryFeeUpdate))
    onUnmounted(() => bus.off('marketplace-storefront-delivery-calculation', onDeliveryFeeUpdate))
    /**
     * @param {Object} data
     * @param {Number} data.storefrontId
     * @param {Number} data.fee
     * @param {String} data.currencySymbol
     * @param {Number} data.deliveryDuration
     * @param {Number} data.preparationDuration
     */
    function onDeliveryFeeUpdate(data) {
      if (!data) return
      deliveryCalculation.value = {...data}
    }

    const activeStorefrontCart = computed(() => $store.getters['marketplace/activeStorefrontCart'])
    const activeStorefrontCartDeliveryType = computed(() => {
      const storefrontId = activeStorefrontCart.value?.storefrontId
      const storefront = $store.getters['marketplace/getStorefront']?.(storefrontId)
      if (!storefront) return
    
      if (storefront?.isStorepickupOnly === true) return Checkout.DeliveryTypes.STORE_PICKUP
      return storefront?.deliveryTypes?.[0] || Checkout.DeliveryTypes.LOCAL_DELIVERY
    })
    function getStorefrontCurrency(storefrontId) {
      return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
    }

    async function saveCart(cart=Cart.parse()) {
      await $store.dispatch('marketplace/saveCart', cart)
    }

    async function refreshActiveCart() {
      const cartId = activeStorefrontCart.value?.id
      if (!cartId) return

      $store.dispatch('marketplace/refreshCart', { cartId, existInCache: true })
    }

    onMounted(() => setTimeout(async () => {
      await loadAppPromise.value?.catch?.(console.error)
      updateOrCreateKeypair()
    }, 100))
    watch(() => [customer?.id], () => updateOrCreateKeypair())

    function openCartItemDialog(cartItem=CartItem.parse()) {
      $q.dialog({
        component: CartItemFormDialog,
        componentProps: {
          cartItem: cartItem,
          currency: getStorefrontCurrency(activeStorefrontCart.value?.storefrontId)
        },
      })
        .onOk(data => {
          cartItem.quantity = data.quantity
          cartItem.properties = data.properties
          saveCart(activeStorefrontCart.value)
        })
    }

    return {
      Checkout,

      darkMode,
      loadingApp,
      loadAppMsg,

      customer,

      showCartsDialog,
      toggleShowCartsDialog,

      activeStorefront,
      deliveryCalculation,

      activeStorefrontCart,
      updatingCutlery,
      toggleCartCutlery,
      activeStorefrontCartDeliveryType,
      activeStorefrontIsActive,
      getStorefrontCurrency,
      saveCart,
      refreshActiveCart,

      openCartItemDialog,
    }
  },
  methods: {
    getDarkModeClass
  }
}
</script>
<style scoped>
.footer-panel {
  pointer-events: none;
}
.footer-panel * {
  pointer-events: auto;
}
.cat-items-list {
  display: grid;
  grid-template-columns: max-content min-content auto;
}
</style>
