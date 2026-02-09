<template>
    <div class="static-container">
      <div id="app-container" class="sticky-header-container multisig-app text-bow" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('Import')"
          :backnavpath="`/apps/multisig/wallet/${route.params.wallethash}`"
          class="q-px-sm apps-header gift-app-header"
        />
          <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>{{ $t(route.query.description || 'Import') }}
            </q-banner>
          </div>
          <div class="flex column text-center q-gutter-y-xl">
              <div>
                <q-btn @click="$router.push({ name: 'qr-reader', query: { hideFooter: true, hideGenerateQR: true, hideUploadQR: true } })" color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="qr_code" />
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('ScanQrCode') }}</div>
                <div class="text-subtitle-2 text-center text-bow text-bow-muted">{{ $t('ScanPstQRCodeDescription', {}, 'Ask one of your cosigners to show you the transaction QR code then scan it') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="upload_file" @click="importPsbt"/>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('FromFile') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('PstFromFileDescription', {}, 'Browse and import a Partially Signed Transaction File you get from your cosigner') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="upload_file" @click="importPsbt"/>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('FromServer') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('PstFromServerDescription', {}, 'Download a Partially Signed Transaction Submitted by a Cosigner from Paytaca\'s Multisig Coordinator Server') }}</div>
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

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const importPsbt = () => {
  pstFileElementRef.value.pickFiles()
}

const onUpdatePstFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const importedPst = Pst.import(reader.result)
      console.log('IMPORTED PST', importedPst)
      
      canonicalPsbt.value = 
        $store.getters['multisig/getPsbtByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
      console.log('Canocical', canonicalPsbt.value)

      try {
        if (canonicalPsbt.value) {
          const canonicalPst = Pst.import(canonicalPsbt.value)
          console.log('canonicalPst', canonicalPst)
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

onMounted(() => {
  if (route.params.unsignedTransactionHash) { 
    canonicalPsbt.value = 
      $store.getters['multisig/getPsbtByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
  }
})

</script>
