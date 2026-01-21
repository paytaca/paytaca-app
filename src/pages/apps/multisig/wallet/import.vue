<template>
    <div class="static-container">
      <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('Import Wallet')"
          backnavpath="/apps"
          class="q-px-sm apps-header gift-app-header"
        />
          <div class="text-caption text-center text-bow-muted">
            <q-banner class="q-ma-lg rounded" :class="getDarkModeClass(darkMode)">
              <q-icon name="info" color="grad" size="sm" class="q-mr-sm"></q-icon>{{ $t('ImportMultisigWalletConfiguration') }}
            </q-banner>
          </div>
          <div class="flex column text-center q-gutter-y-xl" style="margin-top: 20px;">
              <div>
                <q-btn @click="$router.push({ name: 'qr-reader', query: { hideFooter: true, hideGenerateQR: true, hideUploadQR: true } })" color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="lg">
                  <q-icon class="default-text-color"  size="lg" name="qr_code" />
                </q-btn>
                <div class="q-pt-xs text-h6 text-center text-capitalize" >{{ $t('ScanWalletQRCode') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="lg">
                  <q-icon class="default-text-color"  size="lg" name="upload_file" @click="importWalletFromFile"/>
                </q-btn>
                <div class="q-pt-xs text-h6 text-center text-capitalize" >{{ $t('FromFile') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round size="lg">
                  <q-icon class="default-text-color"  size="lg" name="mdi-cloud-download-outline" @click="importWalletFromServer"/>
                </q-btn>
                <div class="q-pt-xs text-h6 text-center text-capitalize" >{{ $t('FromServer') }}</div>
              </div>
              <div>
                <q-btn size="lg" :label="$t('Cancel')" @click="router.back()" color="red" v-close-popup></q-btn>
              </div>
          </div>
       </div>
       <q-file
        ref="walletFileElementRef"
        v-model="walletFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdateWalletFileModelValue">
      </q-file>
    </div>
  </template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, ref} from 'vue'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useRoute, useRouter } from 'vue-router'
import { MultisigWallet } from 'src/lib/multisig'
import { cborDecode } from '@ngraveio/bc-ur/dist/cbor'
import { base64ToBin } from 'bitauth-libauth-v3'
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const walletFileElementRef = ref()
const walletFileModel = ref()
const walletInstance = ref()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const importWalletFromFile = () => {
  walletFileElementRef.value.pickFiles()
}

const importWalletFromServer = () => {
  router.push({ name: 'app-multisig-wallet-import-from-server' })
}

const onUpdateWalletFileModelValue = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const decoded = cborDecode(base64ToBin(reader.result))
      walletInstance.value = MultisigWallet.import(decoded)
      walletInstance.value.setStore($store)
      walletInstance.value.save()
      router.push({
        name: 'app-multisig-wallet-view',
        params: { wallethash: walletInstance.value.getWalletHash() }
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}


onMounted(() => {
    if (route.query.data) {
      const base64 = decodeURIComponent(route.query.data)
      console.log('base64', base64)
      const decoded = cborDecode(base64ToBin(base64))
      const wallet = MultisigWallet.import(decoded)
      console.log('imported wallet', wallet)
      wallet.setStore($store)
      wallet.save()
      router.push({
        name: 'app-multisig-wallet-view',
        params: { wallethash: wallet.getWalletHash() }
      })
    }
})

</script>
