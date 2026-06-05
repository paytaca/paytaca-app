<template>
  <div>
    <q-input
      outlined
      dense
      :loading="loading"
      clearable
      v-model="inputVal"
      autocomplete="off"
      placeholder="Search lot"
      color="pt-primary1"
      debounce="500"
      @update:model-value="handleSearch"
      :class="getDarkModeClass(darkMode)"
    >
      <template v-slot:append>
        <q-icon name="search"/>
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useStore } from "vuex";
import { computed, ref, watch } from "vue";

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus']);

const inputVal = ref('');
const loading = ref(false);

const handleSearch = (val) => {
  loading.value = true;
  
  $store.commit('auction/setLotSearchQuery', val || '');
  
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