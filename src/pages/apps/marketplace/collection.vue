<template>
  <q-pull-to-refresh
    id="app-container"
    class="marketplace-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Marketplace')" class="header-nav" />

    <div class="q-pa-sm q-pt-md text-bow" :class="getDarkModeClass(darkMode)">
      <div class="text-h5 q-px-sm">{{ collection?.name }}</div>
      <div class="row items-center justify-center">
        <q-spinner v-if="!initialized && (fetchingCollection || fetchingProducts)" size="4em" color="brandblue"/>
      </div>

      <div class="row items-center q-px-sm">
        <q-space/>
        <LimitOffsetPagination
          :pagination-props="{
            maxPages: 5,
            rounded: true,
            padding: 'sm md',
            boundaryNumbers: true,
            disable: fetchingProducts,
          }"
          class="q-my-sm"
          :hide-below-pages="2"
          :modelValue="productsPagination"
          @update:modelValue="fetchProducts"
        />
      </div>
      <div class="row items-start">
        <template v-if="products?.length">
          <div
            v-for="product in products" :key="product?.id"
            class="col-6 col-sm-4 col-md-3 q-pa-sm"
            @click="() => $router.push({ name: 'app-marketplace-collection-product', params: { collectionId: collectionId, productId: product?.id } })"
          >
            <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)">
              <q-img :src="product?.imageUrl || product?.variantImageUrl || noImage" ratio="1"/>
              <q-card-section>
                <div
                  v-if="Number.isFinite(product?.reviewSummary?.averageRating)"
                  class="float-right row items-center no-wrap"
                  @click.stop
                >
                  <q-rating :model-value="1" readonly max="1" size="1em" color="brandblue"/>
                  {{ roundRating(product?.reviewSummary?.averageRating) }}
                  <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                    <div class="row items-center no-wrap">
                      <q-rating
                        readonly
                        max="5"
                        :model-value="roundRating(product?.reviewSummary?.averageRating, { forceDecimals: false})"
                        size="1em"
                        color="brandblue"
                        class="no-wrap"
                        icon-half="star_half"
                      />
                      <div>
                        {{ roundRating(product?.reviewSummary?.averageRating) }}
                      </div>
                    </div>
                    <div>
                      <!--TODO:-->
                      ({{ product?.reviewSummary?.count }}
                      {{ product?.reviewSummary?.count === 1 ? 'review' : 'reviews' }})
                    </div>
                  </q-menu>
                </div>
                <div class="row items-center">
                  <div class="q-space text-body1 ellipsis">{{ product?.name }}</div>
                  <q-chip
                    v-if="product?.availableAtStorefront(product?.storefrontId) == false"
                    dense
                    color="grey" text-color="white"
                    class="q-ma-none"
                  >
                    {{ $t('Unavailable') }}
                  </q-chip>
                </div>
                <div>
                  {{ product?.minMarkupPrice }}
                  <template v-if="product?.minMarkupPrice != product?.maxMarkupPrice">
                    - {{ product?.maxMarkupPrice }}
                  </template>
                  {{ getStorefrontCurrency(product?.storefrontId) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
        <div v-else-if="initialized" class="text-grey text-center col-12">
          {{ $t('NoProducts') }}
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Collection, Product } from 'src/marketplace/objects'
import { roundRating } from 'src/marketplace/utils'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav.vue'
import LimitOffsetPagination from 'src/components/LimitOffsetPagination.vue'

const props = defineProps({
  collectionId: [Number, String],
})

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  collection.value = Collection.parse()
  products.value = []
  productsPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}

onMounted(() => refreshPage())
watch(() => [props?.collectionId], () => {
  resetPage()
  refreshPage()
})

const storefrontId = computed(() => collection.value?.storefrontId)
onActivated(() => {
  if (!storefrontId.value) return
  $store.commit('marketplace/setActiveStorefrontId', storefrontId.value)
})

const collection = ref(Collection.parse())
const fetchingCollection = ref(false)
function fetchCollection() {
  fetchingCollection.value = true
  return backend.get(`connecta/collections/${props.collectionId}/`)
    .then(response => {
      collection.value = Collection.parse(response?.data)
    })
    .finally(() => {
      fetchingCollection.value = false
    })
}

const fetchingProducts = ref(false)
const products = ref([].map(Product.parse))
const productsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchProducts(opts={ limit: 0, offset: 0 }) {
  const params = {
    collection_id: props.collectionId,
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
  }

  fetchingProducts.value = true
  return backend.get(`products/info`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      products.value = response?.data?.results.map(Product.parse)
      productsPagination.value.count = response?.data?.count
      productsPagination.value.limit = response?.data?.limit
      productsPagination.value.offset = response?.data?.offset
      return response
    })
    .finally(() => {
      fetchingProducts.value = false
    })
}

function getStorefrontCurrency(storefrontId) {
  return $store.getters['marketplace/getStorefrontCurrency']?.(storefrontId)
}

async function refreshPage(done=() => {}) {
  try {
    await Promise.all([
      fetchCollection(),
      fetchProducts(),
    ])
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', collection.value?.storefrontId)
    initialized.value = true
    done()
  }
}
</script>
