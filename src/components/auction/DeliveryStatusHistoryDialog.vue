<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">

      <!--Title-->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Delivery Status History</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!--Body-->
      <q-card-section>
        <!--While page is loading-->
        <div v-if="isLoading" class="row justify-center q-py-md">
          <q-spinner color="primary" size="24px" />
        </div>

        <!--Data has been loaded-->
        <q-timeline v-else color="primary" layout="dense">
          <q-timeline-entry
            v-for="entry in history"
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
// Quasar/Vue imports
// Imports
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { date } from 'quasar'

import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// Props
const props = defineProps({
  modelValue: Boolean,
  lotId: {
    type: [String, Number],
    required: true
  }
})

// Data to be emitted
defineEmits(['update:modelValue'])

// Quasar variables
const store = useStore()

// System-related variables
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const isLoading = ref(false)

// Page-specific variables
const history = ref([])

// Fixed
const STATUS_CONFIG = {
  Preparing: {
    color: 'warning',
    icon: 'inventory_2', 
    note: 'The seller is packaging your item and preparing it for dispatch.' 
  },
  Shipped: {
    color: 'info',
    icon: 'local_shipping', 
    note: 'The item has been handed over to the courier and is on its way.' 
  },
  'In Transit': {
    color: 'info',
    icon: 'local_shipping',
    note: 'The item is in transit.'
  },
  'Out for delivery': {
    color: 'info',
    icon: 'local_shipping',
    note: 'The item is out for delivery.'
  },
  Delivered: {
    color: 'positive',
    icon: 'task_alt', 
    note: 'Parcel successfully arrived at the destination address.' 
  }
}

async function loadHistory() {
  if (!props.lotId) return
  
  isLoading.value = true
  try {
    const delivery = await store.dispatch('auction/fetchDeliveryDetails', props.lotId)
    history.value = (delivery?.delivery_events ?? []).map(entry => {
      const config = STATUS_CONFIG[entry.status] ?? {}
      return {
        id: entry.id,
        status: entry.status,
        timestamp: date.formatDate(entry.event_date, 'MMM DD, YYYY · hh:mm A'),
        note: entry.description || config.note || '',
        color: config.color || 'primary',
        icon: config.icon || 'local_shipping'
      }
    })
  } catch (err) {
    console.error('Failed to load tracking data:', err)
  } finally {
    isLoading.value = false
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) loadHistory()
})
</script>
