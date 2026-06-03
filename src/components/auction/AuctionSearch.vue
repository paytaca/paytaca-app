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
      @update:model-value="() => search()"
    >
      <template v-slot:append>
        <q-icon name="search"/>
      </template>
    </q-input>

    <q-menu
      v-if="searchQuery"
      v-model="showSuggestions"
      fit
      no-focus
      class="pt-card-2 text-bow q-pa-sm"
      :class="getDarkModeClass(darkMode)"
      max-height="60vh;"
    >
      <div class="text-caption text-grey">Auctions</div>

      <div v-for="n in 5" :key="n" class="q-px-sm q-py-sm">
        <div class="row no-wrap items-center">
          <div>
            <div
              class="text-subtitle1"
              style="line-height:1.25;"
            >
              Test
            </div>
          </div>
        </div>
      </div>
    </q-menu>
  </div>
</template>

<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { computed, ref } from "vue";

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showSuggestions = ref(false)
const searchQuery = ref('')
const lastSearch = ref('')
const loading = ref(false)

defineProps({
  placeholder: {
    type: String,
    default: 'Search auctions'
  }
})

async function search() {
  if (!searchQuery.value) return

  loading.value = true

  showSuggestions.value = true
  loading.value = false
}
</script>