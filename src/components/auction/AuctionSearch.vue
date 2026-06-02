<template>
  <div>
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
    >
      <template v-slot:append>
        <q-icon name="search"/>
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, ref } from "vue";

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const searchQuery = ref('')
const lastSearch = ref('')
const loading = ref(false)

defineProps({
  placeholder: {
    type: String,
    default: 'Search auctions'
  }
})
</script>