<template>
  <q-dialog ref="dialogRef" v-model="innerVal" @hide="onDialogHide" no-backdrop-dismiss seamless>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:min(350px, 90vw)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">
          {{ $t('MerchantDetails', {}, 'Merchant details') }}
          <span v-if="merchant?.id" class="text-grey">
            #{{merchant?.id}}
          </span>
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
        <MerchantInfoForm ref="merchantForm" :merchant="merchant" @cancel="onDialogCancel" @saved="onDialogOK"/>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useStore } from 'vuex';
import { computed, ref, watch } from 'vue';
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import MerchantInfoForm from 'src/components/paytacapos/MerchantInfoForm.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

// dialog plugins requirement
const $emit = defineEmits([
  'update:modelValue',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])

const props = defineProps({
  modelValue: Boolean,
  merchant: Object,
})
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => props.modelValue, () => innerVal.value = props.modelValue)

const merchantForm = ref()
watch(innerVal, () => {
  if (!innerVal.value) return
  merchantForm.value?.resetForm()
})
</script>
