<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Transaction')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.address}`}`" class="header-nav">
    </HeaderNav>
    <div class="row justify-center" style="margin-bottom: 4em;">
      <div class="col-xs-12 col-md-8 q-px-xs">
        <template v-if="multisigWallet && multisigTransaction?.transaction">
          <div>
            <q-list>
              <q-item>
                <q-item-section>
                    <q-item-label class="text-weight-bold">{{ multisigTransaction.metadata?.prompt }}</q-item-label>
                    <q-item-label caption lines="2" class="text-subtitle-2">Origin: {{ multisigTransaction.metadata?.origin }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                 <q-btn icon="more_vert" @click="openTransactionActionsDialog" flat dense />
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Number of recipients</q-item-label>
                </q-item-section>
                <q-item-section side>
                  {{ multisigTransaction.transaction.outputs.length }}&nbsp;
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Spending</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn v-if="multisigTransaction.sourceOutputs" flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{ getTotalBchInputAmount(multisigTransaction.transaction) }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Debit</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{
                      getTotalBchOutputAmount(
                        multisigTransaction.transaction
                      )
                    }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Credit/Change</q-item-label>
                  <q-item-label caption lines="2">*Returned to wallet</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{
                      getTotalBchChangeAmount(
                        multisigTransaction.transaction, decodeURIComponent(route.params.address),
                        isChipnet? toP2shTestAddress: null
                      )
                    }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>Fee</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                    {{ getTotalBchFee(multisigTransaction.transaction) }}
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-expansion-item>
                <template v-slot:header>
                  <q-item-section>
                    Raw Tx Details
                  </q-item-section>
                </template>
                <q-item-label class="q-pa-md">
                  <code style="word-break: break-all; filter: brightness(80%)">
                    {{ multisigTransaction.transaction }}
                  </code>
                </q-item-label>
              </q-expansion-item>
              <q-item>
                <q-item-section>
                  <q-icon name="mdi-wallet-outline" color="grad" size="md"></q-icon>
                </q-item-section>
                <q-item-section side>
                  <q-item-label >
                    {{
                       shortenString(
                         getMultisigCashAddress({
                           template: multisigWallet.template,
                           lockingData: multisigWallet.lockingData,
                           cashAddressNetworkPrefix 
                         }), 
                         35
                       )
                     }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset></q-separator>
              <q-item>
                <q-item-section>
                  <q-item-label class="text-bow-muted">Signatures</q-item-label>
                </q-item-section>
                <!-- <q-item-section side top>
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                </q-item-section> -->
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Required Signatures
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ multisigWallet.requiredSignatures }}&nbsp;
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Current Signatures 
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ getSignatureCount({ multisigWallet, multisigTransaction}) }}&nbsp;
                </q-item-section>
              </q-item>
              <q-expansion-item>
                <template v-slot:header>
                  <q-item-section>
                    Raw Sig Details
                  </q-item-section>
                </template>
                <q-item-label class="q-pa-md">
                  <code style="word-break: break-all; filter: brightness(80%)">
                    {{ stringify(multisigTransaction.signatures) }}
                  </code>
                </q-item-label>
              </q-expansion-item>
              <q-item v-for="signerEntityKey in Object.keys(multisigWallet.template.entities)" :key="signerEntityKey">
                <q-item-section >
                  <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                    <div>
                      {{ multisigWallet.template.entities[signerEntityKey].name || `Signer ${signerEntityKey}` }}
                    </div>
                    <q-icon
                      :color="isSignerSignatureOk({ signerEntityKey })? 'green': 'grey-8'"
                      :name="isSignerSignatureOk({ signerEntityKey })? 'done_all': ''"
                      size="sm"
                      >
                    </q-icon>
                  </div>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    label="Sign"
                    :disable="!hdPrivateKeys[signerEntityKey]"
                    :icon="hdPrivateKeys[signerEntityKey]? 'draw': 'edit_off'"
                    @click="signTransaction({ signerEntityKey })"
                    dense
                    no-caps
                    flat
                    :class="hdPrivateKeys[signerEntityKey] ? 'default-text-color': 'inactive-color'"
                    >
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label>Status</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn
                    @click="async () => await refreshTransactionStatus({ multisigWallet, multisigTransaction })"
                    :loading="multisigTransaction.metadata.isBroadcasting || multisigTransaction.metadata?.isRefreshingStatus"
                    flat
                    no-caps
                    dense
