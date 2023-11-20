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
      <div class="row items-center">
        <div class="q-space text-h5 q-px-sm">{{ product?.name }}</div>
        <q-chip v-if="available == false" color="grey" text-color="white" class="q-ma-none">
          Unavailable
        </q-chip>
      </div>
      <q-btn
        v-if="collection?.id == collectionId" class="text-subtitle1 q-mx-sm"
        no-caps flat padding="none"
        :to="{ name: 'app-marketplace-collection', params: { collectionId: collection?.id } }"
      >
        {{ collection?.name }}
      </q-btn>

      <div class="row items-center justify-center">
        <q-spinner v-if="!initialized && fetchingProduct" size="4em" color="brandblue"/>
      </div>
      <div v-if="product?.description" class="q-mx-sm">
        {{ product?.description  }}
      </div>
      <div class="row items-start">
        <div
          v-if="selectedVariant?.imageUrl || product?.displayImageUrl"
          class="col-12 col-sm-8 q-pa-xs"
        >
          <q-img
            :src="selectedVariant?.imageUrl || product?.displayImageUrl"
            style="max-height:max(50vh, 400px);"
            class="rounded-borders"
          />
        </div>
        <div class="q-space q-pa-xs">
          <template v-if="product?.hasVariants">
            <q-item
              v-for="(variant, index) in product?.variants" :key="variant?.id"
              :active="variant === selectedVariant"
              clickable
              @click="selectedVariantIndex = index"
            >
              <q-item-section>
                <q-item-label>{{ variant?.name }}</q-item-label>
              </q-item-section>
              <q-item-section avatar>
                <q-item-label>
                  {{ variant?.markupPrice }} {{ currency }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
          <template v-else>
            <div class="text-subtitle1 text-center">{{ selectedVariant?.markupPrice }} {{ currency }}</div>
          </template>
          <div v-if="selectedVariant?.id">
            <q-input
              v-if="cartItem"
              :disable="!available"
              label="Quantity"
              dense outlined
              :dark="darkMode"
              type="number"
              v-model.number="cartItem.quantity"
              debounce="750"
              @update:model-value="() => saveActiveCart()"
            />
            <q-btn
              v-else
              :disable="!available"
              no-caps label="Add to cart"
              color="brandblue"
              class="full-width q-mt-md"
              @click="addSelectedVariantToCart()"
            />
          </div>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { Cart, Collection, Product } from 'src/marketplace/objects'
import { backend } from 'src/marketplace/backend'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'

const props = defineProps({
  collectionId: [Number, String],
  productId: [Number, String],
  variantId: [Number, String]
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  product.value.raw = null
  collection.value.raw = null
  initialized.value = false
}

onMounted(() => refreshPage())
watch(() => [props.productId], () => {
  resetPage()
  refreshPage()
})
watch(() => [props.variantId], () => selectVariantFromProps())

const activeStorefront = computed(() => $store.getters['marketplace/activeStorefront'])

const activeStorefrontCart = computed(() => $store.getters['marketplace/activeStorefrontCart'])
const cartItem = computed(() => {
  return activeStorefrontCart.value?.items?.find(item => item?.variant?.id == selectedVariant.value?.id)
})

function saveActiveCart() {
  $store.dispatch('marketplace/saveCart', activeStorefrontCart.value)
}

async function addSelectedVariantToCart() {
  const cart = activeStorefrontCart.value?.id ? activeStorefrontCart.value : Cart.parse({
    storefront_id: product.value?.storefrontId,
    customer: {
      ref: await $store.dispatch('marketplace/getCartRef'),
    },
    items: [],
  })
  if (!cart.items.some(item => item?.variant?.id === selectedVariant.value.id)) {
    cart.items.push({ variant: selectedVariant.value, quantity: 1 }) 
  }
  $store.dispatch('marketplace/saveCart', cart)
}

const collection = ref(Collection.parse())
const fetchingCollection = ref(false)
function fetchCollection() {
  if (!props?.collectionId) {
    collection.value = Collection.parse()
    return Promise.resolve()
  }

  fetchingCollection.value = true
  return backend.get(`connecta/collections/${props?.collectionId}/`)
    .then(response => {
      collection.value = Collection.parse(response?.data)
      return response
    })
    .finally(() => {
      fetchingCollection.value = false
    })
}

const product = ref(Product.parse())
const fetchingProduct = ref(false)
function fetchProduct() {
  fetchingProduct.value = true
  return backend.get(`products/${props?.productId}/`)
    .then(response => {
      product.value = Product.parse(response?.data)
      if (!initialized.value) selectVariantFromProps()
    })
    .finally(() => {
      fetchingProduct.value = false
    })
}

const available = computed(() => {
  const value = product.value.availableAtStorefront(activeStorefront.value?.id)
  if (typeof value == 'boolean') return value
  return true
})
watch(() => [activeStorefront.value?.id], () => product.value.fetchStorefrontProduct(activeStorefront.value?.id))


const currency = computed(() => {
  return $store.getters['marketplace/getStorefrontCurrency']?.(product.value?.storefrontId)
})

const selectedVariantIndex = ref(0)
const selectedVariant = computed(() => {
  if (!product.value.hasVariants) return product.value?.variants?.[0]
  return product.value?.variants?.[selectedVariantIndex.value]
})
function selectVariantFromProps() {
  const index = product.value.variants.findIndex(variant => variant?.id == props.variantId)
  selectedVariantIndex.value = Math.max(index, 0)
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchProduct(),
      fetchCollection(),
    ])
    selectedVariantIndex.value = 0
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', product.value?.storefrontId)
    initialized.value = true
    done()
  }
}
</script>
