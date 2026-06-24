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
  { 
    id: 1, 
    status: 'Preparing', 
    timestamp: 'Jun 22, 2026 · 09:15 AM', 
    color: 'orange',  
    icon: 'inventory_2', 
    note: 'The seller is packaging your item and preparing it for dispatch.' 
  },
  { 
    id: 2, 
    status: 'Shipped', 
    timestamp: 'Jun 23, 2026 · 02:30 PM', 
    color: 'primary',  
    icon: 'local_shipping', 
    note: 'The item has been handed over to the courier and is on its way.' 
  },
  { 
    id: 3, 
    status: 'Delivered', 
    timestamp: 'Jun 24, 2026 · 11:05 AM', 
    color: 'positive', 
    icon: 'task_alt', 
    note: 'Parcel successfully arrived at the destination address.' 
  },
]
</script>