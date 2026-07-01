<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 300px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1 text-weight-bold">Transactions</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>
      <q-card-section>
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="q-mb-sm"
        >
          <div class="row items-center justify-between q-mb-xs">
            <div class="row items-center q-gutter-x-xs">
              <q-icon
                :name="tx.type === 'in' ? 'arrow_downward' : 'arrow_upward'"
                :color="tx.type === 'in' ? 'positive' : 'negative'"
                size="xs"
              />
              <span class="text-caption text-weight-bold">{{ tx.label }}</span>
            </div>
            <span
              class="text-caption text-weight-bold"
              :class="tx.type === 'in' ? 'text-positive' : 'text-negative'"
            >
              {{ tx.type === 'in' ? '+' : '-' }}{{ tx.amount }} BCH
            </span>
          </div>
          <div class="text-caption ellipsis" style="opacity: 0.5;">{{ tx.txid }}</div>
          <div class="text-caption" style="opacity: 0.45;">{{ tx.timestamp }}</div>
          <q-separator spaced="xs" />
        </div>
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
  transactions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['update:modelValue'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>