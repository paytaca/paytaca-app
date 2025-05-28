<template>
  <q-dialog ref="dialogRef" full-width full-height maximized>
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('Sync Wallet Across Devices')}}</div>
        <div class="text-subtitle-2 text-justify">
Instead of exporting the multisig wallet as a file for manual sharing, you can sync it directly across signers' devices. This operation uploads only the essential wallet details—such as the wallet name, signer xpubs, and required number of signatures—to the server. <strong>Private keys are never uploaded.</strong>
        </div>
          <q-list v-if="false" separator>
           <q-item-label class="text-justify text-h6 q-mb-sm">This process involves signing a message that'll be verified by the server. It Looks like multiple signers can sign on this device. You may select which signer as 'admin' to the {{ multisigWallet.name || 'multisig'}} wallet. This is just for record keeping and has nothing to do with the transaction signing process. </q-item-label>
           <q-separator />
           <q-item v-for="signerEntityIndex in signerEntityIndicesWithXprv" clickable @click="onSignerSelect(signerEntityIndex)" :key="signerEntityIndex">
        <q-item-section>
          <q-item-label>{{ multisigWallet?.signers[signerEntityIndex].name }}</q-item-label>
        </q-item-section>
        <q-item-section side top>
          <q-icon v-if="selectedSignerEntityIndex === signerEntityIndex" name="check"></q-icon>
        </q-item-section>
      </q-item>
          </q-list>
      <div  v-if="multisigWallet?.signers?.[selectedSignerEntityIndex]">
        This wallet will sync on {{ multisigWallet.signers[selectedSignerEntityIndex].name }}'s Paytaca devices. Cosigner's using Paytaca will also be able to 
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
          @click="onOkClick"
          color="primary"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useStore } from 'vuex'
import { ref, onMounted, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { useStore } from 'vuex'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { shortenString } from 'src/lib/multisig'

const props = defineProps({
  multisigWallet: Object,
  darkMode: Boolean
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const { localWallets } = useMultisigHelpers()
const selectedWallet = ref()
const $store = useStore()
const selectedSignerEntityIndex = ref()
const signerEntityIndicesWithXprv = computed(() => {
  return Object.keys(props.multisigWallet?.signers || {}).filter((signerEntityIndex) => {
    return Boolean(props.multisigWallet.signers[signerEntityIndex].xprv) || true
  })
})

const onSignerSelect = (signerEntityIndex) => {
  selectedSignerEntityIndex.value = signerEntityIndex
}
const onOkClick = () => {
  onDialogOK()
}
</script>

<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>
