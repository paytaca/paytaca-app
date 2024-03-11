<template>
  <div>
    <q-dialog v-model="loadingApp" persistent>
      <div class="q-pa-md row items-center">
        <div class="text-subtitle">Loading app</div>
        <q-spinner size="1.5em" class="q-ml-sm"/>
      </div>
    </q-dialog>
    <div v-if="$q.platform.is.ios" style="padding-top:25px;"></div>
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
    <q-dialog v-model="showCartsDialog" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
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
            <q-chip v-if="!activeStorefrontIsActive" class="text-white" color="grey" size="sm">
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
            <div
              v-for="cartItem in activeStorefrontCart?.items" :key="`${activeStorefrontCart?.id}-${cartItem?.variant?.id}`"
              class="row items-center no-wrap q-px-xs"
            >
              <div class="q-space">
                <q-btn
                  flat no-caps
                  padding="none"
                  @click="() => openCartItemDialog(cartItem)"
                >
                  <div class="row items-center justify-left no-wrap full-width text-left">
                    <q-img
                      v-if="cartItem?.variant?.itemImage"
                      :src="cartItem?.variant?.itemImage"
                      width="35px"
                      ratio="1"
                      style="min-width:35px;"
                      class="rounded-borders q-mr-xs"
                    />
                    <div class="q-space">
                      <div class="text-weight-medium">{{ cartItem?.variant?.itemName }}</div>
                      <div class="text-caption bottom">{{ cartItem?.propertiesText }} </div>
                    </div>
                  </div>
                </q-btn>
              </div>
              <div class="col-3 q-pa-xs">
                {{ cartItem?.variant?.markupPrice }}
                {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
              </div>
              <div class="col-3 q-pa-xs">
                <q-input
                  dense
                  outlined
                  :disable="activeStorefrontCart?.$state?.updating || !activeStorefrontIsActive"
                  :dark="darkMode"
                  type="number"
                  v-model.number="cartItem.quantity"
                  :debounce="750"
                  @update:model-value="() => saveCart(activeStorefrontCart)"
                >
                </q-input>
              </div>
            </div>
          </div>
          <div v-if="activeStorefrontCart?.markupSubtotal" class="row items-center q-mx-xs q-mt-md">
            <div class="text-h6 q-space q-pr-xs">Subtotal</div>
            <div class="text-body1">
              {{ activeStorefrontCart?.markupSubtotal }}
              {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
            </div>
          </div>
          <div v-if="activeStorefrontCart?.markupSubtotal" class="q-mt-sm">
            <q-btn
              v-close-popup
              no-caps
              :disable="!activeStorefrontIsActive"
              label="Checkout"
              class="full-width button"
              :to="{ name: 'app-marketplace-checkout', query: { cartId: activeStorefrontCart?.id } }"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>
<script>
import { backend, getSignerData } from 'src/marketplace/backend'
import { marketplaceRpc } from 'src/marketplace/rpc'
import { marketplacePushNotificationsManager } from 'src/marketplace/push-notifications'
import { updateOrCreateKeypair } from 'src/marketplace/chat'
import { Cart, CartItem } from 'src/marketplace/objects'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import CartItemFormDialog from 'src/components/marketplace/CartItemFormDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'MarketplaceLayout',
  setup() {
    const $q = useQuasar()
    const $route = useRoute()
    const $router = useRouter()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    onUnmounted(() => marketplaceRpc.disconnect())

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

          await $store.dispatch('marketplace/refetchCustomerData')
            .then(() => {
              const customerId = $store.getters['marketplace/customer']?.id
              subscribePushNotifications(customerId)
            })

          const signerData = await getSignerData()
          const walletHash = signerData?.value?.split(':')[0]
          const walletHashMatch = walletHash == customer.value?.paytacaWallet?.walletHash
          if (!customer.value?.id || !signerData?.value || !walletHashMatch) {
            await $store.dispatch('marketplace/updatePrivkey').catch(error => {
              console.error(error)
              return $store.dispatch('marketplace/updateCustomerVerifyingPubkey')
            })
          }
          $store.dispatch('marketplace/refetchCustomerLocations')
        } catch(error) {
          reject(error)
        } finally {
          resolve()
        }
      })

      return loadAppPromise.value
        .then(() => {
          initialized.value = true
        })
        .finally(() => {
          loadingApp.value = false
          loadAppPromise.value = null
        })
    }

    async function subscribePushNotifications(id) {
      if (!window.promptedPushNotificationsSettings) {
        const promptResponse = await promptEnablePushNotificationSetting(
          'Enable notifications to receive updates'
        ).catch(console.error)
        window.promptedPushNotificationsSettings = promptResponse.prompted
      }
      return marketplacePushNotificationsManager.subscribe(id)
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

    onMounted(() => setTimeout(async () => {
      await loadAppPromise.value?.catch?.(console.error)
      if (!window.$promptedMarketplaceCustomerDetails) {
        promptUserDetails()
          .then(response => {
            console.log(response)
            window.$promptedMarketplaceCustomerDetails = true
          })
      }
    }, 100))

    function promptUserDetails() {
      if (customer.value?.defaultLocation?.validCoordinates) return Promise.resolve('valid_coordinates')
      if ($route.name === 'app-marketplace-customer') return Promise.reject()

      return new Promise((resolve, reject) => {
        $q.dialog({
          title: 'Setup customer info',
          message: 'Update address and other info for faster checkout',
          ok: { noCaps: true, label: 'Go', color: 'brandblue', class: 'button' },
          cancel: { noCaps: true, flat: true, label: 'Skip', color: 'grey' },
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

    const activeStorefrontCart = computed(() => $store.getters['marketplace/activeStorefrontCart'])
    function getStorefrontCurrency(storefrontId) {
      return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
    }

    function saveCart(cart=Cart.parse()) {
      $store.dispatch('marketplace/saveCart', cart)
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
      darkMode,
      loadingApp,

      customer,

      showCartsDialog,
      toggleShowCartsDialog,

      activeStorefront,

      activeStorefrontCart,
      activeStorefrontIsActive,
      getStorefrontCurrency,
      saveCart,

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
