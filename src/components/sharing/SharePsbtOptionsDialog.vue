<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6">{{ $t('ShareTransactionProposal', {}, 'Share Transaction Proposal') }}</div>
        <div class="text-caption text-center text-bow-muted">
          <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
            <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>
            {{ $t('SharePsbtDescription', {}, 'Share this unsigned transaction (PSBT) so the wallet owner can sign and broadcast it from their signer device.') }}
          </q-banner>
        </div>
        <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color" size="24px" name="qr_code" @click="handleDisplayQr" />
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DisplayTransactionProposalQRCode', {}, 'Display Transaction QR Code') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DisplayTransactionProposalQRCodeHint', {}, 'Scan the animated QR from the signer device') }}</div>
          </div>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color" size="24px" name="file_download" @click="handleDownload" />
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('DownloadTransactionProposalFile', {}, 'Download PSBT File') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DownloadTransactionProposalFileHint', {}, 'Download a .psbt file to send to the wallet owner') }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close', {}, 'Close')" @click="onDialogCancel" color="red" v-close-popup rounded></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { useDialogPluginComponent } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const { t: $t } = useI18n()

const props = defineProps({
  darkMode: Boolean,
  psbtBase64: String
})

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const handleDisplayQr = () => {
  onDialogOK({ action: 'display-qr', psbtBase64: props.psbtBase64 })
}

const handleDownload = () => {
  onDialogOK({ action: 'download', psbtBase64: props.psbtBase64 })
}
</script>
<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>