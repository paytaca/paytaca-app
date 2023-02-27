<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card :class="darkMode ? 'pt-dark' : 'text-black'" style="height:100%;width:100%;max-height:90vh;">
      <div class="row no-wrap items-center justify-center q-pl-md q-mt-sm">
        <div class="text-h6 q-space q-mt-sm">Gift</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height:calc(90vh - 3.5rem);overflow-y:auto" class="q-pt-sm">
        <div class="text-center text-h5">Amount: {{ amount }} BCH</div>
        <div class="row justify-center">
          <div class="col-qr-code">
            <qr-code :text="qrCodeContents"/>
          </div>
        </div>
        <div
          class="q-py-sm q-px-md q-px-lg q-my-xs row items-center no-wrap rounded-borders"
          style="border:1px solid grey; position:relative"
          v-ripple
          @click="() => copyToClipboard(qrCodeContents)"
        >
          <div class="ellipsis">{{ qrCodeContents }}</div>
          <q-icon name="content_copy" size="1.25em" class="q-ml-sm"/>
        </div>
        <div class="text-center text-subtitle1">Scan to claim the gift</div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { computed, inject } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar'
import { useDialogPluginComponent } from 'quasar'

// dialog plugins requirement
defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $copyText = inject('$copyText')
const $q = useQuasar()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const props = defineProps({
  gift: Object,
})

const qrCodeContents = computed(() => $store.getters['gifts/getQrShare'](props.gift?.gift_code_hash))
const amount = computed(() => props.gift?.amount)


function copyToClipboard (value, message='Copied to clipboard') {
  $copyText(value)
  $q.notify({
    message: message,
    timeout: 800,
    color: 'blue-9',
    icon: 'mdi-clipboard-check'
  })
}
</script>
<style lang="scss" scoped>
  .col-qr-code {
    display: flex;
    justify-content: center;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    background: white;
    padding: 12px;
  }
</style>
