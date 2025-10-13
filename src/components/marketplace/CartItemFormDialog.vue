<template>
  <q-dialog
    v-model="innerVal"
    ref="dialogRef"
    @hide="onDialogHide"
    position="bottom"
    full-height
    :data-update-key="updateKey" 
  >
  <!-- `updateKey` for force update purposes -->
    <q-card
      class="dialog-content-base bottom-card"
      :class="darkMode ? 'text-white pt-card-3' : 'text-black'"
      style="max-height:60vh !important;"
    >
      <div class="row items-center no-wrap dialog-content-header">
        <div class="text-h6">{{ $t('CartItem') }}</div>
        <q-space/>
        <q-btn v-close-popup flat icon="close" class="q-r-mr-sm"/>
      </div>
      <q-card-section class="q-pt-none">
        <div class="row items-center q-pl-sm">
          <q-space/>
          <q-btn
            dense
            flat no-caps
            :label="$t('GoToProductPage')"
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
            <div class="text-subtitle1">{{ $t('Options') }}</div>
            <JSONFormPreview
              v-model="cartOptionsFormData"
              v-model:formDataErrors="cartOptionsFormErrors"
              :schemaData="cartOptions"
            />
          </q-card-section>
        </q-card>
        <div v-if="fetchingAddons" class="text-center text-body1 q-pa-md text-grey">
          {{ $t('LoadingAddonOptions') }}
          <q-spinner/>
        </div>
        <template v-if="addonOptions?.length">
          <div class="text-h6">Addons</div>
          <AddonsForm
            ref="addonsForm"
            :addons="addonOptions"
            :currency="currency"
            v-model="addonsFormData"
          />
        </template>
        <q-input
          :label="$t('Quantity')"
          dense outlined
          :dark="darkMode"
          type="number"
          v-model.number="quantity"
          bottom-slots
        >
          <template v-slot:prepend>
            <q-btn
              flat
              padding="xs"
              icon="remove"
              @click="() => quantity > 0 ? quantity-- : null"
            />
          </template>
          <template v-slot:append>
            <q-btn
              flat
              padding="xs"
              icon="add"
              @click="() => quantity++"
            />
          </template>
        </q-input>
        <q-btn
          :disable="addonsFormError?.length > 0"
          no-caps
          :label="$t('OK')"
          color="pt-primary1"
          class="full-width"
          @click="() => submit()"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { cachedBackend } from 'src/marketplace/backend';
import { useDialogPluginComponent } from 'quasar'
import { Addon, CartItem } from 'src/marketplace/objects';
import { useStore } from 'vuex';
import { computed, ref, watch, watchEffect } from 'vue';
import JSONFormPreview from './JSONFormPreview.vue';
import AddonsForm from './product/AddonsForm.vue';

const $emit = defineEmits([
  'update:modelValue',
  ...useDialogPluginComponent.emits,
])

const props = defineProps({
  modelValue: Boolean,
  cartItem: CartItem,
  currency: String,
})

const updateKey = ref(0) // for force update purposes

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const innerVal = ref(props.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))

watchEffect(() => {
  if (props.cartItem?.properties?.schema) return
  const product = props.cartItem?.variant?.product
  if (!product?.hasCartOptions || product?.cartOptions !== undefined) return
  product?.fetchCartOptions?.()
  updateKey.value = updateKey.value + 1
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


const addonsForm = ref()
const addonsFormError = computed(() => {
  if (!addonsForm.value) return []
  if (Array.isArray(addonsForm.value?.errors)) return addonsForm.value.errors
  return []
})
const addonsFormData = ref([].map(() => {
  return { addonOptionId: 0, inputValue: '' }
}))
const addonOptions = ref([].map(Addon.parse))
const fetchingAddons = ref(false)
watch(() => props.cartItem?.variant?.product?.id, () => {
  syncAddonsFormData()
  fetchAddonOptions()
}, { immediate: true }) // to trigger onCreate
function fetchAddonOptions() {
  const productId = props.cartItem?.variant?.product?.id
  if (!productId) return Promise.resolve()

  const params = { ids: productId }
  fetchingAddons.value = true
  return cachedBackend.get('products/addons/', { params })
    .then(response => {
      const result = response?.data?.results?.find?.(_result => _result?.id == productId)
      if (result) {
        addonOptions.value = result.addons.map(Addon.parse)
      }
      return response
    })
    .finally(() => {
      fetchingAddons.value = false
    })
}
function syncAddonsFormData() {
  if (!Array.isArray(props.cartItem?.addons)) {
    addonsFormData.value = []
    return
  }

  addonsFormData.value = props.cartItem.addons.map(addon => {
    return {
      addonOptionId: addon?.addonOptionId,
      inputValue: addon?.inputValue,
    }
  }).filter(addon => addon.addonOptionId)
}

function submit() {
  addonsForm.value?.validate?.()
  if (cartOptionsHasErrors.value) return
  if (addonsFormError.value?.length > 0) return

  let properties
  if (cartOptionsFormData.value && Object.getOwnPropertyNames(cartOptionsFormData.value)?.length) {
    properties = { schema: cartOptions.value, data: cartOptionsFormData.value }
  }
  onDialogOK({
    quantity: quantity.value,
    variant: props.cartItem?.variant,
    properties: properties,
    addons: addonsFormData.value,
  })
}
</script>
<style lang="scss" scoped>

.dialog-content-base {
  overflow: auto;
  background-color: white;
}

.dialog-content-base .dialog-content-header {
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: inherit;
  padding: map-get($space-md, 'y') map-get($space-md, 'x');
}

body.body--dark .dialog-content-base {
  background-color: $dark;
}
</style>
