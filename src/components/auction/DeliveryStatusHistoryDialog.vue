<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Delivery Status History</div>
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
  modelValue: {
    type: Boolean,
    default: false
  },
  lotId: {
    type: [String, Number],
    required: true
  }
})

defineEmits(['update:modelValue'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const statusHistory = [
  { id: 1, status: 'Appeal Filed', timestamp: 'Jun 15, 2026 · 10:02 AM', color: 'warning',  icon: 'flag', note: 'Buyer filed a refund appeal.' },
  { id: 2, status: 'Under Review', timestamp: 'Jun 15, 2026 · 10:15 AM', color: 'primary',  icon: 'search', note: 'Arbiter assigned and reviewing.' },
  { id: 3, status: 'Evidence Period', timestamp: 'Jun 15, 2026 · 11:00 AM', color: 'secondary',icon: 'attach_file', note: 'Both parties submitted evidence.' },
  { id: 4, status: 'Pending Decision', timestamp: 'Jun 16, 2026 · 12:00 AM', color: 'orange',   icon: 'hourglass_top', note: 'Awaiting arbiter final action.' },
]
</script>