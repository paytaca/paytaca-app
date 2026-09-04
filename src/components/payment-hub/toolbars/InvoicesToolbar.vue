<template>
  <div class="q-px-md q-py-sm">
    <div class="row q-gutter-x-sm no-wrap">
      <div class="text-h6">{{ $t('Invoices') }}</div>
      <q-space/>
      <q-btn flat padding="xs" icon="search" @click="showSearchbar = !showSearchbar">
        <q-badge v-if="search" color="red" floating rounded />
      </q-btn>
      <q-btn flat padding="xs" icon="filter_alt" @click="showFilterDialog = !showFilterDialog">
        <q-badge v-if="hasFilter" color="red" floating rounded />
      </q-btn>
      <!-- <q-btn flat padding="xs" icon="sort" @click="showSortOptions = !showSortOptions">
        <q-badge v-if="sortField" color="red" floating rounded />
      </q-btn>
      <q-btn flat padding="xs" icon="add" dense no-caps label="Create">
      </q-btn> -->
    </div>
    <q-slide-transition>
      <div v-if="showSearchbar">
        <q-input
          v-model="search"
          dense
          rounded
          outlined
          :placeholder="$t('SearchInvoices', 'Search Invoices')"
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
      <q-card class="q-pa-md br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <div class="text-subtitle1">{{ $t('Subs') }}</div>
        <q-btn-toggle
          v-model="includeSubscriptions"
          :options="[
            { label: $t('All'), value: undefined },
            { label: $t('Include'), value: true },
            { label: $t('Exclude'), value: false },
          ]"
          toggle-color="pt-primary1"
          spread
          no-caps
          :dark="darkMode"
        />

        <q-separator spaced />

        <div class="text-subtitle1">{{ $t('Status') }}</div>
        <q-option-group
          v-model="statuses"
          :options="parsedStatusOpts"
          type="checkbox"
          color="pt-primary1"
        />
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { ref, computed } from 'vue';

const props = defineProps({
  debounceSearch: { type: Number, required: false },
  statusOpts: { type: Array, default: () => [] },
})

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showSearchbar = ref(false);
const search = defineModel('search');

const showFilterDialog = ref(false);
const hasFilter = computed(() => {
  if (includeSubscriptions.value) return true
  if (Array.isArray(statuses.value) && statuses.value.length) return true
  return false
})

const includeSubscriptions = defineModel('includeSubscriptions');
const statuses = defineModel('statuses');
const parsedStatusOpts = computed(() => {
  if (!Array.isArray(props.statusOpts) || !props.statusOpts.length) return []

  return props.statusOpts.map(val => {
    return { label: val, value: val }
  })
})

</script>
