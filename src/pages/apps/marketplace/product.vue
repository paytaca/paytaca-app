<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav title="Marketplace" class="header-nav" />
    <div class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="row items-center no-wrap q-px-sm">
        <div class="text-h5">{{ product?.name }}</div>
        <q-chip v-if="available == false" color="grey" text-color="white" class="q-my-none">
          Unavailable
        </q-chip>
        <q-space/>
        <div
          v-if="productReviewSummary?.count"
          class="text-right text-caption text-grey"
          @click="() => openReviewsDialog = true"
        >
          <div class="row items-center no-wrap">
            <q-rating
              readonly
              max="5"
              :model-value="productReviewSummary?.average * (5 / 100)"
              size="1.25em"
              color="brandblue"
              class="no-wrap"
              icon-half="star_half"
            />
            <div>
              {{ roundRating(productReviewSummary?.average) }}
            </div>
          </div>
          <div>
            ({{ productReviewSummary?.count }}
            {{ productReviewSummary?.count === 1 ? 'review' : 'reviews' }})
          </div>
        </div>
        <q-btn
          v-else-if="product?.id"
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
              v-if="!productReview?.id"
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
          <div v-if="selectedVariant?.id">
            <q-input
              v-if="cartItem"
              :disable="!available || !activeStorefrontIsActive || cartOptionsHasErrors || activeStorefrontCart?.$state?.updating"
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
              :disable="!available || !activeStorefrontIsActive || cartOptionsHasErrors || activeStorefrontCart?.$state?.updating"
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
import { Cart, Collection, Product, Review } from 'src/marketplace/objects'
import { backend } from 'src/marketplace/backend'
import { roundRating } from 'src/marketplace/utils'
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import ImageViewerDialog from 'src/components/marketplace/ImageViewerDialog.vue'
import JSONFormPreview from 'src/components/marketplace/JSONFormPreview.vue'
import ReviewFormDialog from 'src/components/marketplace/reviews/ReviewFormDialog.vue'
import ReviewsListDialog from 'src/components/marketplace/reviews/ReviewsListDialog.vue'

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
  collection.value.raw = null
  initialized.value = false
  productReviewSummary.value = { count: 0, average: 0, lastReview: null }
  productReview.value = null
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

const activeStorefrontCart = computed(() => $store.getters['marketplace/activeStorefrontCart'])
const cartItem = computed(() => {
  return activeStorefrontCart.value?.items?.find(item => item?.variant?.id == selectedVariant.value?.id)
})

function saveActiveCart() {
  if (cartOptionsHasErrors.value) return
  $store.dispatch('marketplace/saveCart', activeStorefrontCart.value)
}

async function addSelectedVariantToCart() {
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
    })
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
watch(() => [props?.productId, customer.value?.id], () => fetchProductReviewSummary())
const productReviewSummary = ref({ count: 0, average: 0, lastReview: new Date() })
function fetchProductReviewSummary() {
  return backend.get(`reviews/summary/`, { params: {
    product_id: props?.productId || 0,
  }})
    .then(response => {
      productReviewSummary.value = {
        count: response?.data?.count,
        average: parseFloat(response?.data?.average),
        lastReview: new Date(response?.data?.last_review),
      }
    })
}

watch(() => [props?.productId, customer.value?.id], () => fetchReview())
const productReview = ref([].map(Review.parse)[0])
function fetchReview() {
  return backend.get(`reviews/`, { params : {
    product_id: props?.productId || 0,
    created_by_customer_id: customer.value?.id || 0,
    limit: 1,
  }}).then(response => {
    const review = response?.data?.count
      ? Review.parse(response?.data?.results?.[0])
      : undefined
    productReview.value = review
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
    $q.dialog({
      title: 'Review Submitted',
      message: 'Thank you for your response!',
      color: 'brandblue',
      class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
    })
    productReview.value = newProductReview
    fetchProductReviewSummary()
    const index = reviewsListDialog.value?.reviews?.findIndex(review => review?.id === newProductReview?.id)
    if (index >= 0) reviewsListDialog.value.reviews[index] = newProductReview
  })
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchProduct(),
      fetchCollection(),
      fetchProductReviewSummary(),
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
