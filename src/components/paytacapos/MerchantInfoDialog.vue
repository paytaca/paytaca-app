<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" no-backdrop-dismiss>
    <q-card :class="darkMode ? 'pt-dark info-banner' : 'text-black'" class="br-15" style="width:min(350px, 90vw)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">{{ $t('MerchantDetails', {}, 'Merchant details') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm">
        <MerchantInfoForm @cancel="hide()"/>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useStore } from 'vuex';
import { computed } from 'vue';
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import MerchantInfoForm from 'src/components/paytacapos/MerchantInfoForm.vue'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const $t = useI18n().t
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
</script>