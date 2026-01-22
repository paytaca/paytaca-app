<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card :class="darkMode ? 'pt-card-3' : 'text-black'" class="bottom-card">
      <q-card-section>
        <div class="text-h5 q-mb-md">{{ $t('ShareGift') }}</div>
        <ShareGiftPanel :qr-share="qrCodeContents" :amount="gift?.amount"/>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent } from 'quasar'
import ShareGiftPanel from './ShareGiftPanel.vue'

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
  gift: Object,
})

const qrCodeContents = computed(() => props.gift?.qr || props.gift?.giftCode || null)
</script>