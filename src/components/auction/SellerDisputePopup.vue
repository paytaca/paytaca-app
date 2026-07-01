<template>
  <q-dialog
    :model-value="modelValue"
    position="bottom"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card
      class="br-15 pt-card-2 text-bow full-width"
      :class="getDarkModeClass(darkMode)"
      style="max-width: 480px; border-radius: 20px 20px 0 0 !important;"
    >
      <q-card-section class="row items-center q-pb-none">
        <div>
          <div class="text-subtitle1 text-weight-bold">File a Dispute</div>
          <div v-if="lot" class="text-caption" style="opacity: 0.6;">
            Lot {{ lot.id }}: {{ lot.title }}
          </div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="text-caption q-mb-sm" style="opacity: 0.7;">
          Select all reasons that apply
        </div>

        <div
          v-for="reason in reasonOptions"
          :key="reason.value"
          class="row items-center q-py-xs q-px-sm q-mb-xs cursor-pointer"
          style="border-radius: 12px;"
          @click="toggleReason(reason.value)"
        >
          <q-checkbox
            :model-value="isSelected(reason.value)"
            color="negative"
            dense
            class="q-mr-sm"
            @click.stop
            @update:model-value="toggleReason(reason.value)"
          />
          <q-icon :name="reason.icon" size="20px" class="q-mr-sm" style="opacity: 0.7;" />
          <div class="text-body2">{{ reason.label }}</div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="grey" v-close-popup />
        <q-btn
          unelevated
          label="Submit Dispute"
          color="negative"
          :disable="!canSubmit"
          @click="handleSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { callAPI } from 'src/auction/api'
import { Store } from 'src/store'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  lot: {
    type: Object,
    default: null
  },
  bidId: {
    type: [String, Number],
    default: null
  }
})
const emit = defineEmits(['update:modelValue', 'submit'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const walletHash = Store.getters['global/getWallet']('bch')?.walletHash

const reasonOptions = [
  { value: 'Seller ghosting', label: 'Seller ghosting' },
  { value: 'No tracking', label: 'No tracking' },
  { value: 'Invalid tracking', label: 'Invalid tracking' },
  { value: 'Late shipping', label: 'Late shipping' },
  { value: 'Wrong address', label: 'Wrong address' },
  { value: 'Suspicious activity', label: 'Suspicious activity' }
]

const selectedReasons = ref([])

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    selectedReasons.value = []
  }
})

const isSelected = (value) => selectedReasons.value.includes(value)

const toggleReason = (value) => {
  const index = selectedReasons.value.indexOf(value)
  if (index === -1) selectedReasons.value.push(value)
  else selectedReasons.value.splice(index, 1)
}

const canSubmit = computed(() => {
  return selectedReasons.value.length > 0
})

const handleSubmit = async () => {
  if (!canSubmit.value) return

  try {
    const response = await callAPI('disputes', null, 'post', {
      user: walletHash,
      bid: props.bidId,
      dispute_reason: selectedReasons.value.join(';')
    })

    if (!response.success) {
      throw new Error(response.error || 'Failed to file backend dispute.')
    }
    
    $q.notify({
      type: 'positive',
      icon: 'gavel',
      message: 'Dispute submitted successfully!',
      timeout: 4000
    })

    emit('submit')
  } catch (error) {
    console.error('Refund failed:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Something went wrong during the dispute process.'
    })
  } finally {
    emit('update:modelValue', false)
  }
}
</script>