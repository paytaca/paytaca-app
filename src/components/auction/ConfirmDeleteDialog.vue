<template>
  <q-dialog 
    :model-value="isToggledDeleteLot" 
    @update:model-value="$emit('update:isToggledDeleteLot', $event)" 
    position="bottom"
  >
    <q-card class="br-15 pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section class="q-pa-md text-center">
        <q-avatar icon="delete" color="red-1" text-color="red" size="md" class="q-mb-sm" />
        <div class="text-h6 text-weight-bold">Delete Lot?</div>
        
        <p class="text-caption q-mt-sm">
          Are you sure you want to remove <strong>"{{ lotName || 'this lot' }}"</strong>? This action cannot be undone.
        </p>
      </q-card-section>

      <q-card-section class="row q-col-gutter-sm q-px-md q-pb-md">
        <div class="col-6">
          <q-btn
            outline
            no-caps
            class="full-width text-weight-medium"
            color="primary"
            label="Cancel"
            @click="$emit('update:isToggledDeleteLot', false)"
          />
        </div>
        <div class="col-6">
          <q-btn
            unelevated
            no-caps
            class="full-width text-weight-medium"
            color="red"
            label="Delete"
            @click="$emit('confirm-delete')"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { computed } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useStore } from 'vuex'

defineProps({
  isToggledDeleteLot: {
    type: Boolean,
    required: true
  },
  lotName: {
    type: String,
    default: ''
  }
})

defineEmits(['update:isToggledDeleteLot', 'confirm-delete'])

const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>