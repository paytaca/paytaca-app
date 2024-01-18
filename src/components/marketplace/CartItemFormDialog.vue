<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom" full-height>
    <q-card :class="darkMode ? 'text-white pt-card-3' : 'text-black'">
      <q-card-section>
        <div class="row items-center no-wrap">
          <div class="text-h6">Cart Item</div>
          <q-space/>
          <q-btn v-close-popup flat icon="close" class="q-r-mr-sm"/>
        </div>
        <div class="row items-center q-pl-sm">
          <q-space/>
          <q-btn
            dense
            flat no-caps
            label="Go to product page"
            class="text-underline"
            :to="{
              name: 'app-marketplace-product',
              params: { productId: cartItem?.variant?.product?.id },
              query: { variantId: cartItem?.variant?.id },
            }"
          />
        </div>
        <div class="row items-center justify-center no-wrap">
          <q-img
            v-if="cartItem?.variant?.itemImage"
            :src="cartItem?.variant?.itemImage"
            width="50px"
            ratio="1"
            class="rounded-borders q-mr-xs"
            style="min-width:50px;"
          />
          <div class="text-h6 ellipsis">{{ cartItem?.variant?.itemName }}</div>
        </div>
        <div class="text-subtitle1 text-center">{{ cartItem?.variant?.markupPrice }} {{ currency }}</div>
        <q-card v-if="cartOptions?.length" class="q-my-sm pt-card" :class="darkMode ? 'dark' : ''">
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1">Options</div>
            <JSONFormPreview
              v-model="cartOptionsFormData"
              v-model:formDataErrors="cartOptionsFormErrors"
              :schemaData="cartOptions"
            />
          </q-card-section>
        </q-card>
        <q-input
          label="Quantity"
          dense outlined
          :dark="darkMode"
          type="number"
          v-model.number="quantity"
          bottom-slots
        />
        <q-btn
          no-caps
          label="OK"
          color="brandblue"
          class="full-width"
          @click="() => submit()"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
import { CartItem } from 'src/marketplace/objects';
import { useStore } from 'vuex';
import { computed, ref, watch, watchEffect } from 'vue';
import JSONFormPreview from './JSONFormPreview.vue';

const $emit = defineEmits([
  'update:modelValue',
  ...useDialogPluginComponent.emits,
])

const props = defineProps({
  modelValue: Boolean,
  cartItem: CartItem,
  currency: String,
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const innerVal = ref(props.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))

watchEffect(() => {
  if (props.cartItem?.properties?.schema) return
  const product = props.cartItem?.variant?.product
  console.log('product?.hasCartOptions', product?.hasCartOptions)
  console.log('product?.hasCartOptions !== undefined', product?.hasCartOptions !== undefined)
  if (!product?.hasCartOptions || product?.cartOptions !== undefined) return
  product?.fetchCartOptions?.()
})

const quantity = ref(Number(props.cartItem?.quantity))
watch(() => [props.cartItem], () => quantity.value = Number(props.cartItem?.quantity))

const cartOptions = computed(() => {
  return props.cartItem?.properties?.schema || props.cartItem?.variant?.product?.cartOptions
})

watch(cartOptions, () => resetCartOptionsFormData(), { deep: true })
watch(() => [props.cartItem], () => resetCartOptionsFormData())
const cartOptionsFormData = ref(props.cartItem?.properties?.data || {})
function resetCartOptionsFormData() {
  cartOptionsFormData.value = props.cartItem?.properties?.data || {}
}

const cartOptionsFormErrors = ref([])
const cartOptionsHasErrors = computed(() => Boolean(cartOptionsFormErrors.value?.length))
watch(() => [props.cartItem], () => cartOptionsFormErrors.value=[], { deep: true })

function submit() {
  if (cartOptionsHasErrors.value) return

  let properties
  if (cartOptionsFormData.value && Object.getOwnPropertyNames(cartOptionsFormData.value)?.length) {
    properties = { schema: cartOptions.value, data: cartOptionsFormData.value }
  }
  onDialogOK({
    quantity: quantity.value,
    variant: props.cartItem?.variant,
    properties: properties,
  })
}
</script>
