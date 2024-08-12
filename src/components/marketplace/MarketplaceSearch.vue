<template>
  <div>
    <q-input
      outlined
      dense
      :loading="loading"
      :disable="loading"
      clearable
      v-model="inputVal"
      placeholder="Search"
      color="brandblue"
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
      >
        <template v-if="filteredStorefronts?.length">
          <div class="text-caption text-grey">Shops</div>
          <div
            v-for="storefront in filteredStorefronts" :key="storefront?.id"
            class="q-px-sm q-py-xs"
            style="position:relative"
            v-ripple
            @click="() => {
              $router.push({ name: 'app-marketplace-storefront', params: { storefrontId:storefront?.id }})
            }"
          >
            <div class="row items-center">
              <div
                class="text-subtitle1"
                v-html="highlightSearch(storefront?.name, lastSearch)"
              ></div>
              <q-space/>
              <div v-if="storefront?.distance" class="text-grey">
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
          style="position:relative"
          v-ripple
          @click="() => {
            $router.push({ name: 'app-marketplace-product', params: { productId: product?.id }})
          }"
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
                <div v-if="product?.categories?.includes?.(lastSearch)">
                  <q-chip color="brandblue" dense>{{ lastSearch }}</q-chip>
                </div>
              </div>
              <div v-if="storefronts?.[product?.storefrontId]" class="row items-center">
                <div>{{ storefronts?.[product?.storefrontId]?.name }}</div>
                <q-space/>
                <div v-if="storefronts?.[product?.storefrontId]?.distance" class="text-grey">
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
import { round } from "src/marketplace/utils";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useStore } from "vuex";
import { computed, ref } from "vue";

const props = defineProps({
  customerCoordinates: {
    default: () => {
      return { latitude: NaN, longitude: NaN }
    }
  },
})

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
    return storefront?.name?.toLowerCase()?.includes?.(inputVal.value?.toLowerCase())
  })
})

function search() {
  if (!inputVal.value) return
  const data = {
    search: inputVal.value,
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

</script>
