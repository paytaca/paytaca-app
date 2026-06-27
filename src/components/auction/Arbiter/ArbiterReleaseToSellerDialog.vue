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
        <q-btn flat no-caps label="Cancel" :disable="isProcessing" @click="$emit('cancel')" />
        <q-btn
          unelevated
          no-caps
          color="positive"
          label="Confirm Release"
          :loading="isProcessing"
          :disable="isProcessing"
          @click="handleConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { callContractRelease } from 'src/auction/arbiter';

const props = defineProps({
  modelValue: Boolean,
  balanceDisplay: {
    type: String,
    default: '0.000'
  },
  bidId: {
    type: [String, Number],
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const isProcessing = ref(false)

const handleConfirm = async () => {
  if (isProcessing.value) return

  isProcessing.value = true
  try {
    $q.loading.show({ message: 'Processing release...' })

    const result = await callContractRelease(props.bidId)

    if (result && result.success) {
      $q.notify({
        type: 'positive',
        message: 'Funds released to seller successfully!'
      })
    } else {
      $q.notify({
        type: 'negative',
        message: 'Failed to release funds.'
      })
    }

    emit('confirm')
  } catch (err) {
    console.error('Failed to release funds:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to release funds.'
    })
  } finally {
    $q.loading.hide()
    isProcessing.value = false
  }
}
</script>