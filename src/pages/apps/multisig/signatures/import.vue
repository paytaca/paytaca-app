<template>
    <div class="static-container">
      <div id="app-container" class="sticky-header-container multisig-app text-bow" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('Import')"
          :backnavpath="`/apps/multisig/wallet/${route.params.wallethash}/pst/${route.params.unsignedtransactionhash}`"
          class="q-px-sm apps-header gift-app-header"
        />
          <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>{{ $t('ImportSignerSignatureDescription', {}, `Scan or Load ${route.query?.signerName || 'Cosigner'} \'s signatures.`) }}
            </q-banner>
          </div>
          <div class="flex column text-center q-gutter-y-xl">
              <div>
                <q-btn @click="$router.push({ name: 'qr-reader', query: { hideFooter: true, hideGenerateQR: true, hideUploadQR: true } })" color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="qr_code" />
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('ScanQrCode') }}</div>
                <div class="text-subtitle-2 text-center text-bow text-bow-muted">{{ $t('ScanPstQRCodeDescription', {}, 'Ask one of your cosigner to show share and display a partially signed transaction QR code then scan it') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="upload_file" @click="importPsbt"/>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('ImportPartiallySignedTransactionFromFile') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('ImportPartiallySignedTransactionFromFileHint', {}, 'Browse and import a Partially Signed Transaction File you get from your cosigner') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round :disable="!signerSignatures">
                  <q-icon class="default-text-color"  name="cloud_download" @click="importFromServer"/>
                  <q-badge v-if="signerSignatures" floating rounded></q-badge>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('ImportPartialSignaturesFromServer') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('ImportPartialSignaturesFromServer', {}, 'Download signatures from Paytaca\'s Multisig Coordinator Server') }}</div>
              </div>
              <div>
                <q-btn :label="$t('Cancel')" @click="router.back()" color="red" v-close-popup></q-btn>
              </div>
          </div>
       </div>
       <q-file
        ref="pstFileElementRef"
        v-model="pstFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdatePstFile">
      </q-file>
    </div>
  </template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref } from 'vue'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useRoute, useRouter } from 'vue-router'
import { Pst } from 'src/lib/multisig'
import { useQuasar } from 'quasar'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const pstFileElementRef = ref()
const pstFileModel = ref()  
const canonicalPsbt = ref(null)

/** @type {import('src/lib/multisig/pst').DecodedSignerSignatureData[]} */
const signerSignatures = ref([])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const importPsbt = () => {
  pstFileElementRef.value.pickFiles()
}

const importFromServer = async () => {
  if (!canonicalPsbt.value) return 
  if (!signerSignatures.value) return 

  $q.dialog({
    title: $t('SignerSignatureFoundOnServerTitle'),
    message: $t('SignerSignatureFoundOnServerMessage'),
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
    ok: { 
      label: $t('ConfirmImport'),
      color: 'primary',
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)}`,
    },
    cancel: { 
      label: $t('Cancel'),
      color: 'default',
      outline: true,
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)} `,
    },
    
  }).onOk(async () => {
    const pst = Pst.import(canonicalPsbt.value)
    if (pst.options?.coordinationServer) {
      const signatures = await pst.options.coordinationServer.getSignerSignatures({
        masterFingerprint: route.params.masterfingerprint, 
        proposalUnsignedTransactionHash: pst.unsignedTransactionHash 
      })
      if (signatures) {
        try {
          pst.mergeSignerSignatures(signatures)
          pst.setStore($store)
          pst.save()
          router.back()
        } catch (error) {
          $q.dialog({
            message: error?.toString(),
            color: 'negative'
          })
        }
      }
    }
  }).onCancel(() => {})
}

// TODO: Update this, this is from psbt combine feature
//       Make the merge of signature more granular per signer as expected from this page 
//       Check for specified signer signatures
//       Display dialog if no signature found
//       Display if signatures found but not from intended signer
const onUpdatePstFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const importedPst = Pst.import(reader.result)
      
      canonicalPsbt.value = 
        $store.getters['multisig/getPsbtByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
      
      try {
        if (canonicalPsbt.value) {
          const canonicalPst = Pst.import(canonicalPsbt.value)
          canonicalPst.combine([importedPst])
          canonicalPst.setStore($store)
          canonicalPst.save()
        } else {
          importedPst.setStore($store)
          importedPst.save()
        }
        router.push({ 
          name: 'app-multisig-wallet-pst-view', 
          params: { 
            unsignedtransactionhash: importedPst.unsignedTransactionHash,
            wallethash: route.params.wallethash
          }
        })  
      } catch (error) {
        $q.notify({
          message: error?.toString(),
          color: 'negative'
        })
      }
      
    }
    reader.onerror = (error) => {
      $q.notify({
        message: error?.toString(),
        color: 'negative'
      })
    }
    reader.readAsText(file)
  }
}

onMounted(async () => {
  if (route.params.unsignedtransactionhash) { 
    canonicalPsbt.value = 
      $store.getters['multisig/getPsbtByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
  }
  if (canonicalPsbt.value) {
    const pst = Pst.import(canonicalPsbt.value)
    if (pst.options?.coordinationServer) {
      const signatures = await pst.options.coordinationServer.getSignerSignatures({
        masterFingerprint: route.params.masterfingerprint, 
        proposalUnsignedTransactionHash: pst.unsignedTransactionHash 
      })
      if (signatures) {
        signerSignatures.value = signatures
      }
    }
  }
  
})

</script>
