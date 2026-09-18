<template>
  <div class="q-px-md q-py-sm">
    <div class="row items-center q-gutter-x-sm no-wrap">
      <div class="row no-wrap">
        <div class="text-h6">{{ $t('APIKeys') }}</div>
        <q-btn flat round dense icon="help" color="grey" size="sm" @click="$emit('showHelp')">
          <q-tooltip>{{ $t('Help') }}</q-tooltip>
        </q-btn>
      </div>
      <q-space/>
      <q-btn flat padding="xs" icon="search" @click="showSearchbar = !showSearchbar">
        <q-badge v-if="search" color="red" floating rounded />
      </q-btn>
      <q-btn
        flat
        padding="xs"
        :icon="hideInactive ? 'visibility_off' : 'visibility'"
        :color="hideInactive ? 'grey' : 'pt-primary1'"
        @click="hideInactive = !hideInactive"
      >
        <q-tooltip>{{ hideInactive ? $t('ShowInactive') : $t('HideInactive') }}</q-tooltip>
      </q-btn>
      <q-btn ref="sortBtn" flat padding="xs" icon="sort">
        <q-badge v-if="orderBy" color="red" floating rounded />
      </q-btn>
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
          :placeholder="$t('SearchKeys')"
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
    <q-menu
      v-model="showSortOptions"
      :target="sortBtn?.$el"
      touch-position
      class="pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-list style="min-width: 150px;">
        <q-item-label header>{{ $t('SortBy') }}</q-item-label>
        <q-item clickable v-close-popup @click="$emit('set-ordering', 'name')">
          <q-item-section avatar><q-icon name="title" /></q-item-section>
          <q-item-section>{{ $t('Name') }}</q-item-section>
          <q-item-section side v-if="orderBy === 'name'">
            <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="$emit('set-ordering', 'created')">
          <q-item-section avatar><q-icon name="event" /></q-item-section>
          <q-item-section>{{ $t('DateCreated') }}</q-item-section>
          <q-item-section side v-if="orderBy === 'created'">
            <q-icon :name="orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward'" color="pt-primary1" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { ref, computed } from 'vue';

const $emit = defineEmits([
  'showHelp',
  'create',
  'set-ordering'
])
const props = defineProps({
  debounceSearch: { type: Number, required: false },
})

const $store = useStore();
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showSearchbar = ref(false);
const search = defineModel('search');

const hideInactive = defineModel('hideInactive');

const sortBtn = ref(null);
const showSortOptions = ref(false);
const orderBy = defineModel('orderBy');
const orderDir = defineModel('orderDir');
</script>
