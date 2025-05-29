<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{ $t('Share Online') }}</div>
        <div class="text-subtitle-2 text-justify" style="word-break: auto-phrase; text-indent: 1rem">
          <p>Click Ok to upload the {{ multisigWallet.name || 'multisig' }} wallet to the Paytaca server so you can easily access it on other devices.
          This also shares the {{ multisigWallet.name || 'multisig' }} wallet to your cosigners.
          Don't worry this action just sends the multisig wallet configuration such as the wallet name and signer's xpub keys it doesn't upload any private keys.</p>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          :label="$t('Cancel')"
          no-caps
          @click="onDialogCancel"
          color="primary"
          flat
        />
        <q-btn
          :label="$t('Ok')"
          no-caps
          @click="onDialogOK"
          color="primary"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineProps({
  multisigWallet: Object,
  darkMode: Boolean
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const selectedWallet = ref()

</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>
