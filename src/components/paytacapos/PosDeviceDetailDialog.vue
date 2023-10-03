<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card :class="darkMode ? 'pt-dark info-banner' : 'text-black'" class="br-15">
      <div class="row no-wrap items-center justify-center q-pl-md q-py-sm">
        <div class="text-h5 q-space q-mt-sm"> {{ $t('POSID')}}#{{ paddedPosId }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section class="q-gutter-y-sm">
        <div class="qr-code-container">
          <qr-code
            :text="qrCodeData"
            color="#253933"
            :size="250"
            error-level="H"
            class="q-mb-sm"
          />
        </div>
        <div v-if="name" class="text-center text-body1">
          {{ name }}
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { createQrCodeData, padPosId } from 'src/wallet/pos'
import { useDialogPluginComponent } from 'quasar'
import { computed } from 'vue';
import { useStore } from 'vuex';

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  posId: Number,
  name: { type: String, required: false },
})

const paddedPosId = computed(() => padPosId(props.posId))
const qrCodeData = computed(() => {
  const wallet = $store.getters['global/getWallet']('bch')
  return createQrCodeData({
    walletHash: wallet?.walletHash,
    xPubKey: wallet?.xPubKey,
    posId: props.posId
  }, {
    compressed: true,
  })
})
</script>
<style scoped>
.qr-code-container {
  position:relative;

  background-color: white;

  display: flex;
  justify-content: center;
  align-content: center;

  border-radius: 16px;
  border: 2px solid #ed5f59;

  padding: 1rem;
}
</style>
