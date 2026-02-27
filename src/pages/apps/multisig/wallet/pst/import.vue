<template>
    <div class="static-container">
      <div id="app-container" class="sticky-header-container multisig-app text-bow" :class="getDarkModeClass(darkMode)">
        <HeaderNav
          :title="$t('ImportProposal', {}, 'Import Proposal')"
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
                <div class="text-subtitle-2 text-center text-bow text-bow-muted">{{ $t('ScanPstQRCodeDescription', {}, 'Ask one of your cosigners to show you the QR code of the Transaction Proposal then scan it') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" round>
                  <q-icon class="default-text-color"  name="upload_file" @click="importPsbt"/>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('FromFile') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('PstFromFileDescription', {}, 'Browse and import a Transaction Proposal File you get from your cosigner') }}</div>
              </div>
              <div>
                <q-btn color="primary" class="button-default" :class="darkMode ? 'dark' : 'light'" :disable="proposalsFromServer?.length === 0" round >
                  <q-icon class="default-text-color"  name="mdi-cloud-download-outline" @click="()=> importPsbtFromServer()"/>
                  <q-badge v-if="proposalsFromServer" floating :color="proposalsFromServer?.length > 0? 'negative': 'grey'">{{ proposalsFromServer.length }}</q-badge>
                </q-btn>
                <div class="q-pt-xs text-center text-capitalize text-bold">{{ $t('FromServer') }}</div>
                <div class="text-subtitle-2 text-center text-bow-muted">{{ $t('PstFromServerDescription', {}, 'Download a Transaction Proposal from Paytaca\'s Multisig Coordinator Server') }}</div>
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
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useRoute, useRouter } from 'vue-router'
import { Pst, MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

import ImportProposalSelectionDialog from 'components/multisig/ImportProposalSelectionDialog'

const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { 
  multisigCoordinationServer, 
  multisigNetworkProvider, 
  resolveXprvOfXpub,
  getSignerXPrv, 
  getAssetTokenIdentity,
  cashAddressNetworkPrefix,
  resolveMnemonicOfXpub
} = useMultisigHelpers()


const pstFileElementRef = ref()
const pstFileModel = ref()  
const canonicalPsbt = ref(null)
const proposalsFromServer = ref()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const savedWallet = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (savedWallet) {
    return MultisigWallet.importFromObject(savedWallet, {
      store: $store,
      provider: multisigNetworkProvider,
      coordinationServer: multisigCoordinationServer,
      resolveXprvOfXpub,
      resolveMnemonicOfXpub
    })
  }
  return null
})


const importPsbt = () => {
  pstFileElementRef.value.pickFiles()
}

const importPsbtFromServer = async () => {
  if (proposalsFromServer.value?.length > 0) {
    const decodedProposals = []

    for(const p of proposalsFromServer.value) {
      if (p.proposalFormat && p.proposalFormat !== 'psbt') continue 
      try {
        const decoded = Pst.import(p.combinedPsbt || p.proposal) 
        decoded.id = p.id     
        decodedProposals.push(decoded)
      } catch (error) {
        console.log(error)
        // ignore proposal that can't be decoded
      }
    }

    $q.dialog({
      component: ImportProposalSelectionDialog,
      componentProps: {
        darkMode: darkMode.value,
        proposals: decodedProposals
      }
    }).onOk(async (selectedProposal) => {
      try {
        selectedProposal.setStore($store)
        selectedProposal.save()  
        router.push({ 
          name: 'app-multisig-wallet-pst-view', 
          params: { 
            wallethash: wallet.value.walletHash, 
            unsignedtransactionhash: selectedProposal.unsignedTransactionHash 
          } 
        })
      } catch (error) {
        $q.notify({
          message: $t('ImportSelectedProposalError', {}, 'Error importing proposal'),
          color: 'negative'
        })
      }
      
    }).onCancel(() => {
      // Dialog was closed without action
    })
  }
}

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
  // if (route.params.unsignedTransactionHash && route.params.unsignedTransactionHash !== 'unknown') { 
  //   canonicalPsbt.value = 
  //     $store.getters['multisig/getPsbtByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
  // }
  // if (!canonicalPsbt.value) {

  // }

  if (wallet.value) {
    proposalsFromServer.value = await wallet.value.fetchProposals('pending')

  }
})

</script>
