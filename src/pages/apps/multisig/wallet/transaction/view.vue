<!-- eslint-disable no-mixed-spaces-and-tabs -->
<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Transaction')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.address}`}`" class="header-nav">
    </HeaderNav>
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs">
        <template v-if="multisigWallet && multisigTransaction?.transaction">
          <div>
            <q-list>
              <q-item>
                <q-item-section>
                    <q-item-label class="text-weight-bold">
                      <div class="flex items-center">
                       <span>{{ multisigTransaction.purpose }}</span>
                       <q-icon
                         :name="isMultisigTransactionSynced(multisigTransaction) ? 'mdi-cloud-check' : 'smartphone'"
                         :color="isMultisigTransactionSynced(multisigTransaction)? 'green': 'grey-6'"
                         class="q-ml-sm"
                       />
                      </div>
                    </q-item-label>
                    <q-item-label caption lines="2" class="text-subtitle-2">Origin: {{ multisigTransaction.origin }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                 <q-btn icon="more_vert" @click="openTransactionActionsDialog" flat dense style="margin-right: -5px"/>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label>
                    <div class="flex flex-wrap items-center">
                    <span class="q-mr-xs">Proposal Id</span>
                    </div>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <span class="q-mr-xs">{{ shortenString(`${multisigTransaction.id}`, 20) }}</span>
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
                  <q-item-label>Total Output</q-item-label>
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
                      getTotalBchDebitAmount(
                        multisigTransaction.transaction,
                        [route.params.address]
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
                        toValue(multisigTransaction.transaction), decodeURIComponent(route.params.address))
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
                  <q-item-label>Signing Progress</q-item-label>
                  <q-item-label caption>
                   Signatures: {{ signatureCount }}, Required: {{ getRequiredSignatures(multisigWallet.template)}}
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                <q-btn
                    @click="checkSigningProgress"
                    :loading="checkingSigningProgress"
                    flat
                    dense>
                    <template v-slot:loading>
                      <div class="flex flex-nowrap items-center">
                          <span v-if="checkingSigningProgress">Checking</span>
                          <q-spinner-facebook v-if="checkingSigningProgress" class="on-right"></q-spinner-facebook>
                      </div>
                  </template>
                    <template v-slot:default>
                      <div class="flex flex-nowrap items-center">
                        <span>{{ signingProgress || '?' }}</span>
                        <q-icon
                          :name="signingProgress === 'fully-signed'? 'done_all': 'refresh'"
                          :color="signingProgress === 'fully-signed'? 'green': 'primary'"
                          size="sm" class="q-ml-xs"
                          >
                        </q-icon>
                      </div>
                  </template>
                  </q-btn>
                </q-item-section>
              </q-item>
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
                    :color="hdPrivateKeys[signerEntityKey]? 'primary': ''"
                    @click="signTransaction({ signerEntityKey })"
                    dense
                    no-caps
                    flat
                    :class="hdPrivateKeys[signerEntityKey] ? 'default-text-color': 'inactive-color'"
                    >
                  </q-btn>
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

              <q-separator spaced inset />
              <q-item>
                <q-item-section>
                  <q-item-label>Broadcast Status</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    @click="updateBroadcastStatus"
                    :loading="updatingBroadcastStatus"
                    flat
                    dense>
                    <template v-slot:loading>
                      <div class="flex flex-nowrap items-center">
                          <span v-if="isBroadcasting">Broadcasting Tx</span>
                          <span v-else-if="updatingBroadcastStatus">Checking</span>
                          <q-spinner-radio v-if="isBroadcasting" class="on-right"></q-spinner-radio>
                          <q-spinner-facebook v-else-if="updatingBroadcastStatus" class="on-right"></q-spinner-facebook>
                      </div>
                  </template>
                    <template v-slot:default>
                      <div class="flex flex-nowrap items-center">
                        <span>{{ multisigTransaction.broadcastStatus || '?' }}</span>
                        <q-icon
                          :name="multisigTransaction.broadcastStatus === 'done'? 'done_all': 'refresh'"
                          :color="multisigTransaction.broadcastStatus === 'done'? 'green': 'primary'"
                          size="sm" class="q-ml-xs"
                          >
                        </q-icon>
                      </div>
                  </template>
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="Boolean(multisigTransaction?.txid)">
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
              <q-separator spaced inset />
            </q-list>
          </div>
        <div class="flex items-center justify-between q-mt-lg">
         <q-btn flat dense no-caps @click="openShareTransactionActionsDialog" class="tile" :disable="isMultisigTransactionSynced(multisigTransaction)" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-share-all" class="col-12" color="primary">
                <q-badge v-if="isMultisigTransactionSynced(multisigTransaction)" color="green" style="margin-right: 25px;" size="xs" floating>
                  <span style="color: white">&#10003;</span>
                </q-badge>
              </q-icon>
              <div class="col-12 tile-label">Share Online</div>
            </div>
          </template>
         </q-btn>
         <q-btn v-if="signingProgress != 'fully-signed'" flat dense no-caps @click="loadCosignerPst" class="tile" v-close-popup>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="mdi-file-upload" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Load Cosigner PST</div>
            </div>
          </template>
        </q-btn>

         <q-btn v-else
          :loading="isBroadcasting"
          @click="broadcastTransaction"
          :disable="multisigTransaction.broadcastStatus === 'done'"
          class="tile" flat dense no-caps>
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="cell_tower" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">Broadcast Tx</div>
            </div>
          </template>
          <template v-slot:loading>
            <div class="row justify-center">
              <q-spinner-radio color="primary"/>
              <div class="col-12 tile-label">Broadcasting Tx...</div>
            </div>
          </template>
         </q-btn>
         <q-btn flat dense no-caps @click="openTransactionActionsDialog" class="tile" :disable="isBroadcasting">
          <template v-slot:default>
            <div class="row justify-center">
              <q-icon name="more_vert" class="col-12" color="primary"></q-icon>
              <div class="col-12 tile-label">More Options</div>
            </div>
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
import { computed, ref, onMounted, watch, toValue, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stringify, hashTransaction } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getTotalBchInputAmount,
  getTotalBchDebitAmount,
  getTotalBchChangeAmount,
  getTotalBchFee,
  shortenString,
  signTransaction as signMultisigTransaction,
  exportPst,
  getSignatureCount,
  signerHasSignature,
  importPst,
  combinePsts,
  getMultisigCashAddress,
  getRequiredSignatures,
  getSigningProgress
} from 'src/lib/multisig'
import { isMultisigTransactionSynced } from 'src/lib/multisig/transaction'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import UploadPstDialog from 'components/multisig/UploadPstDialog.vue'
import TransactionActionsDialog from 'components/multisig/TransactionActionsDialog.vue'
import ShareTransactionActionsDialog from 'components/multisig/ShareTransactionActionsDialog.vue'
import BroadcastSuccessDialog from 'components/multisig/BroadcastSuccessDialog.vue'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const {
  getSignerXPrv,
  multisigWallets,
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

const isBroadcasting = ref(false)
const updatingBroadcastStatus = ref(false)
const checkingSigningProgress = ref(false)
const signingProgress = ref()
const pstFileElementRef = ref()
const pstFileModel = ref()

const signatureCount = computed(() => {
  if (multisigWallet.value && multisigTransaction.value) {
    return getSignatureCount({
      multisigWallet: multisigWallet.value,
      multisigTransaction: multisigTransaction.value
    })
  }
  return 0
})

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

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const signTransaction = async ({ signerEntityKey }) => {
  if (!multisigWallet.value) return
  if (hdPrivateKeys.value[signerEntityKey]) {
    await loadHdPrivateKeys(multisigWallet.value.lockingData.hdKeys.hdPublicKeys)
  }
  if (!hdPrivateKeys.value[signerEntityKey]) return

  const signerSignatures = signMultisigTransaction({
    multisigWallet: multisigWallet.value,
    multisigTransaction: multisigTransaction.value,
    signerEntityKey,
    hdPrivateKey: hdPrivateKeys.value[signerEntityKey]
  })
  await $store.dispatch('multisig/addTransactionSignatures', {
    index: route.params.index,
    multisigTransaction: multisigTransaction.value,
    signerSignatures
  })
}

const showBroadcastSuccessDialog = async (txid) => {
  const message = multisigTransaction.value.purpose ? `${multisigTransaction.value.purpose} success` : 'Successfully Sent'
  $q.dialog({
    component: BroadcastSuccessDialog,
    componentProps: {
      amountSent: getTotalBchDebitAmount(multisigTransaction.value.transaction, [route.params.address]),
      txid: txid,
      successMessage: message,
      darkMode: darkMode.value
    }
  }).onOk(() => {
    router.push({ name: 'app-multisig-wallet-view', params: { address: route.params.address } })
  })
}
const broadcastTransaction = async () => {
  isBroadcasting.value = true
  try {
    const finalCompilationResult = await $store.dispatch(
      'multisig/finalizeTransaction',
      { multisigTransaction: multisigTransaction.value, multisigWallet: multisigWallet.value }
    )

    if (finalCompilationResult.success && finalCompilationResult.vmVerificationSuccess) {
      const response = await $store.dispatch('multisig/broadcastTransaction', multisigTransaction.value)
      console.log('response', response)
      if (response.data?.txid) {
        await showBroadcastSuccessDialog(response.data.txid)
      }
    } else {
      const message = finalCompilationResult.error || finalCompilationResult.vmVerificationError
      $q.dialog({
        title: 'Error',
        message,
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      })
    }
  } catch (error) {
    console.log(error)
    $q.dialog({
      title: 'Error',
      message: error.message || 'An error occurred while broadcasting the transaction.',
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
    })
  } finally {
    isBroadcasting.value = false
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
      }
      $store.dispatch('multisig/saveTransaction', combinedPst || importedPst)
      $store.dispatch('multisig/syncTransactionSignatures', { multisigTransaction: combinedPst || importedPst })
      multisigTransaction.value = combinedPst || importedPst
      updateBroadcastStatus()
      signingProgress.value = getSigningProgress({
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
    await $store.dispatch(
      'multisig/uploadTransaction',
      {
        multisigTransaction: multisigTransaction.value,
        multisigWallet: multisigWallet.value
      }
    )
  })
}

const openShareTransactionActionsDialog = () => {
  $q.dialog({
    component: ShareTransactionActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      onUploadTransaction: () => {
        uploadTransaction()
      },
      onExportTransaction: () => {
        downloadPst()
      }
    }
  })
}
const openTransactionActionsDialog = () => {
  $q.dialog({
    component: TransactionActionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      broadcastDone: multisigTransaction.value?.broadcastStatus === 'done',
      signingProgress: getSigningProgress({
        multisigTransaction: multisigTransaction.value,
        multisigWallet: multisigWallet.value
      }),
      shared: isMultisigTransactionSynced(multisigTransaction.value),
      onDeleteTx: () => {
        $q.dialog({
          message: 'Are you sure you want to delete this transaction proposal?',
          ok: { label: 'Yes' },
          cancel: { label: 'No' },
          class: `pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onOk(() => {
          $store.dispatch('multisig/deleteTransactionById', { id: multisigTransaction.value.id })
          router.back()
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

const updateBroadcastStatus = async () => {
  try {
    updatingBroadcastStatus.value = true
    checkSigningProgress()
    await $store.dispatch('multisig/updateBroadcastStatus', {
      multisigTransaction: multisigTransaction.value
    })
    multisigTransaction.value = structuredClone($store.getters['multisig/getTransactionByHash']({ hash: route.params.hash }))
  } catch (e) {
    console.log(e)
  } finally {
    updatingBroadcastStatus.value = false
  }
}

const checkSigningProgress = async () => {
  try {
    checkingSigningProgress.value = true
    await $store.dispatch('multisig/syncTransactionSignatures', { multisigTransaction: multisigTransaction.value })
    signingProgress.value = getSigningProgress({
      multisigWallet: multisigWallet.value,
      multisigTransaction: multisigTransaction.value
    })
    multisigTransaction.value = structuredClone($store.getters['multisig/getTransactionByHash']({ hash: route.params.hash }))
  } catch (e) {
    console.log(e)
  } finally {
    checkingSigningProgress.value = false
  }
}

watch(() => signatureCount.value, () => {
  if (!multisigWallet.value || !multisigTransaction.value) return
  signingProgress.value = getSigningProgress({
    multisigWallet: multisigWallet.value,
    multisigTransaction: multisigTransaction.value
  })
})

onBeforeUnmount(() => {
  updateBroadcastStatus({ multisigTransaction: multisigTransaction.value })
})

onMounted(async () => {
  if (multisigWallet.value) {
    await loadHdPrivateKeys(multisigWallet.value.lockingData.hdKeys.hdPublicKeys)
    multisigTransaction.value = structuredClone(
      $store.getters['multisig/getTransactionByHash']({ hash: route.params.hash })
    )
    if (multisigTransaction.value) {
      checkSigningProgress()
      updateBroadcastStatus({ multisigTransaction: multisigTransaction.value })
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
