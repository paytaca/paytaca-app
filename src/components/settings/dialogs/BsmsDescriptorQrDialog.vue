<template>
  <q-dialog
    ref="dialogRef"
    full-width
    full-height
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card
      class="q-dialog-plugin pt-card row items-center justify-center text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section class="col-12 justify-center">
        <div class="text-grad text-center text-h6">
          {{ $t('BsmsWalletDescriptor', {}, 'BSMS Wallet Descriptor') }}
        </div>
        <div class="text-subtitle-2 text-center text-bow-muted">
          {{ $t('ScanQrCode') }}
        </div>
        <div class="flex flex-center q-mt-md">
          <qr-code :text="descriptor" :size="300" />
        </div>
        <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
          <div>
            <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="14px">
              <q-icon class="default-text-color" size="24px" name="content_copy" @click="copyToClipboard"/>
            </q-btn>
            <div class="q-pt-xs text-center text-capitalize" style="font-size: 13px;">{{ $t('CopyToClipboard') }}</div>
          </div>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn :label="$t('Close')" @click="onDialogOK" color="red" rounded v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent, copyToClipboard as quasarCopyToClipboard } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  name: 'BsmsDescriptorQrDialog',
  props: {
    descriptor: {
      type: String,
      required: true
    }
  },
  emits: [...useDialogPluginComponent.emits],
  setup() {
    const { dialogRef, onDialogOK } = useDialogPluginComponent()
    return {
      dialogRef,
      onDialogOK
    }
  },
  data() {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    copyToClipboard() {
      quasarCopyToClipboard(this.descriptor).then(() => {
        this.$q.notify({
          message: this.$t('CopiedToClipboard'),
          timeout: 200,
          color: 'blue-9',
          icon: 'mdi-clipboard-check'
        })
      }).catch(() => {
        this.$q.notify({
          type: 'negative',
          message: this.$t('CopyToClipboardFailed', {}, 'Failed to copy to clipboard'),
          timeout: 2000
        })
      })
    }
  }
}
</script>