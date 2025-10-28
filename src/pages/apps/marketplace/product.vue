<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />
    <div class="q-pa-sm q-pt-md" :class="{'text-black': !darkMode }">
      <div class="row items-center no-wrap q-px-sm">
        <div class="text-h5">{{ product?.name }}</div>
        <q-chip v-if="available == false" color="grey" text-color="white" class="q-my-none">
          {{ $t('Unavailable') }}
        </q-chip>
        <q-space/>
        <div
          v-if="product?.reviewSummary?.count"
          class="text-right text-caption text-grey"
          @click="() => openReviewsDialog = true"
        >
          <div class="row items-center no-wrap">
            <q-rating
              readonly
              max="5"
              :model-value="product?.reviewSummary?.averageRating * (5 / 100)"
              size="1.25em"
              color="brandblue"
              class="no-wrap"
              icon-half="star_half"
            />
            <div>
              {{ roundRating(product?.reviewSummary?.averageRating) }}
            </div>
          </div>
          <div>
            ({{ product?.reviewSummary?.count }}
            {{ product?.reviewSummary?.count === 1 ? 'review' : 'reviews' }})
          </div>
        </div>
        <q-btn
          v-else-if="product?.id && canReview"
          flat
          no-caps label="Rate product"
          color="grey"
          padding="xs sm"
          class="q-r-mr-sm"
          @click="() => rateProduct()"
        />
        <ReviewsListDialog ref="reviewsListDialog" v-model="openReviewsDialog" :product-id="productId">
          <template v-slot:bottom>
            <q-btn
              v-if="!productReview?.id && canReview"
              no-caps label="Rate product"
              color="brandblue"
              padding="xs sm"
              class="full-width"
              @click="() => rateProduct()"
            />
            <div v-else class="q-pa-sm q-mt-sm shadow-1" :class="getDarkModeClass(darkMode, 'pt-card-3')">
              <q-btn
                flat icon="edit"
                padding="xs"
                class="float-right"
                @click="() => rateProduct()"
              />
              <div>Your review</div>
              <q-rating
                readonly
                max="5"
                :model-value="productReview?.rating * (5 / 100)"
                color="brandblue"
                icon-half="star_half"
              />
              <div v-if="productReview?.imagesUrls?.length" class="text-caption text-grey top bottom">
                {{ productReview?.imagesUrls?.length }} {{ productReview?.imagesUrls?.length === 1 ? 'image' : 'images' }}
              </div>
              <div class="text-grey text-caption ellipsis">
                {{ productReview?.text }}
              </div>
            </div>
          </template>
        </ReviewsListDialog>
      </div>
      <q-btn
        v-if="collectionId && collection?.id == collectionId" class="text-subtitle1 q-mx-sm"
        no-caps flat padding="none"
        :to="{ name: 'app-marketplace-collection', params: { collectionId: collection?.id } }"
      >
        {{ collection?.name }}
      </q-btn>

      <div class="row items-center justify-center">
        <q-spinner v-if="!initialized && fetchingProduct" size="4em" color="primary"/>
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
            @click="() => openImage(
              selectedVariant?.imageUrl || product?.displayImageUrl,
              selectedVariant?.imageUrl ? selectedVariant?.name : product?.name,
            )"
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
          <q-card
            v-if="product?.cartOptions?.length"
            class="q-my-sm pt-card"
            :class="getDarkModeClass(darkMode)"
          >
            <q-card-section>
              <div class="text-subtitle1">Options</div>
              <JSONFormPreview
                v-model="cartOptionsFormData"
                v-model:formDataErrors="cartOptionsFormErrors"
                :schemaData="product?.cartOptions"
              />
            </q-card-section>
          </q-card>
          <template v-if="product?.addons?.length">
            <div class="text-h6">Addons</div>
            <AddonsForm
              ref="addonsForm"
              :disable="!available || !activeStorefrontIsActive || cartOptionsHasErrors || savingActiveCart"
              :addons="product?.addons"
              :currency="currency"
              v-model="addonsFormData"
              :debounce="750"
            />
          </template>
          <div v-if="selectedVariant?.id">
            <div v-if="requireStocks" class="row items-center q-px-sm">
              <div>
                {{ selectedVariant?.availableStocks ? `In stock: ${selectedVariant?.availableStocks}` : 'No stocks' }}
              </div>
              <q-space/>
              <div v-if="!cartItemHasStocks" class="text-red">
                Not enough stocks
              </div>
            </div>
            <q-input
              v-if="cartItem"
              :disable="disableAddToCart"
              label="Quantity"
              dense outlined
              :dark="darkMode"
              type="number"
              v-model.number="cartItemQuantity"
              class="q-mt-md"
              @update:model-value="() => saveActiveCartDebounced()"
            >
              <template v-slot:prepend>
                <q-btn
                  :disable="disableAddToCart"
                  flat
                  padding="xs"
                  icon="remove"
                  @click="() => {
                    cartItemQuantity--;
                    saveActiveCartDebounced();
                  }"
                />
              </template>
              <template v-slot:append>
                <q-btn
                  :disable="disableAddToCart"
                  flat
                  padding="xs"
                  icon="add"
                  @click="() => {
                    cartItemQuantity++;
                    saveActiveCartDebounced();
                  }"
                />
              </template>
            </q-input>
            <q-btn
              v-else
              :disable="disableAddToCart"
              no-caps label="Add to cart"
              class="full-width q-mt-md button"
              @click="addSelectedVariantToCart()"
            />
          </div>
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { Cart, Collection, Product, Review } from 'src/marketplace/objects'
import { backend, getCachedBackend } from 'src/marketplace/backend'
import { roundRating } from 'src/marketplace/utils'
import { debounce, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import ImageViewerDialog from 'src/components/marketplace/ImageViewerDialog.vue'
import JSONFormPreview from 'src/components/marketplace/JSONFormPreview.vue'
import ReviewFormDialog from 'src/components/marketplace/reviews/ReviewFormDialog.vue'
import ReviewsListDialog from 'src/components/marketplace/reviews/ReviewsListDialog.vue'
import AddonsForm from 'src/components/marketplace/product/AddonsForm.vue'
import { onUnmounted } from 'vue'
import { onDeactivated } from 'vue'


const cachedBackend = getCachedBackend({ ttl: 30 * 1000 })

const props = defineProps({
  collectionId: [Number, String],
  productId: [Number, String],
  variantId: [Number, String]
})

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  product.value.raw = null
  delete product.value.addons
  delete product.value.cartOptions
  collection.value.raw = null
  initialized.value = false
  productReview.value = null
  if (reviewsListDialog.value?.reviews) reviewsListDialog.value.reviews = []
}

