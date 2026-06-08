<template>
  <q-input
    outlined
    dense
    :loading="loading"
    clearable
    v-model="inputVal"
    autocomplete="off"
    placeholder="Search auctions"
    color="pt-primary1"
    debounce="500"
    :class="getDarkModeClass(darkMode)"
    @update:model-value="handleSearch"
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

const emit = defineEmits(['search-change'])

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

const inputVal = ref('');
const loading = ref(false)
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const handleSearch = (val) => {
  loading.value = true;
  
  emit('search-change', val || '')
  
  setTimeout(() => {
    loading.value = false;
  }, 150);
};

watch(inputVal, (newVal) => {
  if (!newVal) {
    handleSearch('');
  }
});
</script>