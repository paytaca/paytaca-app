<template>
  <div>
    <q-input
      standout
      dense
      rounded
      dark
      :loading="loading"
      clearable
      v-model="inputVal"
      autocomplete="off"
      placeholder="Search product / shop"
      color="pt-primary1"
      debounce="500"            
      @update:model-value="() => search()"
    >
      <template v-slot:append>
        <q-icon name="search"/>
      </template>
      <q-menu
        v-if="lastSearch == inputVal && inputVal"
        v-model="showSuggestions" fit no-focus
        class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)"
        max-height="60vh;"
      >
        <template v-if="filteredStorefronts?.length">
          <div class="text-caption text-grey">Shops</div>
          <div
            v-for="storefront in filteredStorefronts" :key="storefront?.id"
            class="q-px-sm q-py-sm"
            :class="storefront?.inPrelaunch === true ? 'text-grey' : ''"
            style="position:relative"
            v-ripple="!storefront?.inPrelaunch"
            @click="() => onStorefrontClick(storefront)"
          >
            <div class="row no-wrap items-center">
              <div>
                <div
                  class="text-subtitle1"
                  style="line-height:1.25;"
                  v-html="highlightSearch(storefront?.name, lastSearch)"
                ></div>
                <div class="text-grey" style="line-height:0.9;">
                  <template v-if="storefront?.inPrelaunch === true">
                    Will be live soon!
                  </template>
                  <template v-else-if="!storefront?.isOpen && storefront?.openingTimeText">
                    {{ storefront?.openingTimeText }}
                  </template>
                  <template v-else-if="!storefront?.isOpen">
                    Closed
                  </template>
                </div>
              </div>
              <q-space/>
              <div
                v-if="storefront?.distance"
                class="text-grey" style="text-wrap:nowrap;"
              >
                ~{{ round(storefront?.distance/1000, 2) }} km
              </div>
            </div>
          </div>
        </template>

        <div class="text-caption text-grey">Products</div>
        <div v-if="!products?.length" class="text-grey text-center q-py-md">
          No products found
        </div>
        <div
          v-for="(product, index) in products" :key="product?.id"
          class="q-px-sm q-py-xs"
          :class="storefronts?.[product?.storefrontId]?.inPrelaunch === true ? 'text-grey' : ''"
          style="position:relative"
          v-ripple
          @click="() => onProductClick(product)"
        >
          <div class="row items-start no-wrap">
            <img
              v-if="product?.displayImageUrl"
              :src="product?.displayImageUrl"
              class="rounded-borders q-mr-sm q-mt-sm"
              style="width:35px"
            />
            <div class="q-space">
              <div class="row items-center">
                <div
                  class="text-subtitle1"
                  v-html="highlightSearch(product?.name, lastSearch)"
                ></div>
                <q-space/>
                <div
                  v-if="product?.categories?.some?.(category => category?.toLowerCase?.().includes(lastSearch?.toLowerCase()))"
                  class="q-gutter-xs"
                >
                  <q-badge v-for="category in product?.categories" dense color="brandblue" rounded>
                    {{ category }}
                  </q-badge>
                </div>
              </div>
              <div v-if="storefronts?.[product?.storefrontId]" class="row no-wrap items-start">
                <div>
                  <div>{{ storefronts?.[product?.storefrontId]?.name }}</div>
                  <div class="text-grey text-caption" style="line-height:0.9;">
                    <template v-if="storefronts?.[product?.storefrontId]?.inPrelaunch === true">
                      Will be live soon!
                    </template>
                    <template v-else-if="!storefronts?.[product?.storefrontId]?.isOpen && storefronts?.[product?.storefrontId]?.openingTimeText">
                      {{ storefronts?.[product?.storefrontId]?.openingTimeText }}
                    </template>
                    <template v-else-if="!storefronts?.[product?.storefrontId]?.isOpen">
                      Closed
                    </template>
                  </div>
                </div>
                <q-space/>
                <div
                  v-if="storefronts?.[product?.storefrontId]?.distance"
                  class="text-grey" style="text-wrap:nowrap;"
                >
                  ~{{ round(storefronts?.[product?.storefrontId]?.distance/1000, 2) }} km
                </div>
              </div>
            </div>
          </div>
          <q-separator v-if="index < products?.length - 1" spaced/>
        </div>
      </q-menu>
    </q-input>
  </div>
</template>
<script setup>
import { backend } from "src/marketplace/backend";
import { Product, Storefront } from "src/marketplace/objects";
import { getISOWithTimezone, round } from "src/marketplace/utils";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, ref } from "vue";

const props = defineProps({
  customerCoordinates: {
    default: () => {
      return { latitude: NaN, longitude: NaN }
    }
  },
})

const $router = useRouter()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const inputVal = ref('')
const lastSearch = ref('')
const loading = ref(false)

const showSuggestions = ref(false)
const products = ref([].map(Product.parse))
const storefronts = ref([].map(Storefront.parse))

const filteredStorefronts = computed(() => {
  return storefronts.value.filter(storefront => {
    if (products.value.find(product => product?.storefrontId == storefront?.id )) {
      return true
    }

    return storefront?.name?.toLowerCase()?.includes?.(inputVal.value?.toLowerCase())
  })
})

function search() {
  if (!inputVal.value) return

  const openAtTimestamp = Date.now() + 10 * 60 * 1000 // filter stores open in the next 10 minutes
  const data = {
    search: inputVal.value,
    is_open_at: getISOWithTimezone(new Date(openAtTimestamp)),
    storefront_distance: ($store.getters['marketplace/shopListOpts']?.radius || 30) * 1000,
    delivery_location: {
      lat: props.customerCoordinates.latitude,
      lon: props.customerCoordinates.longitude,
    },
  }

  loading.value = true
  return backend.post('/search/', data)
    .then(response => {
      products.value = response?.data?.products?.map(Product.parse)
      response?.data?.storefronts?.map?.(Storefront.parse).forEach(storefront => {
        storefronts.value[storefront.id] = storefront
      })
      showSuggestions.value = true
      return response
    })
    .finally(() => {
      lastSearch.value = data.search
      loading.value = false
    })
}

function highlightSearch(val='', search='') {
  if (typeof val !== 'string') return val
  if (typeof search !== 'string') return val
  const index = val.toLowerCase().indexOf(search.toLowerCase())
  if (index < 0) return val
  return val.substring(0, index) +
        `<strong>${val.substring(index, index+search?.length)}</strong>` +
        val.substring(index+search?.length)
}

function onStorefrontClick(storefront=Storefront.parse()) {
  if (storefront.inPrelaunch === true) return
  $router.push({
    name: 'app-marketplace-storefront',
    params: { storefrontId:storefront?.id },
  })
}

function onProductClick(product=Product.parse()) {
  const storefront = storefronts.value[product?.storefrontId]
  if (storefront?.inPrelaunch === true) return
  $router.push({
    name: 'app-marketplace-product',
    params: { productId: product?.id },
  })
}
</script>