onMounted(() => refreshPage())
watch(() => [props.productId], () => {
  resetPage()
  refreshPage()
})
watch(() => [props.variantId], () => selectVariantFromProps())

const customer = computed(() => $store.getters['marketplace/customer'])

const storefrontId = computed(() => product.value?.storefrontId)
onActivated(() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})
const activeStorefront = computed(() => $store.getters['marketplace/activeStorefront'])
const activeStorefrontIsActive = computed(() => activeStorefront.value?.active)

const collection = ref(Collection.parse())
const fetchingCollection = ref(false)
function fetchCollection() {
  if (!props?.collectionId) {
    collection.value = Collection.parse()
    return Promise.resolve()
  }

  fetchingCollection.value = true
  return cachedBackend.get(`connecta/collections/${props?.collectionId}/`)
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
  return cachedBackend.get(`products/${props?.productId}/`)
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
const requireStocks = computed(() => {
  const value = product.value.requireStocksAtStorefront(activeStorefront.value?.id)
  if (typeof value == 'boolean') return value
  return false
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

const selectedVariantHasStocks = computed(() => {
  if (!selectedVariant.value) return false
  if (!requireStocks.value) return true
  return selectedVariant.value.availableStocks > 0
})

const activeStorefrontCart = computed(() => $store.getters['marketplace/activeStorefrontCart'])
const cartItem = computed(() => {
  return activeStorefrontCart.value?.items?.find(item => item?.variant?.id == selectedVariant.value?.id)
})

const cartItemQuantity = ref(0)
watch(() => cartItem.value?.quantity, () => cartItemQuantity.value = cartItem.value?.quantity)
watch(cartItemQuantity, () => {
  if (!cartItem.value) return
  cartItem.value.quantity = cartItemQuantity.value
})

const cartItemHasStocks = computed(() => {
  if (!requireStocks.value) return true
  if (!cartItem.value?.quantity) return true
  return cartItem.value?.quantity <= selectedVariant.value?.availableStocks
})

const savingActiveCart = ref(false)
async function saveActiveCart() {
  if (cartOptionsHasErrors.value) return
  try {
    savingActiveCart.value = true
    await $store.dispatch('marketplace/saveCart', activeStorefrontCart.value)
  } finally {
    savingActiveCart.value = false
  }
}

const saveActiveCartDebounced = debounce((...args) => saveActiveCart(...args), 750)

const disableAddToCart = computed(() => {
  return !available.value ||
        !selectedVariantHasStocks.value ||
        !activeStorefrontIsActive.value ||
        cartOptionsHasErrors.value ||
        savingActiveCart.value ||
        addonsFormError.value?.length > 0
})
async function addSelectedVariantToCart() {
  addonsForm.value?.validate?.()
  if (addonsFormError.value?.length > 0) return
  if (cartOptionsHasErrors.value) return
  const cart = activeStorefrontCart.value?.id ? activeStorefrontCart.value : Cart.parse({
    storefront_id: product.value?.storefrontId,
    customer: {
      ref: await $store.dispatch('marketplace/getCartRef'),
    },
    items: [],
  })
  if (!cart.items.some(item => item?.variant?.id === selectedVariant.value.id)) {
    cart.items.push({
      variant: selectedVariant.value, quantity: 1,
      properties: {
        schema: product.value?.cartOptions,
        data: cartOptionsFormData.value,
      },
      addons: addonsFormData.value.map(addonData => {
        return {
          addonOptionId: addonData.addonOptionId,
          inputValue: addonData.inputValue,
        }
      })
    })
  }
  $store.dispatch('marketplace/saveCart', cart)
}

function serializeCartOptionsData(data) {
  try {
    if (Object.keys(data).length === 0) return
    return JSON.stringify(data)
  } catch {
    // console.error(error)
    return
  }
}
watch(() => [product.value?.cartOptions], () => resetCartOptionsFormData(), { deep: true })
watch(cartItem, () => resetCartOptionsFormData())
const cartOptionsFormData = ref(cartItem.value?.properties?.data || {})
watch(cartOptionsFormData, () => {
  if (!cartItem.value) return
  const serializedCartOptions = serializeCartOptionsData(cartItem.value.properties?.data)
  const serializedFormCartOptions = serializeCartOptionsData(cartOptionsFormData.value)
  if (serializedCartOptions === serializedFormCartOptions) return
  if (cartOptionsHasErrors.value) return

  cartItem.value.properties = {
    schema: product.value?.cartOptions,
    data: cartOptionsFormData.value,
  }

  console.log('saving')
  saveActiveCart()
}, { flush: 'post' })
function resetCartOptionsFormData() {
  cartOptionsFormData.value = cartItem.value?.properties?.data || {}
}

const cartOptionsFormErrors = ref([])
const cartOptionsHasErrors = computed(() => Boolean(cartOptionsFormErrors.value?.length))
watch(() => [product.value?.cartOptions], () => cartOptionsFormErrors.value=[], { deep: true })


const addonsForm = ref()
const addonsFormError = computed(() => {
  if (!addonsForm.value) return []
  if (Array.isArray(addonsForm.value?.errors)) return addonsForm.value.errors
  return []
})
const addonsFormData = ref([].map(() => {
  return { addonOptionId: 0, inputValue: '' }
}))
watch(selectedVariant, () => addonsForm.value?.resetValidation())
watch(() => [product.value?.addons, cartItem.value?.addons], () => syncAddonsFormData())
watch(addonsFormData, () => {
  if (!cartItem.value) return
  if (addonsFormError.value?.length > 0) return

  const normalize = data => {
    return data?.
      map(lineItemAddon => {
        return { addonOptionId: lineItemAddon?.addonOptionId, inputValue: lineItemAddon?.inputValue }
      })
      .sort((obj1, obj2) => obj1.addonOptionId - obj2.addonOptionId)
  }

  const normalizedCartItemData = normalize(cartItem.value?.addons)
  const normalizedFormData = normalize(addonsFormData.value)
  console.log({normalizedCartItemData, normalizedFormData})
  if (JSON.stringify(normalizedCartItemData) == JSON.stringify(normalizedFormData)) return

  cartItem.value.addons = normalizedFormData
  saveActiveCart()
}, { immediate: true })

function syncAddonsFormData() {
  if (!Array.isArray(cartItem.value?.addons)) {
    addonsFormData.value = []
    return
  }

  addonsFormData.value = cartItem.value.addons.map(addon => {
    return {
      addonOptionId: addon?.addonOptionId,
      inputValue: addon?.inputValue,
    }
  }).filter(addon => addon.addonOptionId)
}


function openImage(img, title) {
  if (!img) return
  $q.dialog({
    component: ImageViewerDialog,
    componentProps: {
      image: img,
      title: title,
    }
  })  
}

const reviewsListDialog = ref()
const openReviewsDialog = ref(false)

watch(() => [props?.productId, customer.value?.id], () => fetchReview())
const productReview = ref([].map(Review.parse)[0])
const canReview = ref(false)
function fetchReview() {
  return cachedBackend.get(`reviews/product/${props?.productId}/customer/${customer.value?.id}/`).then(response => {
    const review = response?.data?.review
      ? Review.parse(response?.data?.review)
      : undefined
    productReview.value = review

    canReview.value = response?.data?.can_review
    return response
  })
}

async function rateProduct() {
  $q.dialog({
    component: ReviewFormDialog,
    componentProps: {
      productId: props.productId,
      review: productReview.value?.id ? productReview.value : undefined,
    }
  }).onOk(newProductReview => {
    if (newProductReview?.id) {
      $q.dialog({
        title: 'Review Submitted',
        message: 'Thank you for your response!',
        color: 'brandblue',
        class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
      })
    }
    productReview.value = newProductReview
    fetchProduct()
    const index = reviewsListDialog.value?.reviews?.findIndex(review => review?.id === newProductReview?.id)
    if (index >= 0) reviewsListDialog.value.reviews[index] = newProductReview
    else reviewsListDialog.value?.fetchReviews?.()
  })
}

let stockUpdateInterval = ref()
function startStockAutoUpdate() {
  clearInterval(stockUpdateInterval.value)
  stockUpdateInterval.value = setInterval(() => {
    if (!requireStocks.value) return
    product.value?.updateVariantStocks?.()
  }, 30 * 1000)
}
function stopStockAutoUpdate() {
  clearInterval(stockUpdateInterval.value)
}

onMounted(() => startStockAutoUpdate())
onUnmounted(() => stopStockAutoUpdate())
onActivated(() => startStockAutoUpdate())
onDeactivated(() => stopStockAutoUpdate())

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchProduct(),
      fetchCollection(),
      fetchReview(),
      reviewsListDialog.value?.fetchReviews?.(),
    ])
    selectedVariantIndex.value = 0
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', product.value?.storefrontId)
    initialized.value = true
    done()
  }
}
</script>
