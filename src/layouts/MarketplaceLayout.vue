<template>
  <div>
    <q-dialog v-model="loadingApp" persistent>
      <div class="q-pa-md row items-center">
        <div class="text-subtitle">Loading app</div>
        <q-spinner size="1.5em" class="q-ml-sm"/>
      </div>
    </q-dialog>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <div class="row items-center fixed-bottom q-pa-sm footer-panel">
      <q-space/>
      <q-fab
        color="brandblue"
        icon="shopping_cart"
        direction="up"
        :label="activeStorefrontCart?.totalItemsCount || undefined"
        padding="12px"
        v-model="showCartsDialog"
      >
      </q-fab>
    </div>
    <q-dialog v-model="showCartsDialog" position="bottom">
      <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
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
              :to="{ name: 'app-marketplace-customer' }"
              v-close-popup
            >
              <div class="row items-center">
                <div class="ellipsis" style="max-width:10em;">{{ customer?.fullName }}</div>
                <q-icon name="person"/>
              </div>
            </q-btn>
          </div>

          <div class="row items-center">
            <q-btn
              v-if="activeStorefront?.id"
              no-caps flat
              padding="none"
              class="text-underline"
              :to="{ name: 'app-marketplace-storefront', params: { storefrontId: activeStorefront?.id } }"
            >
              {{ activeStorefront?.name }}
              #{{ activeStorefront?.id }}
            </q-btn>
            <q-space/>
            <q-btn
              v-if="activeStorefrontCart?.items?.length"
              no-caps
              flat
              label="Clear cart"
              color="red"
              padding="xs md"
              @click="$store.dispatch('marketplace/clearCart', activeStorefrontCart)"
            />
          </div>
          <div class="q-mt-sm">
            <div v-if="!activeStorefrontCart?.items?.length && activeStorefront?.id" class="text-center text-grey q-mb-md q-mt-lg">
              Add items to cart
            </div>
            <div
              v-for="cartItem in activeStorefrontCart?.items" :key="`${activeStorefrontCart?.id}-${cartItem?.variant?.id}`"
              dense
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
                {{ cartItem?.variant?.markupPrice }}
                {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
              </div>
              <div class="col-3 q-pa-xs">
                <q-input
                  dense
                  outlined
                  :disable="activeStorefrontCart?.$state?.updating"
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
              label="Checkout"
              color="brandblue"
              class="full-width"
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
import { Cart } from 'src/marketplace/objects'
import { useQuasar } from 'quasar'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export default {
  name: 'MarketplaceLayout',
  setup() {
    const $q = useQuasar()
    const $route = useRoute()
    const $router = useRouter()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    onUnmounted(() => marketplaceRpc.disconnect())
    const loadingApp = ref(false)
    onMounted(async () => {
      try {
        loadingApp.value = true
        await $store.dispatch('marketplace/refetchCustomerData')
          .then(() => {
            const customerId = $store.getters['marketplace/customer']?.id
            marketplacePushNotificationsManager.subscribe(customerId)
          })
        $store.dispatch('marketplace/refetchCustomerLocations')
        const signerData = await getSignerData()
        const walletHash = signerData?.value?.split(':')[0]
        const walletHashMatch = walletHash == customer.value?.paytacaWallet?.walletHash
        if (!customer.value?.id || !signerData?.value || !walletHashMatch) {
          await $store.dispatch('marketplace/updatePrivkey').catch(error => {
            console.error(error)
            return $store.dispatch('marketplace/updateCustomerVerifyingPubkey')
          })
        }

        if (!window.$promptedMarketplaceCustomerDetails) {
          promptUserDetails()
            .then(response => {
              console.log(response)
              window.$promptedMarketplaceCustomerDetails = true
            })
        }
      } finally {
        loadingApp.value = false
      }
    })

    function promptUserDetails() {
      if (customer.value?.defaultLocation?.validCoordinates) return Promise.resolve('valid_coordinates')
      if ($route.name === 'app-marketplace-customer') return Promise.reject()

      return new Promise((resolve, reject) => {
        $q.dialog({
          title: 'Setup customer info',
          message: 'Update address and other info for faster checkout',
          ok: { noCaps: true, label: 'Go', color: 'brandblue' },
          cancel: { noCaps: true, flat: true, label: 'Skip', color: 'grey' },
          class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
        }).onOk(() => {
          $router.push({ name: 'app-marketplace-customer' })
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

    const activeStorefront = computed(() => $store.getters['marketplace/activeStorefront'])
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

    onMounted(() => updateOrCreateKeypair())
    watch(() => [customer?.id], () => updateOrCreateKeypair())

    return {
      darkMode,
      loadingApp,

      customer,

      showCartsDialog,

      activeStorefront,

      activeStorefrontCart,
      getStorefrontCurrency,
      saveCart,
    }
  },
}
</script>
<style scoped>
.footer-panel {
  pointer-events: none;
}
.footer-panel * {
  pointer-events: auto;
}
</style>
