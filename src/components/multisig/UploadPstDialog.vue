<template>
  <q-dialog ref="dialogRef" full-width full-height maximized>
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('Upload Tx Proposal')}}</div>
        <div class="text-subtitle-2 text-justify">
Instead of exporting the partially signed transaction proposal as a file for manual sharing and signing, you can upload it to the Paytaca server so that your cosigners can access it. This operation only uploads the transaction details. <strong>Private keys are never uploaded.</strong>
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
          :label="$t('Upload')"
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
  multisigTransaction: Object,
  darkMode: Boolean
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

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
