<template>
  <q-input
    outlined
    dense
    :loading="loading"
    clearable
    v-model="searchQuery"
    autocomplete="off"
    placeholder="Search auctions"
    color="pt-primary1"
    debounce="500"
    :class="getDarkModeClass(darkMode)"
    @update:model-value="search"
  >
    <template v-slot:append>
      <q-icon name="search"/>
    </template>
  </q-input>
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

const showSuggestions = ref(false)
const loading = ref(false)

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const searchQuery = ref($store.state.auction?.auctionFilters?.search || '')

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

watch(() => $store.state.auction?.auctionFilters?.search, (newSearch) => {
  searchQuery.value = newSearch || ''
})
</script>