<template>
  <div ref="searchContainer">
    <q-input
      outlined
      dense
      :loading="loading"
      clearable
      v-model="searchQuery"
      autocomplete="off"
      :placeholder="placeholder"
      color="pt-primary1"
      debounce="500"
      :class="getDarkModeClass(darkMode)"
      @update:model-value="search"
    >
      <template v-slot:append>
        <q-icon name="search"/>
      </template>
    </q-input>

    <q-menu
      v-if="searchQuery"
      v-model="showSuggestions"
      :target="searchContainer"
      fit
      no-focus
      class="pt-card-2 text-bow q-pa-sm"
      :class="getDarkModeClass(darkMode)"
      max-height="60vh"
    >
      <div class="text-caption text-grey q-mb-xs">Auctions</div>
      
      <div v-if="filteredItems.length === 0" class="q-px-sm q-py-md text-center text-grey">
        No auctions found
      </div>
      
      <div 
        v-for="auction in filteredItems" 
        :key="auction.id" 
        class="q-px-sm q-py-sm cursor-pointer suggestion-item"
        @click="goToDetails(auction.id)"
      >
        <div class="row no-wrap items-center">
          <div>
            <div class="text-subtitle1 text-weight-medium" style="line-height:1.25;">
              {{ auction.title }}
            </div>
            <div class="text-caption text-grey row items-center q-mt-xs">
              <q-icon name="location_on" size="xs" class="q-mr-xs" />
              {{ auction.lots.length }} Lots
            </div>
          </div>
        </div>
      </div>
    </q-menu>
  </div>
</template>

<script setup>
import { useQuasar } from "quasar";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, ref, watch } from "vue";

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

const searchContainer = ref(null)
const showSuggestions = ref(false)
const loading = ref(false)

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const filteredItems = computed(() => $store.getters['auction/processedItems'])

const searchQuery = ref($store.state.auction?.filters?.search || '')

defineProps({
  placeholder: {
    type: String,
    default: 'Search auctions'
  }
})

function search(value) {
  loading.value = true
  
  const cleanValue = value || ''
  $store.dispatch('auction/updateSearchQuery', cleanValue)

  if (cleanValue.trim().length > 0) {
    showSuggestions.value = true
  } else {
    showSuggestions.value = false
  }
  
  loading.value = false
}

function goToDetails(id) {
  showSuggestions.value = false
  $router.push({ name: 'app-auction-details', params: { auctionId: id }})
}

watch(() => $store.state.auction?.filters?.search, (newSearch) => {
  searchQuery.value = newSearch || ''
})
</script>