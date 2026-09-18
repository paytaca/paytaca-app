<template>
  <div class="q-px-md q-py-sm">
    <div class="row q-gutter-x-sm no-wrap">
      <div class="text-h6">{{ $t('Plans') }}</div>
      <q-space/>
      <q-btn flat padding="xs" icon="search" @click="showSearchbar = !showSearchbar">
        <q-badge v-if="search" color="red" floating rounded />
      </q-btn>
      <q-btn flat padding="xs" icon="filter_alt" @click="showFilterDialog = !showFilterDialog">
        <q-badge v-if="hasFilter" color="red" floating rounded />
      </q-btn>
      <!-- <q-btn flat padding="xs" icon="sort" @click="showSortOptions = !showSortOptions">
        <q-badge v-if="sortField" color="red" floating rounded />
      </q-btn> -->
      <q-btn flat padding="xs" icon="add" dense @click="$emit('create')">
      </q-btn>
    </div>
    <q-slide-transition>
      <div v-if="showSearchbar">
        <q-input
          v-model="search"
          dense
          rounded
          outlined
          :placeholder="$t('SearchPlans', 'Search Plans')"
          :debounce="debounceSearch"
          :bg-color="darkMode ? 'pt-dark' : 'white'"
          :dark="darkMode"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </q-slide-transition>


    <q-dialog v-model="showFilterDialog" position="bottom">
      <q-card
        class="q-pa-md br-15 pt-card-2 text-bow"
        :class="getDarkModeClass(darkMode)"
        style="min-height: 25vh;"
      >
        <div class="text-subtitle1">{{ $t('Active') }}</div>
        <q-btn-toggle
          v-model="isActive"
          :options="[
            { label: $t('All'), value: null },
            { label: $t('Active'), value: true },
            { label: $t('Inactive'), value: false },
          ]"
          toggle-color="pt-primary1"
          spread
          no-caps
          :dark="darkMode"
        />
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { ref, computed } from 'vue';

const $emit = defineEmits([
  'create',
])

const props = defineProps({
  debounceSearch: { type: Number, required: false },
})

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showSearchbar = ref(false);
const search = defineModel('search')

const showFilterDialog = ref(false);
const hasFilter = computed(() => {
  return typeof isActive.value === 'boolean';
})

const isActive = defineModel('isActive');
</script>
