<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 500px; max-width: 90vw;">
      <div class="row no-wrap items-center justify-center q-pl-md sticky-header">
        <div class="text-h6 q-space q-mt-sm">
          <div>{{ storeData?.id ? $t('EditStore') : $t('AddStore') }}</div>
          <div v-if="storeData?.id" class="text-grey text-caption bottom">#{{ storeData?.id }}</div>
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>

      <q-card-section class="q-gutter-y-sm">
        <StoreInfoForm 
          ref="storeForm" 
          :store-data="storeData" 
          @cancel="onDialogCancel" 
          @saved="onDialogOK" 
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { useRoute } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import StoreInfoForm from './StoreInfoForm.vue'

const props = defineProps({
  storeData: {
    type: Object,
    default: () => ({})
  },
  modelValue: Boolean
})

const $emit = defineEmits([
  'update:modelValue',
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const $route = useRoute()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const storeForm = ref(null)

/**
 * Automatically close dialog if user navigates away (e.g. via hardware back button)
 */
watch(() => $route.fullPath, () => {
  onDialogCancel()
})

/**
 * Handle modelValue for seamless usage if needed
 */
const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => props.modelValue, (val) => { innerVal.value = val })

/**
 * Reset form when dialog opens/closes if needed
 */
watch(() => props.modelValue, (val) => {
  if (val) {
    storeForm.value?.resetForm()
  }
})
</script>
