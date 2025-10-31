<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    no-backdrop-dismiss
    seamless
    class="no-click-outside"
  >
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width:min(350px, 90vw)">
      <div class="row no-wrap items-start justify-center q-pl-md">
        <div class="q-space q-mt-sm">
          <div class="text-h6">
            {{ $t('AcceptedTokens', {}, 'AcceptedTokens') }}
          </div>
          <div v-if="merchant?.id" class="text-grey">
            {{ $t('Merchant') }}#{{merchant?.id}}
          </div>
        </div>
        <q-btn
          flat
          icon="close"
          padding="md"
          v-close-popup
        />
      </div>
      <q-card-section>
        <MerchantTokenOptions
          ref="formComponent"
          :merchant="merchant"
          :initialValue="selectedTokens"
          @saved="onSave"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useStore } from 'vuex';
import { useDialogPluginComponent } from 'quasar';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import MerchantTokenOptions from './MerchantTokenOptions.vue'

// dialog plugins requirement
const $emit = defineEmits([
  'update:modelValue',
  'saved',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])

const props = defineProps({
  modelValue: Boolean,
  merchant: Object,
  selectedTokens: Array,
  closeOnSave: Boolean,
})
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => props.modelValue, () => innerVal.value = props.modelValue)

const formComponent = ref();
watch(innerVal, () => {
  if (!innerVal.value) return
  formComponent.value?.resetComponent?.();
})
function onSave(...args) {
  if(props.closeOnSave) {
    innerVal.value = false
  }
  $emit('saved', ...args)
}
</script>
