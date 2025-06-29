<template>
  <div>
    <div
      v-for="cartItem in cart?.items" :key="cartItem?.variant?.id"
      class="cart-item-container"
      style="position:relative;" v-ripple
    >
      <q-menu touch-position class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
        <q-item
          clickable v-ripple v-close-popup
          @click="() => disable ? null : openCartItemDialog(cartItem)"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('EditItem') }}
            </q-item-label>
          </q-item-section>  
        </q-item>
        <q-item
          clickable v-ripple v-close-popup
          @click="() => disable ? null : removeItemConfirm(cartItem)"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('RemoveItem') }}
            </q-item-label>
          </q-item-section>  
        </q-item>
        <q-separator/>
        <q-item
          clickable v-ripple v-close-popup
          :to="{
            name: 'app-marketplace-product',
            params: { productId: cartItem?.variant?.product?.id },
            query: { variantId: cartItem?.variant?.id },
          }"
        >
          <q-item-section>
            <q-item-label>
              {{ $t('GoToPage') }}
            </q-item-label>
          </q-item-section>  
        </q-item>
      </q-menu>
      <div class="row items-center no-wrap q-px-xs">
        <div class="q-space">
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
        </div>
        <div class="col-2 q-pa-xs text-center">
          <div v-if="useQuantityInput" class="row items-center no-wrap">
            <div @click.stop>
              <q-input
                prefix="x"
                dense
                outlined
                :disabled="disable"
                :model-value="cartItem.quantity"
                no-error-icon
                hide-bottom-space
                :error="cartItem.lackingQuantity > 0"
                class="quantity-input"
                @update:model-value="value => updateQuantity(value, cart, cartItem)"
              />
            </div>
          </div>
          <div v-else style="white-space: nowrap;"> x {{ cartItem?.quantity }}</div>
        </div>
        <div class="col-3 q-pa-xs text-right">
          {{ round(cartItem?.variant?.markupPrice * cartItem.quantity, 2) }} {{ currency }}
        </div>
      </div>
      <div v-if="cartItem?.addons?.length" class="text-grey q-pl-lg">{{ $t('Addons') }}:</div>
      <div
        v-for="(addon, index) in cartItem.addons" :key="index"
        class="q-pl-lg q-pr-sm row items-center addon-item"
      >
        <div class="q-space">
          {{ addon?.label }}
          <span v-if="addon?.inputValue" class="text-grey ellipsis">
            ({{ addon?.inputValue }})
          </span>
        </div>
        <q-space/>
        <div>{{ round(addon?.markupPrice * cartItem?.quantity, 2) }} {{ currency }}</div>
      </div>
      <div v-if="cartItem.lackingQuantity > 0" class="text-red text-caption">
        Not enough stocks
      </div>
    </div>
  </div>
</template>
<script>
import { Cart, CartItem } from 'src/marketplace/objects'
import { round } from 'src/marketplace/utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { debounce, useQuasar } from 'quasar';
import { computed, defineComponent } from 'vue'
import CartItemFormDialog from '../CartItemFormDialog.vue';
import { useI18n } from "vue-i18n"

export default defineComponent({
  name: 'CartItemsList',
  props: {
    cart: Cart,
    currency: String,
    disable: Boolean,
    useQuantityInput: Boolean,
  },
  setup(props) {
    const { t } = useI18n()
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    function openCartItemDialog(cartItem=CartItem.parse()) {
      const cart = props.cart
      $q.dialog({
        component: CartItemFormDialog,
        componentProps: {
          cartItem: cartItem,
          currency: props.currency,
        },
      })
        .onOk(data => {
          cartItem.quantity = data.quantity
          cartItem.properties = data.properties
          if (Array.isArray(data.addons)) cartItem.addons = data.addons
          saveCart(cart)
        })
    }

    function saveCart(cart=Cart.parse()) {
      $store.dispatch('marketplace/saveCart', cart)
    }

    
    const updateQuantity = debounce(function(quantity, cart=Cart.parse(), cartItem=CartItem.parse()) {
      if (!Number.isSafeInteger(quantity) && quantity === undefined) return
      if (!cart.items?.includes?.(cartItem)) return
      if (!cartItem) return
      if (cartItem.quantity === parseInt(quantity)) return
      cartItem.quantity = quantity
      saveCart(cart)
    }, 1000)

    const debouncedSaveCart = debounce(saveCart, 1000)

    function removeItemConfirm(cartItem=CartItem.parse()) {
      const cart = props.cart
      $q.dialog({
        title: t('RemoveItem'),
        message: t(
          'RemoveItemPromptMsg',
          { name: cartItem?.variant?.itemName },
          `Remove item '${cartItem?.variant?.itemName}'. Are you sure?`
        ),
        color: 'brandlue',
        ok: { label: t('RemoveItem'), noCaps: true, color: 'red' },
        cancel: { noCaps: true, flat: true },
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
      })
        .onOk(() => {
          cartItem.quantity = undefined
          saveCart(cart)
        })
    }

    return {
      darkMode,
      updateQuantity,
      openCartItemDialog,
      removeItemConfirm,

      round,
      getDarkModeClass,
    }
  }
})
</script>
<style lang="scss" scoped>
.addon-item {
  padding-left: calc(35px + map-get($space-sm, 'x') + 10px);
}
.cart-item-container {
  margin-bottom: map-get($space-md, 'y');
}
.quantity-input {
  min-width:3.5em;
}
:deep(.quantity-input .q-field__control) {
  padding: 0 8px;
}

body.body--light .quantity-input {
  color: black;
}
</style>
