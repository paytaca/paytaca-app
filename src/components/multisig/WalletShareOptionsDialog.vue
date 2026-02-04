<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center q-gutter-y-sm">
        <div class="text-grad text-center text-h6 text-bold">{{$t('ShareWallet')}}</div>
        <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('ExportWalletDescription') }}</div>
        <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round >
              <q-icon class="default-text-color"  size="24px" name="qr_code" @click="handleDisplayQr"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize text-bold" style="font-size: 13px;">{{ $t('DisplayWalletQRCode') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DisplayWalletQRCodeDescription', {}, 'Display the QR code of the wallet to your cosigners') }}</div>
          </div>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
              <q-icon class="default-text-color"  size="24px" name="file_download" @click="handleDownloadWallet"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize text-bold" style="font-size: 13px;">{{ $t('DownloadWalletFile') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('DownloadWalletFileDescription', {}, 'Download the wallet file to your device and share it with your cosigners') }}</div>
          </div>
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
              <q-icon class="default-text-color"  size="24px" name="cloud_upload" @click="handleUploadWallet"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize text-bold" style="font-size: 13px;">{{ $t('UploadToCoordinatorServer', {}, 'Upload to Coordinator Server') }}</div>
            <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('UploadWalletToServerDescription', {}, 'Upload wallet to server so it can be discovered by your cosigners online.') }}</div>
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const { t: $t } = useI18n()

// eslint-disable-next-line no-undef
const props = defineProps({
  wallet: Object,
  darkMode: Boolean,
  multisigWallet: Object,
  cashAddressNetworkPrefix: String
})

// eslint-disable-next-line no-undef
defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const handleDisplayQr = () => {
  onDialogOK({ action: 'display-qr', wallet: props.wallet })
}

const handleDownloadWallet = () => {
  onDialogOK({ action: 'download-wallet', wallet: props.wallet })
}

const handleUploadWallet = () => {
  onDialogOK({ action: 'upload-wallet', wallet: props.wallet })
}

</script>
<style scoped>
/* unset default style for active item */
.q-item.q-router-link--active, .q-item--active {
 color: inherit
}
</style>
