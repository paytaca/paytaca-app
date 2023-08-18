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
            <q-card :class="[darkMode ? 'pt-dark-card': 'text-black']">
              <q-img :src="product?.imageUrl || product?.variantImageUrl || noImage" ratio="1"/>
              <q-card-section>
                <div class="text-body1 ellipsis">{{ product?.name }}</div>
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
          No products
        </div>
      </div>
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import noImage from 'src/assets/no-image.svg'
import { backend } from 'src/marketplace/backend'
import { Collection, Product } from 'src/marketplace/objects'
import { useStore } from 'vuex'
import { ref, computed, watch, onMounted } from 'vue'
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