signerCanSignOnThisDevice                  >
                    <template v-slot:loading>
                      <div class="flex flex-nowrap items-center">
                          <span v-if="multisigTransaction.metadata?.isBroadcasting">Broadcasting Tx</span>
                          <span v-else-if="multisigTransaction.metadata?.isRefreshingStatus">Checking</span>
                          <q-spinner-radio v-if="multisigTransaction.metadata?.isBroadcasting" class="on-right"></q-spinner-radio>
                          <q-spinner-facebook v-else-if="multisigTransaction.metadata?.isRefreshingStatus" class="on-right"></q-spinner-facebook>
                      </div>
                  </template>
                    <template v-slot:default>
                      <div class="flex flex-nowrap items-center">
                        <span>{{ MultisigTransactionStatusText[multisigTransaction.metadata.status] }}</span>
                        <q-icon name="refresh" size="sm" class="q-ml-sm"></q-icon>
                      </div>
                  </template>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="Boolean(multisigTransaction?.txid) && multisigTransaction?.metadata?.status >= 3">
                <q-item-section>
                  <q-item-label>Transaction Id</q-item-label>
                  <q-item-label caption lines="2">{{shortenString(multisigTransaction.txid,10)}}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label>
                    <q-btn icon="launch" no-caps flat @click="openURL(`${txExplorerUrl}/${multisigTransaction?.txid}`)">View</q-btn>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item >
                <q-item-section>
                  <q-item-label>Synced</q-item-label>
                </q-item-section>
                <q-item-section side>
		  <q-item-label>{{ multisigTransaction.id ? 'Yes': 'No' }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
            </q-list>
             <q-btn
                      v-if="multisigTransaction.metadata?.status === MultisigTransactionStatus.PENDING_FULLY_SIGNED"
                      @click="broadcastTransaction"
                      :loading="multisigTransaction.metadata?.isBroadcasting"
                      :disable="multisigTransaction?.metadata?.status >= 3"
                      icon="cell_tower"
                      :color="!darkMode && 'primary'"
                      label="Broadcast"
                      style="width: 100%"
                      class="q-mt-lg"
                      >
                      <template v-slot:loading>
                        <q-spinner-radio class="on-left" />
                      </template>
                    </q-btn>
          </div>
        </template>
      </div>
      <q-file
	ref="pstFileElementRef"
        v-model="pstFileModel"
        :multiple="false"
        style="visibility: hidden"
        @update:model-value="onUpdatePstFile">
      </q-file>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useQuasar, openURL } from 'quasar'
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { stringify, hashTransaction } from 'bitauth-libauth-v3'
import { toP2shTestAddress } from 'src/utils/address-utils'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getTotalBchInputAmount,
  getTotalBchOutputAmount,
  getTotalBchChangeAmount,
  getTotalBchFee,
  shortenString,
  refreshTransactionStatus,
  signTransaction as signMultisigTransaction,
  finalizeTransaction,
  broadcastTransaction as broadcastMultisigTransaction,
  exportPst,
  getSignatureCount,
  signerHasSignature,
  signerCanSign,
  MultisigTransactionStatus,
  MultisigTransactionStatusText,
  importPst,
  combinePsts,
  getMultisigCashAddress
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import UploadPstDialog from 'components/multisig/UploadPstDialog.vue'
import TransactionActionsDialog from 'components/multisig/TransactionActionsDialog.vue'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const {
  getSignerXPrv,
  deleteTransaction,
  multisigWallets,
  updateTransaction,
  txExplorerUrl,
  cashAddressNetworkPrefix
} = useMultisigHelpers()

const hdPrivateKeys = ref({})
const multisigTransaction = ref()
const multisigWallet = computed(() => {
  return multisigWallets.value?.find((wallet) => {
    return wallet.address === decodeURIComponent(route.params.address)
  })
})

const pstFileElementRef = ref()
const pstFileModel = ref()

const isSignerSignatureOk = computed(() => {
  return ({ signerEntityKey }) => {
    if (multisigWallet.value && multisigTransaction.value) {
      return signerHasSignature({
        multisigWallet: multisigWallet.value,
        multisigTransaction: multisigTransaction.value,
        signerEntityKey
      })
    }
  }
})

