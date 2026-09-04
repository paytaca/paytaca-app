<template>
  <div>
    <div class="row q-gutter-x-sm no-wrap">
      <div class="text-h6">{{ $t('Plans') }}</div>
      <q-space/>
      <!-- <q-btn flat padding="xs" icon="search" :outline="showSearchbar" @click="showSearchbar = !showSearchbar">
        <q-badge v-if="search" color="red" floating rounded />
      </q-btn> -->
      <!-- <q-btn flat padding="xs" icon="filter_alt" :outline="showFilterDialog" @click="showFilterDialog = !showFilterDialog">
        <q-badge v-if="hasFilter" color="red" floating rounded />
      </q-btn> -->
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
  </div>
</template>
<script setup>
import { useStore } from 'vuex';
import { ref, computed } from 'vue';

const $emit = defineEmits([
  'create',
])

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showSearchbar = ref(false);
const search = defineModel('search')
</script>
