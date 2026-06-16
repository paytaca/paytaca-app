<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Status History</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section>
        <q-timeline color="primary" layout="dense">
          <q-timeline-entry
            v-for="entry in statusHistory"
            :key="entry.id"
            :title="entry.status"
            :subtitle="entry.timestamp"
            :color="entry.color"
            :icon="entry.icon"
          >
            <div class="text-caption" style="opacity: 0.65;">{{ entry.note }}</div>
          </q-timeline-entry>
        </q-timeline>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineProps({
  modelValue: Boolean,
  statusHistory: {
    type: Array,
    default: () => []
  }
})

defineEmits(['update:modelValue'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>