const signerCanSignOnThisDevice = computed(() => {
  return ({ signerEntityKey }) => {
    return signerCanSign({ lockingData: multisigWallet.value.lockingData, signerEntityKey })
  }
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

const signTransaction = async ({ signerEntityKey }) => {
  if (!multisigWallet.value) return
  if (hdPrivateKeys.value[signerEntityKey]) {
    await loadHdPrivateKeys(multisigWallet.value.lockingData.hdKeys.hdPublicKeys)
  }
  if (!hdPrivateKeys.value[signerEntityKey]) retrun
 
  const signerSignatures = signMultisigTransaction({
    multisigWallet: multisigWallet.value,
    multisigTransaction: multisigTransaction.value,
    signerEntityKey,
    hdPrivateKey: hdPrivateKeys.value[signerEntityKey]
  })
  console.log('signerSignatures', signerSignatures)
}

const broadcastTransaction = async () => {
  if (!multisigTransaction.value?.isFinalized) {
    finalizeTransaction({
      multisigWallet: multisigWallet.value,
      multisigTransaction: multisigTransaction.value
    })
  }

  if (multisigTransaction.value?.signedTransaction) {
    await broadcastMultisigTransaction({
      multisigWallet: multisigWallet.value,
      multisigTransaction: multisigTransaction.value,
      chipnet: isChipnet.value
    })
  }
}

const downloadPst = () => {
  const defaultFilename = (multisigTransaction.value.metadata?.prompt || '').toLowerCase().replace(' ', '-')
  $q.dialog({
    title: 'Enter Filename',
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
    prompt: {
      type: 'text',
      model: defaultFilename
    }
  }).onOk((filename) => {
    if (!filename) return
    const data = exportPst({
      multisigTransaction: multisigTransaction.value,
      address: multisigWallet.value.address,
      addressIndex: multisigWallet.value.lockingData.hdKeys.addressIndex
    })
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}

const loadCosignerPst = () => {
  pstFileElementRef.value.pickFiles()
}

const onUpdatePstFile = (file) => {
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      const importedPst = importPst({ pst: reader.result })
      const hash = hashTransaction(importedPst.transaction)
      const existingMultisigTransaction = $store.getters['multisig/getTransactionByHash']({ hash })
      let combinedPst = null
      if (existingMultisigTransaction) {
         combinedPst = combinePsts({ psts: [structuredClone(existingMultisigTransaction), importedPst] })
      console.log('multisigTransaction combined', multisigTransaction)
      }
      $store.dispatch('multisig/saveTransaction', combinedPst || importedPst)
      const index = $store.getters['multisig/getTransactionIndexByHash']({ hash })
      console.log('INDEX', index)
      multisigTransaction.value = combinedPst || importedPst
      
      refreshTransactionStatus({
        multisigWallet: multisigWallet.value,
        multisigTransaction: multisigTransaction.value
      })
    }
    reader.onerror = (err) => {
      console.err(err)
    }
    reader.readAsText(file)
  }
}

const uploadTransaction = () => { 
  $q.dialog({
    component: UploadPstDialog,
    componentProps: {
      darkMode: darkMode.value
    }
  }).onOk(async () => {
    const pst = exportPst({
     multisigTransaction: multisigTransaction.value,
     address: '',
     addressIndex: multisigWallet.value.lockingData.hdKeys.addressIndex,
     format: 'json'
    })
    
    const r = await $store.dispatch(
	'multisig/uploadTransaction', 
        { 
          multisigTransaction: pst,
          multisigWallet: multisigWallet.value
        }
      )
    console.log('R', r)
  })
}

const openTransactionActionsDialog = () => {
  $q.dialog({
    component: TransactionActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      onDeleteTx: () => {
        $q.dialog({
          message: 'Are you sure you want to delete this transaction proposal?',
          ok: { label: 'Yes' },
          cancel: { label: 'No' },
          class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onOk(() => {
           deleteTransaction()
        }).onCancel(() => {
          openTransactionActionsDialog()
        })
      },
      onExportPst: () => {
        downloadPst()
      },
      onLoadCosignerPst: () => {
        loadCosignerPst()
      },
      onUploadTx: () => {
        uploadTransaction()
      },
      onBroadcastTx: () => { 
        broadcastTransaction()
      }
    }
  })
}

const loadHdPrivateKeys = async (hdPublicKeys) => {
  for (const signerEntityId of Object.keys(hdPublicKeys)) {
    try {
      const xprv = await getSignerXPrv({
       xpub: hdPublicKeys[signerEntityId]
      })
      if (xprv) {
       hdPrivateKeys.value[signerEntityId] = xprv
      }
    } catch (e) {} // getSignerXPrv throws if xprv not found, we'll just ignore
  }
} 

watch(() => multisigTransaction.value?.metadata?.status, async (status, prevStatus) => {
  if (status !== prevStatus) {
    await updateTransaction({
      index: route.params.index,
      multisigTransaction: JSON.parse(JSON.stringify(multisigTransaction.value))
    })
  }
})

onMounted(async () => {
  if (multisigWallet.value) {
    await loadHdPrivateKeys(multisigWallet.value.lockingData.hdKeys.hdPublicKeys)
    const transactions =
      $store.getters['multisig/getTransactionsByWalletAddress']({
        address: decodeURIComponent(route.params.address)
      })
    if (transactions[route.params.index]) {
      multisigTransaction.value = structuredClone(transactions[route.params.index])
      refreshTransactionStatus({
        multisigWallet: multisigWallet.value,
        multisigTransaction: multisigTransaction.value
      })
    }
  }
})

</script>

<style lang="scss" scoped>
  .light {
    color: #141414;
  }
  .mb-2 {
    margin-bottom: 2px;
  }
  .fixed-footer {
    position: fixed;
    padding-top: 5px;
    width: 100%;
    bottom: 0;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;
    margin: 0 auto;
    .footer-icon-btn {
      border-radius: 20px;
      border: none;
      width: 60px;
      height: 50px;
      outline: none;
      background-color: transparent;
      font-size: 12px;
      color: black;
      line-height: 20px;
      min-width: 50px;
    }
    .footer-btn-container {
      // margin-top: 1px !important;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
    }
    .default-text-color {
      color: rgb(60, 100, 246) !important;
    }
    .inactive-color {
      color: gray;
    }
  }

  .enabled {
    color: rgb(60, 100, 246) !important;
  }

  .disabled {
    color: $blue-grey-8;
  }

</style>
