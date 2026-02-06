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
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="pst">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label class="text-h5 text-bold">
                  {{ pst.purpose }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>
                  Unsigned Hash
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>
                  {{ shortenString(pst.unsignedTransactionHash, 20) }}
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="wallet">
              <q-item-section>
                <q-item-label>
                  <div class="flex items-center">
                    <q-icon name="wallet" size="sm"></q-icon><span class="q-ml-xs"></span>
                  </div>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label class="flex flex-wrap items-center">
                {{ wallet?.name }}
                </q-item-label>
              </q-item-section>
            </q-item>
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
              <q-item>
                <q-item-section>
                  Token Change [{{ shortenString(category, 12)}}] 
                </q-item-section>
                <q-item-section side>
                  <q-btn icon-right="token" :label="pst.getTotalTokenChange(category)" flat dense>
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
            <q-expansion-item v-model="balancesExpanded">
              <template v-slot:header>
                <q-item-section>
                  Raw Tx
                </q-item-section>
              </template>
              <q-item-label class="q-pa-md">
                <code style="word-break: break-all; filter: brightness(80%)">
                  {{pst.unsignedTransactionHex}}
                </code>
                <q-btn icon="content_copy" @click="copyToClipboard(pst.unsignedTransactionHex)" flat dense/>
              </q-item-label>
            </q-expansion-item>
            <q-separator></q-separator>
            <q-item>
              <q-item-section>
                <q-item-label>Signing Progress</q-item-label>
              </q-item-section>
              <q-item-section side class="text-capitalize">
                {{ signingProgress.signingProgress }}
                
              </q-item-section>
            </q-item>
            <q-item-label header>Signers</q-item-label>
            <q-item v-for="signer, i in wallet?.signers" :key="`signer-${i}`" top>
              <q-item-section>
                <!-- <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                  <div class="flex items-center q-gutter-x-sm">
                    <q-icon name="person" size="sm"></q-icon><span>{{ signer.name || `Signer ${i}` }}</span>
                  </div>
                </div> -->
                <q-chip style="height:fit-content" flat class="q-px-md">
                  <q-avatar>
                    <q-icon v-if="signersXPrv[signer.xpub]" name="mdi-account-key" size="sm" style="color:#D4AF37"></q-icon>
                    <q-icon v-else name="person" size="sm"></q-icon>
                  </q-avatar>
                  <div class="flex flex-column">
                    <div class="ellipsis" style="max-width:3.5em">
                      {{ signer.name }}
                    </div>
                  </div>
                </q-chip>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  v-if="signersXPrv[signer.xpub]"
                  :disable="pst?.signerSigned(signer.xpub) || signingProgress?.signingProgress === 'fully-signed'"
                  :icon="signButtonIcon(signer)"
                  text-color="primary"
                  no-caps
                  rounded
                  @click="initiateSignTransaction(signer)"
                  >
                  <span>&nbsp;&nbsp;{{$t('Sign')}}&nbsp;&nbsp;</span>
                </q-btn>
                <q-btn
                  v-else
                  :disable="pst?.signerSigned(signer.xpub) || signingProgress?.signingProgress === 'fully-signed'"
                  :icon="signButtonIcon(signer)"
                  no-caps
                  rounded
                  @click="importSignerSignature"
                  >
                  <span>{{ $t('Import') }}</span>
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item class="q-mt-lg">
              <q-item-section>
                <div class="row justify-between q-gutter-x-md">
                  <q-btn class="tile col-xs-3" flat dense no-caps @click="showShareProposalOptionsDialog" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="mdi-share" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">{{ $t('Share') }}</div>
                      </div>
                    </template>
                  </q-btn>
                  <!-- <q-btn :disabled="signingProgress.signingProgress === 'fully-signed'" class="tile col-xs-3" flat dense no-caps @click="importSignerSignature" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="mdi-file-upload" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">Merge</div>
                      </div>
                    </template>
                  </q-btn> -->
                  <q-btn 
                    :loading="isBroadcasting"
                    @click="broadcastTransaction"
                    :disable="signingProgress.signingProgress !== 'fully-signed' || pst.txid"
                    class="tile col-xs-3" flat dense no-caps>
                    <template v-slot:default>
                      <div class="row justify-center items-stretch">
                        <q-icon name="cell_tower" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">{{ $t('Broadcast') }}</div>
                      </div>
                    </template>
                    <template v-slot:loading>
                      <div class="row justify-center items-stretch">
                        <q-spinner-radio color="primary" size="lg"/>
                        <div class="col-12 tile-label">{{ $t('Broadcasting') }}...</div>
                      </div>
                    </template>
                  </q-btn>
                  <q-btn class="tile col-xs-3" flat dense no-caps @click="onDeleteProposalAction" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="delete_forever" class="col-12" color="red" size="lg"></q-icon>
                        <div class="col-12 tile-label">{{ $t('Delete') }}</div>
                      </div>
                    </template>
                  </q-btn>
                  
                  <!-- <q-btn class="tile col-xs-3" flat dense no-caps @click="openBottomsMenu" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="more_horiz" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">{{ $t('More') }}</div>
                      </div>
                    </template>
                  </q-btn> -->
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </template>
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
import { copyToClipboard, QSpinnerDots, useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { binToHex, decodeTransactionCommon, hexToBin } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet, Pst, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'components/SecurityCheckDialog.vue'
import Big from 'big.js'
import BroadcastSuccessDialog from 'src/components/multisig/BroadcastSuccessDialog.vue'
import { withTimeout } from 'src/utils/async-utils'
import ShareProposalOptionsDialog from 'components/multisig/ShareProposalOptionsDialog.vue'
import PstQrDialog from 'components/multisig/PstQrDialog.vue'
const {
  getSignerXPrv,
  multisigNetworkProvider,
  multisigCoordinationServer,
  resolveXprvOfXpub,
  resolveMnemonicOfXpub
} = useMultisigHelpers()


const $q = useQuasar()
const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const signersXPrv = ref({})
const showActionConfirmationSlider = ref(false)
const signingInitiatedBy = ref()
const signingProgress = ref({})

const isBroadcasting = ref(false)
const pst = ref()

const signingProgressBar = computed(() => {
  return signingProgress.value.signatureCount / wallet.value.m
})

const signingProgressBarLabel = computed(() => {
  return signingProgress.value?.signingProgress || ''
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const wallet = computed(() => {
  const walletObject = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (walletObject) {
    return MultisigWallet.fromObject(
      walletObject,
      { 
        network: multisigNetworkProvider,
        coordinationServer: multisigCoordinationServer,
        resolveXprvOfXpub,
        resolveMnemonicOfXpub
      }
    )
  }
  return walletObject
})  

const pstOutputsTokenCategories = computed(() => {
    return new Set(pst.value?.outputs.map(o => o.token?.category ? binToHex(o.token.category) : '').filter(c=> Boolean(c)) || [])
})

const signButtonIcon = computed(() => {
  return (signer) => {
    if (pst.value.signerSigned(signer.xpub)) return 'done_all'
    // if (!signersXPrv.value[signer.xpub]) return 'edit_off'
    return 'draw'
  }
})

const syncPst = async () => {

  try {

    $q.notify({
      type: 'info',
      message: 'Feature not yet supported...',
      position: 'bottom',
      timeout: 3000,
      color: 'primary'
    })
    return
    $q.loading.show({
      spinner: QSpinnerDots,
      spinnerColor: 'primary',
      messageColor: 'primary',
      message: 'Syncing Pst...'
    })

    await withTimeout(pst.value.upload(), 10000, 'Request timed-out!')
    
  } catch (error) {

    $q.notify({
        type: 'Warning',
        message: error,
        position: 'bottom',
        timeout: 3000,
        color: 'dark'
    })

  } finally {
    $q.loading.hide()
  }
}

const handleProposalDownloadAction = () => {
  const defaultFilename = (pst.value?.purpose || '').toLowerCase().replace(/\s+/g, '-')
  $q.dialog({
    title: $t('DownloadTransactionProposalFile'),
    message: $t('DownloadTransactionProposalFileHint'),
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

    const base64Psbt = await pst.value.export()
    const blob = new Blob(
      [base64Psbt], 
      { type: 'text/plain' }
    )

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.psbt`
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
  }).onOk((payload) => {
    if (payload?.action === 'display-qr') {
      showProposalQrDialog()
    } else if (payload?.action === 'download-proposal') {
      handleProposalDownloadAction()
    } else if (payload?.action === 'upload-proposal') {
      handleProposalUploadAction()
    }
  }).onCancel(() => {
    // Dialog was closed without action
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

const onDeleteProposalAction = async () => {
  $q.dialog({
    message: $t('MultisigDeleteProposalConfirmationMessage', {}, 'Are you sure you want to delete this transaction proposal? This action cannot be undone.'),
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
    class: `pt-card text-bow br-15 ${getDarkModeClass(darkMode.value)} text-body1 q-pt-lg q-pa-sm`,
  }).onOk(() => {
    pst.value.delete({ sync: false })
    router.push({ name: 'app-multisig' })
  })
}

const initiateSignTransaction = async (signer) => {
  showActionConfirmationSlider.value = true
  signingInitiatedBy.value = {
    ...signer,
    xprv: signersXPrv.value[signer.xpub]
  }
}

const cancelActionConfirmationSlider = () => {
  showActionConfirmationSlider.value = false
  signingInitiatedBy.value = null
}

const commitSignTransaction = async () => {
  if (!signingInitiatedBy.value) return

  pst.value.sign(signingInitiatedBy.value.xprv)
  
  signingProgress.value = pst.value.getSigningProgress()
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
      await showBroadcastSuccessDialog(result.data.txid)
    }
  } catch (error) {
    console.log('Error', error)
    $q.dialog({
      title: 'Error',
      message: error.message || 'An error occurred while broadcasting the transaction.',
      class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
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

const importSignerSignature = () => {
  router.push({ 
    name: 'app-multisig-wallet-pst-import',
    params: {
      wallethash: route.params.wallethash,
      unsignedtransactionhash: route.params.unsignedtransactionhash
    },
    query: {
      title: $t('Import'),
      description: $t('ImportSignerSignatureDescription', {}, 'Scan or Load a Partially Signed Transaction from your cosigner to merge with this one.') ,
    }
  })
}

onMounted(async () => {
  if (wallet.value) {
    for (const signer of wallet.value.signers) {
      const xprv = await getSignerXPrv({ xpub: signer.xpub })
      if (xprv) {
        signersXPrv.value[signer.xpub] = xprv
      }
    }
  }  

  const storedPst = 
    (new Pst())
      .setStore($store)
      .setWallet(wallet.value)
      .setCoordinationServer(multisigCoordinationServer)
      .loadFromStore(route.params.unsignedtransactionhash)
  
  if (storedPst) {
    pst.value = storedPst
    signingProgress.value = pst.value.getSigningProgress()
  }
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
</style>