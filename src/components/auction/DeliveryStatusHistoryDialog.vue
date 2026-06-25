<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Delivery Status History</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section>
        <div v-if="isLoading" class="row justify-center q-py-md">
          <q-spinner color="primary" size="24px" />
        </div>
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
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { date } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { callAPI } from 'src/auction/api'

const props = defineProps({
  modelValue: Boolean,
  lotId: {
    type: [String, Number],
    required: true
  }
})

defineEmits(['update:modelValue'])

const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])

const history = ref([])
const isLoading = ref(false)

const statusConfig = {
  preparing_date: { 
    title: 'Preparing', 
    color: 'warning',
    icon: 'inventory_2', 
    note: 'The seller is packaging your item and preparing it for dispatch.' 
  },
  shipping_date: { 
    title: 'Shipped', 
    color: 'info',
    icon: 'local_shipping', 
    note: 'The item has been handed over to the courier and is on its way.' 
  },
  delivered_date: { 
    title: 'Delivered', 
    color: 'positive',
    icon: 'task_alt', 
    note: 'Parcel successfully arrived at the destination address.' 
  }
}

async function loadHistory() {
  if (!props.lotId) return
  
  isLoading.value = true
  try {
    const res = await callAPI('delivery-trackings', props.lotId)
    if (!res?.success || !res.data) return

    const trackingData = Array.isArray(res.data) ? res.data[0] : res.data
    const timeline = []

    for (const [key, config] of Object.entries(statusConfig)) {
      if (trackingData[key]) {
        timeline.push({
          id: key,
          status: config.title,
          timestamp: date.formatDate(trackingData[key], 'MMM DD, YYYY · hh:mm A'),
          note: config.note,
          color: config.color,
          icon: config.icon
        })
      }
    }
    
    history.value = timeline
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