<template>
  <div>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
    <q-fab
      color="brandblue"
      icon="shopping_cart"
      direction="up"
      :label="activeStorefrontCart?.totalItemsCount || undefined"
      padding="12px"
      style="position:fixed; bottom: 10px; right: 10px;"
      v-model="showCartsDialog"
    >
    </q-fab>
    <q-dialog v-model="showCartsDialog" position="bottom">
      <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
        <q-card-section>
          <div class="row items-center">
            <div class="text-h5">Cart</div>
            <div v-if="activeStorefrontCart?.id">#{{ activeStorefrontCart?.id }}</div>
          </div>
          <div v-if="activeStorefront?.id">
            {{ activeStorefront?.name }}
            #{{ activeStorefront?.id }}
          </div>

          <div v-if="activeStorefrontCart?.items?.length" class="row items-center">
            <q-space/>
            <q-btn
              no-caps
              flat
              label="Clear cart"
              color="red"
              padding="xs md"
              @click="$store.dispatch('marketplace/removeCart', { cartId: activeStorefrontCart?.id })"
            />
          </div>
          <div class="q-mt-sm">
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
                {{ cartItem?.variant?.price }}
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
          <div v-if="activeStorefrontCart?.subtotal" class="row items-center q-mx-xs q-mt-md">
            <div class="text-h6 q-space q-pr-xs">Subtotal</div>
            <div class="text-body1">
              {{ activeStorefrontCart?.subtotal }}
              {{ getStorefrontCurrency(activeStorefrontCart?.storefrontId) }}
            </div>
          </div>
          <div v-if="activeStorefrontCart?.subtotal" class="q-mt-sm">
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
import { Cart } from 'src/marketplace/objects'
import { useStore } from 'vuex'
import { ref, computed, watch } from 'vue'

export default {
  name: 'MarketplaceLayout',
  setup() {
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

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

    return {
      darkMode,

      showCartsDialog,

      activeStorefront,

      activeStorefrontCart,
      getStorefrontCurrency,
      saveCart,
    }
  },
}
</script>
