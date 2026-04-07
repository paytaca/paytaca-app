<template>
  <q-dialog ref="dialogRef" full-width full-height maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="q-dialog-plugin pt-card row items-center justify-center text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="col-12 justify-center" style="max-height: 90vh; overflow-y: auto;">
        <div class="text-center text-bold">{{ $t('ProposalDetails', {}, 'Proposal Details') }}</div>
        
        <div class="q-pa-sm">
          <div class="q-mb-md">
            <div class="text-subtitle2 text-bow-muted">{{ $t('Purpose', {}, 'Purpose') }}</div>
            <div class="text-body1">{{ pst?.purpose || 'N/A' }}</div>
          </div>
          
          <div v-if="metadataKeys.length > 0" class="q-mb-md">
            <div class="text-subtitle2 text-bow-muted q-mb-sm flex items-center" >
              <div>{{ $t('Metadata') }}</div>
              <q-btn flat dense size="sm" icon="content_copy" @click="copyToClipboard(JSON.stringify(pst?.metadata || {}))" class="q-ml-sm">
                <q-tooltip>{{ $t('Copy') }}</q-tooltip>
              </q-btn>
            </div>
            <div v-for="key in metadataKeys" :key="key" class="q-mb-sm">
              <div class="text-caption text-bow-muted">{{ formatMetadataKey(key) }}</div>
              <div class="text-body2 metadata-value">
                {{ formatMetadataValue(metadata[key]) }}
              </div>
            </div>
          </div>
          
          <div class="q-mb-md">
            <div class="text-subtitle2 text-bow-muted">{{ $t('Fee') }}</div>
            <div class="text-body1">{{ fee }} BCH</div>
          </div>
          
          <div class="q-mb-md">
            <div class="flex items-center justify-between">
              <div class="text-subtitle2 text-bow-muted">{{ $t('RawTxHex', {}, 'Raw Tx Hex') }}</div>
              <q-btn flat dense size="sm" icon="content_copy" @click="copyRawTx" class="q-ml-sm">
                <q-tooltip>{{ $t('Copy') }}</q-tooltip>
              </q-btn>
            </div>
            <pre class="decoded-tx" :class="getDarkModeClass(darkMode)">{{ rawTxHex }}</pre>
          </div>
          
          <div class="q-mb-md">
            <div class="text-subtitle2 text-bow-muted">{{ $t('DecodedTransaction', {}, 'Decoded Transaction') }}</div>
            <pre class="decoded-tx" :class="getDarkModeClass(darkMode)">{{ decodedTxJson }}</pre>
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="fixed-bottom q-pa-md" style="bottom: env(safe-area-inset-bottom, 0);">
        <q-btn :label="$t('Close')" @click="onDialogCancel" color="negative" v-close-popup class="full-width" rounded></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent, copyToClipboard } from 'quasar'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { hexToBin, decodeTransactionCommon, stringify } from 'bitauth-libauth-v3'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst } from 'src/lib/multisig'
import Big from 'big.js'

const { t: $t } = useI18n()

// eslint-disable-next-line no-undef
const props = defineProps({
  darkMode: Boolean,
  pst: Pst,
  networkProvider: Object
})

// eslint-disable-next-line no-undef
defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const fee = computed(() => {
  return Big(props.pst?.getSatsFee() || 0).div(1e8).toString()
})

const metadata = computed(() => {
  return props.pst?.metadata || {}
})

const metadataKeys = computed(() => {
  if (!metadata.value || typeof metadata.value !== 'object') return []
  return Object.keys(metadata.value).filter(k => k !== 'purpose')
})

const rawTxHex = computed(() => {
  return props.pst?.unsignedTransactionHex || 'N/A'
})

const decodedTxJson = computed(() => {
  try {
    const decodedTx = decodeTransactionCommon(hexToBin(props.pst?.unsignedTransactionHex))
    if (decodedTx) {
      return stringify(decodedTx)
    }
    return 'Unable to decode transaction'
  } catch (e) {
    return 'Unable to decode transaction'
  }
})

const formatMetadataKey = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
}

const formatMetadataValue = (value) => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const copyRawTx = () => {
  copyToClipboard(props.pst?.unsignedTransactionHex || '')
}
</script>

<style scoped>
.decoded-tx {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.7em;
  max-height: 50vh;
  overflow-y: auto;
  padding: 12px;
  border-radius: 8px;
  margin: 0;
}

.decoded-tx.light {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.decoded-tx.dark {
  background: rgba(255, 255, 255, 0.05);
  color: #ccc;
}

.metadata-value {
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
