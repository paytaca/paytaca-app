<template>
  <q-pull-to-refresh
    style="background-color: #ECF3F3; min-height: 100vh;padding-top:70px;padding-bottom:50px;"
    :class="{'pt-dark': darkMode}"
    @refresh="refreshPage"
  >
    <HeaderNav
      title="Marketplace"
      backnavpath="/apps"
      style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
    />
    <div class="q-pa-sm" :class="{'text-black': !darkMode }">
      <div class="text-h5 q-px-xs">Shops</div>
      <div v-if="!initialized && fetchingStorefronts" class="row items-center justify-center">
        <q-spinner size="4em" color="brandblue"/>
      </div>
      <div class="row items-start justify-start q-mb-md">
        <div v-for="storefront in storefronts" :key="storefront?.id" class="col-6 col-sm-4 q-pa-xs">
          <q-card
            :class="[darkMode ? 'pt-dark-card': 'text-black']"
            @click="$router.push({ name: 'app-marketplace-storefront', params: { storefrontId: storefront?.id }})"
          >
            <q-img v-if="storefront?.imageUrl" :src="storefront?.imageUrl" ratio="1"/>
            <q-card-section>
              <div class="ellipsis-3-lines">{{ storefront.name }}</div>
              <div class="row items-start text-caption no-wrap">
                <div>
                  <q-icon name="location_on"/>
                </div>
                <div>
                  {{ [storefront?.location?.city, storefront?.location?.state || storefront?.location?.country].filter(Boolean).join(', ') }}
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- <div class="text-h5 q-px-xs">Orders</div>
      <div class="q-mb-md">
        <div class="text-grey text-center">No orders</div>
      </div> -->
    </div>
  </q-pull-to-refresh>
</template>
<script setup>
import { backend } from 'src/marketplace/backend'
import { Storefront } from 'src/marketplace/objects'
import { useStore } from 'vuex'
import { computed, ref, onMounted } from 'vue'
import HeaderNav from 'src/components/header-nav.vue'

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const initialized = ref(false)
function resetPage() {
  storefronts.value = []
  storefrontsPagination.value = { count: 0, limit: 0, offset: 0 }
  initialized.value = false
}

onMounted(() => refreshPage())

const fetchingStorefronts = ref(false)
const storefronts = ref([].map(Storefront.parse))
const storefrontsPagination = ref({ count: 0, limit: 0, offset: 0 })
function fetchStorefronts(opts={ limit: 0, offset: 0 }) {
  const params = {
    limit: opts?.limit || 10,
    offset: opts?.offset || undefined,
  }
  fetchingStorefronts.value = true
  return backend.get(`connecta/storefronts/`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      storefronts.value = response?.data?.results.map(storefrontData => {
        $store.commit('marketplace/cacheStorefront', storefrontData)
        return Storefront.parse(storefrontData)
      })
      storefrontsPagination.value.count = response?.data?.count
      storefrontsPagination.value.limit = response?.data?.limit
      storefrontsPagination.value.offset = response?.data?.offset
    })
    .finally(() => {
      fetchingStorefronts.value = false
    })
}

async function refreshPage(done=() => {}) {
  try {
    await fetchStorefronts()
  } finally {
    $store.commit('marketplace/setActiveStorefrontId', null)
    initialized.value = true
    done()
  }
}
</script>
