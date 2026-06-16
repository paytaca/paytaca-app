<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card class="pt-card text-bow" :class="getDarkModeClass(darkMode)" style="min-width: 280px;">
      <q-card-section class="text-center q-pt-lg">
        <q-icon name="check_circle" color="positive" size="48px" />
        <div class="text-subtitle1 text-weight-bold q-mt-sm">Release to Seller?</div>
        <div class="text-caption q-mt-xs" style="opacity: 0.65;">
          This action is irreversible. The contract balance of
          <strong>{{ balanceDisplay }} BCH</strong> will be released to the seller.
        </div>
      </q-card-section>

      <q-card-actions align="center" class="q-pb-md">
        <q-btn flat no-caps label="Cancel" @click="$emit('cancel')" />
        <q-btn unelevated no-caps color="positive" label="Confirm Release" @click="$emit('confirm')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineProps({
  modelValue: Boolean,
  balanceDisplay: {
    type: String,
    default: '0.000'
  }
})

defineEmits(['update:modelValue', 'confirm', 'cancel'])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>