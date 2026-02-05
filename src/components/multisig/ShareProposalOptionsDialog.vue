<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{$t('ShareTransactionProposal')}}</div>
        <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>
              {{ $t('ShareTransactionProposalDescription') }}
            </q-banner>
          </div>
        <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color"  size="24px" name="qr_code" @click="handleDisplayQr"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DisplayTransactionProposalQRCode') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DisplayTransactionProposalQRCodeHint') }}</div>
          </div>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color"  size="24px" name="file_download" @click="handleDownloadProposal"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DownloadTransactionProposalFile') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DownloadTransactionProposalFileHint') }}</div>
          </div>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
              <q-icon class="default-text-color"  size="24px" name="cloud_upload" @click="handleUploadProposal"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize text-bold" style="font-size: 13px;">{{ $t('UploadToCoordinatorServer') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('UploadProposalHint') }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogCancel" color="red" v-close-popup></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup> 
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { Pst } from 'src/lib/multisig'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const { t: $t } = useI18n()

// eslint-disable-next-line no-undef
const props = defineProps({
  darkMode: Boolean,
  pst: Pst
})

// eslint-disable-next-line no-undef
defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const handleDisplayQr = () => {
  onDialogOK({ action: 'display-qr', pst: props.pst })
}

const handleDownloadProposal = () => {
  onDialogOK({ action: 'download-proposal', pst: props.pst })
}

const handleUploadProposal = () => {
  onDialogOK({ action: 'upload-proposal', pst: props.pst })
}

</script>
<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>
