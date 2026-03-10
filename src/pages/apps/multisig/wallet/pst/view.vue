<!-- eslint-disable no-mixed-spaces-and-tabs -->
<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow multisig-app"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('TxProposal')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}/psts`" class="header-nav">
    </HeaderNav>
    <div class="row justify-center">
      <div class="col-xs-12 q-px-xs">
        <template v-if="pst">
          <div class="row q-mb-xs justify-center">
              <div class="col-xs-12">
                <q-card id="bch-card" class="q-ma-md" style="border-radius: 15px; color:white">
                  <q-card-section class="row items-center justify-between">
                    <div class="col-12 flex justify-between items-center">
                      <div class="flex items-center q-gutter-x-sm">
                        <span class="text-bold text-h6">{{pst.purpose || pst?.metadata?.purpose || 'Purpose Not Specified'}}</span>
                      </div>
                    </div>
                    <div v-if="pst.id" class="col-12 text-caption">{{ $t('ID') }}: {{ pst.id || '<Local Only>' }}</div>
                    <div class="col-12 text-caption flex items-center">
                      <span>{{ $t('UnsignedHash') }}: {{ shortenString(pst.unsignedTransactionHash, 20) }}</span>
                      <q-btn flat dense size="sm" icon="content_copy" @click="copyToClipboard(pst.unsignedTransactionHash)" class="q-ml-xs" color="white">
                        <q-tooltip>{{ $t('Copy') }}</q-tooltip>
                      </q-btn>
                    </div>
                    <div class="col-12 text-caption">{{ $t('ProposedBy') }}: {{ proposedBy }}</div>
                    <div class="col-12 text-caption">{{ $t('Coordinator') }}: {{ coordinator }}</div>
                    <div class="col-12 text-caption">{{ $t('Status') }}: {{ pst.status?.status }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          <div class="col-xs-12 flex justify-between">
            <q-btn flat dense no-caps class="tile" @click="showShareProposalOptionsDialog">
              <template v-slot:default>
                <div class="row justify-center">
                  <q-icon name="mdi-share" class="col-12" color="primary" size="md"></q-icon>
                  <div class="col-12 tile-label">{{ $t('Share') }}</div>
                </div>
              </template>
            </q-btn>
            <q-btn flat dense no-caps class="tile" @click="showImportSignatureDialog" v-if="signingProgress?.signingProgress !== 'fully-signed'">
              <template v-slot:default>
                <div class="row justify-center">
                  <q-icon name="mdi-download" class="col-12" color="primary" size="md"></q-icon>
                  <div class="col-12 tile-label">{{ $t('ImportSigs', {}, 'Import') }}</div>
                </div>
              </template>
            </q-btn>
            <q-btn flat dense no-caps class="tile" @click="showProposalDetailsDialog">
              <template v-slot:default>
                <div class="row justify-center">
                  <q-icon name="info" class="col-12" color="primary" size="md"></q-icon>
                  <div class="col-12 tile-label">{{ $t('Details') }}</div>
                </div>
              </template>
            </q-btn>
            <q-btn flat dense no-caps class="tile" @click="onDeleteProposalAction">
              <template v-slot:default>
                <div class="row justify-center">
                  <q-icon name="delete_forever" class="col-12" color="red" size="md"></q-icon>
                  <div class="col-12 tile-label">{{ $t('Delete') }}</div>
                </div>
              </template>
            </q-btn>
          </div>
          <q-separator class="q-my-md"></q-separator>
          <q-list>
            <template v-if="pst.getTotalSatsDebit() > 0">
              <q-item >
                <q-item-section>
                  Debit
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg" :label="`- ${pst.getTotalSatsDebit() / 1e8}`" color="red">
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  Change [BCH]
                </q-item-section>
                <q-item-section side>
                  <q-btn icon-right="img:bitcoin-cash-circle.svg" :label="Big(pst.getTotalSatsChange()).div(1e8).toString()" flat dense>
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
            </template>
            <template v-for="category, i in pstOutputsTokenCategories">
              <q-item v-if="pst.getTotalTokenDebit(category) > 0">
                <q-item-section>
                 Token Debit [{{ shortenString(category, 12)}}]
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense icon-right="token" :label="`- ${pst.getTotalTokenDebit(category)}`" color="red">
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="pst.getTotalTokenDebit(category) > 0">
                <q-item-section>
                  Token Change [{{ shortenString(category, 12)}}] 
                </q-item-section>
                <q-item-section side>
                  <q-btn icon-right="token" :label="pst.getTotalTokenChange(category)" flat dense>
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-item v-if="pst.getTotalNftCredit(category) > 0">
                <q-item-section>
                  NFT Credit [{{ shortenString(category, 12)}}] 
                </q-item-section>
                <q-item-section side>
                  <q-btn color="green" icon-right="token" :label="`+ ${pst.getTotalNftCredit(category)} pc`" flat dense no-caps>
                    &nbsp;
                  </q-btn>
                </q-item-section>
              </q-item>
            </template>
            <q-item>
              <q-item-section>
                Fee
              </q-item-section>
              <q-item-section side>
                <q-btn icon-right="img:bitcoin-cash-circle.svg" :label="Big(pst.getSatsFee()).div(1e8).toString()" flat dense>
                  &nbsp;
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('RequiredSignatures') }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>{{ wallet?.m }} of {{ wallet?.signers?.length }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>Signing Progress</q-item-label>
              </q-item-section>
              <q-item-section side class="text-capitalize">
                {{ signingProgress.signingProgress }}
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>{{ $t('CanSignOnDevice', {}, 'Can Sign on this device?') }}</q-item-label>
                <q-item-label v-if="signersWithXprv.length > 0" caption lines="2">
                  {{ $t('CanSignAs', {}, 'You can sign on this device as') }} <span class="text-bold">{{ signersWithXprv.map(s => s.name).join(` ${$t('or')} `) }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <q-item-label v-if="signersWithXprv.length > 0">
                  {{ $t('Yes') }}
                </q-item-label>
                <q-item-label v-else class="text-bow-muted">
                  {{ $t('No') }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section top>
                <q-item-label>{{ $t('SignedBy', {}, 'Signed By') }}</q-item-label>
                <q-item-label v-if="signedSigners.length > 0" lines="2" >
                  <div class="flex items-center">
                    <span v-for="signer in signedSigners" :key="signer.xpub" size="md">
                      <q-chip clickable @click="() => showSharePartialSignatureOptionsDialog(signer.name, signer.masterFingerprint)">
                        <q-avatar>
                          <q-icon name="how_to_reg" size="sm"></q-icon>
                        </q-avatar>
                        {{ signer.name }}
                        <q-btn 
                          icon="mdi-share" 
                          color="primary"
                          class="q-ml-sm"
                          flat
                          round
                          dense
                        ></q-btn>
                      </q-chip>
                    </span>
                  </div>
                </q-item-label>
                <q-item-label v-else caption>
                  {{ $t('NoSignersYet', {}, 'No signers yet') }}
                </q-item-label>
              </q-item-section>
              <q-item-section side top>
                <q-item-label v-if="signedSigners.length > 0">
                  {{ signedSigners.length }}/{{ wallet?.signers?.length || 0 }}
                </q-item-label>
                <q-item-label v-else class="text-bow-muted">
                  0/{{ wallet?.signers?.length || 0 }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div class="sticky-bottom-spacer"></div>
        </template>
      </div>
      
      <div v-if="pst && (signingProgress?.signingProgress === 'fully-signed' || canSign)" class="sticky-bottom-actions" :class="getDarkModeClass(darkMode)">
        <q-btn
          v-if="signingProgress?.signingProgress === 'fully-signed' && !pst?.txid && !showActionConfirmationSlider"
          :loading="isBroadcasting"
          @click="broadcastTransaction"
          color="primary"
          rounded
          no-caps
          unelevated
          class="full-width q-py-md"
        >
          <q-icon name="cell_tower" class="q-mr-sm"></q-icon>
          {{ $t('Broadcast') }}
        </q-btn>
        <q-btn
          v-else-if="canSign && !showActionConfirmationSlider"
          color="primary"
          unelevated
          rounded
          class="full-width q-py-md"
          @click="initiateSignTransaction(signerWhoCanSign)"
        >
          <q-icon name="draw" class="q-mr-sm"></q-icon>
          {{ $t('SignTx') }}
        </q-btn>
      </div>
         <div
          v-if="showActionConfirmationSlider"
          class="action-confirmation-backdrop"
          @click="cancelActionConfirmationSlider"
        >
          <div class="action-confirmation-slider-content" @click.stop>
            <DragSlide
              @swiped="onConfirmSliderSwiped"
              text="Swipe to confirm"
              :disable-absolute-bottom="true"
            />
          </div>
        </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { copyToClipboard, useInterval, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { binToHex } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet, Pst, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'components/SecurityCheckDialog.vue'
import Big from 'big.js'
import BroadcastSuccessDialog from 'src/components/multisig/BroadcastSuccessDialog.vue'
import ShareProposalOptionsDialog from 'components/multisig/ShareProposalOptionsDialog.vue'
import ShareSignatureOptionsDialog from 'components/multisig/ShareSignatureOptionsDialog.vue'
import PstQrDialog from 'components/multisig/PstQrDialog.vue'
import ProposalDetailsDialog from 'components/multisig/ProposalDetailsDialog.vue'
import { STATUS } from 'src/lib/multisig/pst'
const {
  multisigNetworkProvider,
  multisigCoordinationServer,
  resolveXprvOfXpub,
  resolveMnemonicOfXpub
} = useMultisigHelpers()
const $q = useQuasar()
const $store = useStore()
const { registerInterval } = useInterval()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const showActionConfirmationSlider = ref(false)
const signingInitiatedBy = ref()
const isBroadcasting = ref(false)
const pst = ref()
const isFetchingStatus = ref(false)

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const signingProgress = computed(() => {
  if (!pst.value) return {}
  return pst.value.getSigningProgress()
})

const wallet = ref()

const pstOutputsTokenCategories = computed(() => {
    return new Set(
      pst.value?.outputs.map(o => 
        o.token?.category ? binToHex(o.token.category) : '').filter(c=> Boolean(c)
      ) || []
    )
})

const proposedBy = computed(() => {
  if (!pst.value || !wallet.value || !wallet.value.signers) return
  const creator = pst.value.getSignerWhoCreatedProposal()
  return creator?.name || $t('Unknown')
})

const coordinator = computed(() => {
    return pst.value?.coordinatorInfo?.name
})

const canSign = computed(() => {
  if (!wallet.value?.signers || !pst.value) return false
  return wallet.value.signers.some(s => s.xprv && !pst.value.signerSigned(s.xpub))
})

const signersWithXprv = computed(() => {
  if (!wallet.value?.signers) return []
  return wallet.value.signers.filter(s => s.xprv)
})

const signedSigners = computed(() => {
  if (!wallet.value?.signers || !pst.value) return []
  return wallet.value.signers.filter(s => pst.value.signerSigned(s.xpub))
})

const signersWhoCanSign = computed(() => {
  if (!wallet.value?.signers || !pst.value) return []
  return wallet.value.signers.filter(s => s.xprv && !pst.value.signerSigned(s.xpub))
})

const signerWhoCanSign = computed(() => {
  return signersWhoCanSign.value[0] || null
})

const handleFileDownloadDialog = ({dialogTitle, dialogMessage, defaultFilename, fileExtension, data}) => {
  $q.dialog({
    title: dialogTitle,
    message: dialogMessage,
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
    prompt: {
      type: 'text',
      model: defaultFilename,
      filled: true,
      color: 'primary'
    },
    ok: { 
      label: $t('DownloadFile'),
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
    
  }).onOk(async (filename) => {

    if (!filename) return
    const blob = new Blob(
      [data], 
      { type: 'text/plain' }
    )

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.${fileExtension}`
    document.body.appendChild(a)
    a.click()

  }).onCancel(() => {})
}

const handleProposalUploadAction = async () => {
  try {
    await pst.value.upload()
  } catch (error) {
    console.error('Error uploading proposal:', error)
  }
}

const showShareProposalOptionsDialog = () => {
  $q.dialog({
    component: ShareProposalOptionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      pst: pst.value
    }
  }).onOk(async (payload) => {
    if (payload?.action === 'display-qr') {
      showProposalQrDialog()
    } else if (payload?.action === 'download-proposal') {
      const defaultFilename = (pst.value?.purpose || '').toLowerCase().replace(/\s+/g, '-')
      const base64Psbt = await pst.value.export()
      handleFileDownloadDialog({
          dialogTitle: $t('DownloadTransactionProposalFile'), 
          dialogMessage: $t('DownloadTransactionProposalFileHint'), 
          defaultFilename,
          fileExtension: 'psbt',
          data: base64Psbt
        }
      )
    } else if (payload?.action === 'upload-proposal') {
      handleProposalUploadAction()
    }
  })
}

const showProposalQrDialog = () => {
  $q.dialog({
    component: PstQrDialog,
    componentProps: {
      darkMode: darkMode.value,
      pst: pst.value,
    }
  }).onOk(() => {
    // openWalletActionsDialog()
  })
}

const showProposalDetailsDialog = () => {
  $q.dialog({
    component: ProposalDetailsDialog,
    componentProps: {
      darkMode: darkMode.value,
      pst: pst.value,
      networkProvider: multisigNetworkProvider
    }
  })
}

const onDeleteProposalAction = async () => {
  $q.dialog({
    message: $t('MultisigDeleteProposalConfirmationMessage', {}, 'Are you sure you want to delete this transaction proposal?'),
    ok: { 
      label: $t('Yes'),
      color: 'primary',
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)}`,
    },
    cancel: { 
      label: $t('No'),
      color: 'default',
      outline: true,
      rounded: true,
      class: `button-default ${getDarkModeClass(darkMode.value)} `,
    },
    html: true,
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
  }).onOk(() => {
    pst.value.delete({ sync: false })
    router.push({ name: 'app-multisig' })
  })
}

const showSharePartialSignatureOptionsDialog = (signerName, signerMasterFingerprint) => {
  $q.dialog({
    component: ShareSignatureOptionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      pst: pst.value,
      signerName
    }
  }).onOk(async (payload) => {
    if (payload?.action === 'display-qr') {
      showProposalQrDialog()
    } else if (payload?.action === 'download-signature') {
      const defaultFilename = (pst.value?.purpose || '').toLowerCase().replace(/\s+/g, '-') + `-${(signerName || 'signer')?.toLowerCase()}-partial-sig`
      const base64Psbt = await pst.value.export()
      handleFileDownloadDialog({
          dialogTitle: $t('DownloadPartialSignature'), 
          dialogMessage: $t('DownloadPartialSignatureHint'), 
          defaultFilename,
          fileExtension: 'psbt',
          data: base64Psbt
        }
      )
    } else if (payload?.action === 'upload-signature') {
      pst.value.uploadSignerPsbt(signerMasterFingerprint)
    }
  }).onCancel(() => {
    // Dialog was closed without action
  })
}

const initiateSignTransaction = async (signer) => {
  showActionConfirmationSlider.value = true
  signingInitiatedBy.value = {
    ...signer,
    xprv: signer.xprv
  }
}

const cancelActionConfirmationSlider = () => {
  showActionConfirmationSlider.value = false
  signingInitiatedBy.value = null
}

const commitSignTransaction = async () => {
  if (!signingInitiatedBy.value) return
  await pst.value.sign(signingInitiatedBy.value.xprv)
  signingInitiatedBy.value = null
}

const showBroadcastSuccessDialog = async (txid) => {
  const message = pst.value.purpose ? `${pst.value.purpose} success` : 'Successfully Sent'
  $q.dialog({
    component: BroadcastSuccessDialog,
    componentProps: {
      amountSent: pst.value.getTotalSatsDebit() / 1e8,
      txid: txid,
      successMessage: message,
      darkMode: darkMode.value
    }
  }).onOk(() => {
    pst.value.delete({ sync: false })
    router.push({ name: 'app-multisig-wallet-view', params: { wallethash: route.params.wallethash } })
  })
}

const broadcastTransaction = async () => {
  try {
    isBroadcasting.value = true
    const { finalCompilationResult, vmVerificationSuccess } = pst.value.finalize()
    if (!finalCompilationResult.success || !vmVerificationSuccess) {
      const message = finalCompilationResult.error || finalCompilationResult.vmVerificationError
      return $q.dialog({
        title: 'Error Finalizing Transaction!',
        message,
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
      })
    }
    const result = await pst.value.broadcast()
    if (result.data?.success ||
        result.data?.error?.includes('txn-already-known') ||
        result.data?.error?.includes('txn-already-in-mempool')) {
      return await showBroadcastSuccessDialog(result.data.txid)
    }
    throw new Error(result?.data?.error) 
  } catch (error) {
    $q.dialog({
      title: 'Error',
      message: error.message || 'An error occurred while broadcasting the transaction.',
      class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
      ok: { 
        label: $t('Ok'),
        color: 'primary',
        rounded: true,
        class: `button-default ${getDarkModeClass(darkMode.value)}`,
      },
    })
  } finally {
    isBroadcasting.value = false
  }
}

const onConfirmSliderSwiped = async (reset) => {
  showActionConfirmationSlider.value = false
  await new Promise((resolve, reject) => {
    $q.dialog({ component: SecurityCheckDialog })
    .onOk(() => {
      showActionConfirmationSlider.value = false
      commitSignTransaction()
      resolve(true)
    })
    .onDismiss(() => {
      signingInitiatedBy.value = null
      reset?.()
      resolve(false)
    })
  })
}

const importSignerSignature = (masterFingerprint, name) => {
  router.push({ 
    name: 'app-multisig-wallet-pst-signatures-import',
    params: {
      wallethash: route.params.wallethash,
      unsignedtransactionhash: route.params.unsignedtransactionhash,
      masterfingerprint: masterFingerprint
    },
    query: {
      signerName: name
    }
  })
}

const showImportSignatureDialog = () => {
  const unsignedSigners = wallet.value?.signers?.filter(s => !pst.value?.signerSigned(s.xpub)) || []
  if (unsignedSigners.length === 0) return
  
  if (unsignedSigners.length === 1) {
    importSignerSignature(unsignedSigners[0].masterFingerprint, unsignedSigners[0].name)
    return
  }
  
  $q.bottomSheet({
    message: $t('SelectSigner'),
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)}`,
    actions: unsignedSigners.map((s, i) => ({
      label: s.name || `Signer ${i + 1}`,
      id: s.masterFingerprint,
      icon: 'person',
      name: s.name
    }))
  }).onOk(action => {
    importSignerSignature(action.id, action.name)
  })
}

const loadWallet = async () => {
  const walletObject = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (walletObject) {
    wallet.value = MultisigWallet.fromObject(
      walletObject,
      { 
        network: multisigNetworkProvider,
        coordinationServer: multisigCoordinationServer,
        resolveXprvOfXpub,
        resolveMnemonicOfXpub
      }
    )
    await wallet.value.resolveXprvsOfXpubs()
  }
}
 
const loadProposal = async () => {
  if (!wallet.value) return
  pst.value = 
    (new Pst())
      .setStore($store)
      .setWallet(wallet.value)
      .setCoordinationServer(multisigCoordinationServer)
      .loadFromStore(route.params.unsignedtransactionhash)

  if (pst.value) {
    try {
      await pst.value.sync()
      if (pst.value.id) {
        const initializationTasks = [
          { label: 'fetching proposals\'s coordinator info', f: async () => await pst.value.fetchCoordinatorInfo() },
          { label: 'fetching inputs reference transaction', f: async () => await pst.value.resolveInputsTransactionData() },
          { label: 'fetching proposal\'s status', f: async () => await pst.value.fetchStatus() }
        ]
        const results = await Promise.allSettled([
          initializationTasks[0].f(), 
          initializationTasks[1].f(),
          initializationTasks[2].f()
        ])
        
        results.forEach((r, i) => {
          r.label = initializationTasks[i].label
        })

        for (const r of results) {
          if (r.status !== 'rejected') continue
            $q.notify({
              title: $t('Warning'),
              color: 'warning',
              textColor: 'black',
              message: `Failed ${r.label}, ${r.reason}`,
            })
        }
      }

    } catch (error) {
      if (error?.response?.status === 404) {
        return
      }

      $q.notify({
        title: $t('Warning'),
        color: 'warning',
        textColor: 'black',
        message: error?.message,
      })
    }
  }
}

watch(() => pst.value?.status, async (newVal) => {
  if (newVal && newVal?.txid && (newVal.status === STATUS.BROADCASTED || newVal.status === STATUS.MEMPOOL || newVal.status === STATUS.CONFIRMED)) {
    return showBroadcastSuccessDialog(newVal.txid)
  }
}, { deep: true })

const refreshPage = async (done) => {
  await loadProposal()
  done()
}

onMounted(async () => {
  loadWallet()
  await loadProposal()
  registerInterval(async () => {
    pst.value.fetchAndMergeSignatures() 
    if (!isFetchingStatus.value && (!pst.value.status || pst.value?.status?.status === STATUS.PENDING)) {
      isFetchingStatus.value = true
      try {
        await pst.value.fetchStatus()
      } finally {
        isFetchingStatus.value = false
      }
    }
  }, 3000) 
})

</script>

<style lang="scss" scoped>
.custom-bottom-sheet .q-bottom-sheet__item .q-icon {
  font-size: xx-large;
}

.action-confirmation-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.action-confirmation-slider-content {
  width: 100%;
}

.sticky-bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0));
  z-index: 10;
  background: transparent;
}

.sticky-bottom-actions .text-red {
  color: var(--q-negative);
}

.sticky-bottom-spacer {
  height: 100px;
}
</style>