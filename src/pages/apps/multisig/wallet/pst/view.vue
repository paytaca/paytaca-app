<!-- eslint-disable no-mixed-spaces-and-tabs -->
<template>
  <q-pull-to-refresh
    id="app-container"
    class="text-bow"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav :title="$t('Transaction')" :backnavpath="`${ route.query.backnavpath || `/apps/multisig/wallet/${route.params.wallethash}`}`" class="header-nav">
    </HeaderNav>
    <div class="row justify-center">
      <div class="col-xs-12 col-sm-8 q-px-xs">
        <template v-if="pst">
          <q-list>
            <q-item>
              <q-item-section>
                <q-item-label class="text-h5 text-bold">
                  Purpose
                </q-item-label>
              </q-item-section>
              <q-item-section side class="text-capitalize text-bold">
                <q-item-label>
                  {{ pst.purpose }}
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
                  Raw Tx Details
                </q-item-section>
              </template>
              <q-item-label class="q-pa-md">
                <code style="word-break: break-all; filter: brightness(80%)">
                  {{ decodeTransactionCommon(hexToBin(pst.unsignedTransactionHex)) }}
                </code>
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
            <q-item v-for="signer, i in wallet?.signers" :key="`signer-${i}`">
              <q-item-section >
                <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                  <div>
                    {{ signer.name || `Signer ${i}` }}
                  </div>
                </div>
              </q-item-section>
              <q-item-section side top>
                <q-btn
                  label="Sign"
                  :disable="!signersXPrv[signer.xpub] || pst?.signerSigned(signer.xpub) || signingProgress?.signingProgress === 'fully-signed'"
                  :icon="signButtonIcon(signer)"
                  :color="signersXPrv[signer.xpub] || pst?.signerSigned(signer.xpub)? 'secondary': ''"
                  dense
                  no-caps
                  flat
                  :class="signersXPrv[signer.xpub] ? 'default-text-color': 'inactive-color'"
                  @click="initiateSignTransaction(signer)"
                  >
                </q-btn>
              </q-item-section>
            </q-item>
            <q-separator></q-separator>
            <q-item class="q-mt-lg">
              <q-item-section>
                <div class="row justify-between q-gutter-x-md">
                  <q-btn :disabled="signingProgress.signingProgress === 'fully-signed'" class="tile col-xs-3" flat dense no-caps @click="combinePst" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="mdi-file-upload" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">Combine</div>
                      </div>
                    </template>
                  </q-btn>
                  <q-btn 
                    :loading="isBroadcasting"
                    @click="broadcastTransaction"
                    :disable="signingProgress.signingProgress !== 'fully-signed' || pst.txid"
                    class="tile col-xs-3" flat dense no-caps>
                    <template v-slot:default>
                      <div class="row justify-center items-stretch">
                        <q-icon name="cell_tower" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">Broadcast</div>
                      </div>
                    </template>
                    <template v-slot:loading>
                      <div class="row justify-center items-stretch">
                        <q-spinner-radio color="primary" size="lg"/>
                        <div class="col-12 tile-label">Broadcasting...</div>
                      </div>
                    </template>
                  </q-btn>
                  <q-btn class="tile col-xs-3" flat dense no-caps @click="openBottomsMenu" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="more_horiz" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">More</div>
                      </div>
                    </template>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </template>
        </div>
        <DragSlide
          v-if="showActionConfirmationSlider"
          @swiped="onConfirmSliderSwiped"
          text="Swipe to confirm"
          class="absolute-bottom"
        />
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { QSpinnerDots, useQuasar } from 'quasar'
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
import PstExportOptionsDialog from 'components/multisig/PstExportOptionsDialog.vue'
import PstQrDialog from 'components/multisig/PstQrDialog.vue'

const {
  getSignerXPrv,
  multisigNetworkProvider,
  multisigCoordinationServer,
  resolveXprvOfXpub
} = useMultisigHelpers()


const $q = useQuasar()
const $store = useStore()
const route = useRoute()
const router = useRouter()
const signersXPrv = ref({})
const showActionConfirmationSlider = ref(false)
const signingInitiatedBy = ref()
const signingProgress = ref({})
const isBroadcasting = ref(false)
const pst = ref()

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
        resolveXprvOfXpub
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
    if (!signersXPrv.value[signer.xpub]) return 'edit_off'
    return 'draw'
  }
})

const syncPst = async () => {

  try {

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

const showPstExportOptionsDialog = () => {
  $q.dialog({
    component: PstExportOptionsDialog,
    componentProps: {
      darkMode: darkMode.value,
      pst: pst.value
    }
  }).onOk((payload) => {
    if (payload?.action === 'display-qr') {
      showPstQrDialog()
    } else if (payload?.action === 'download-pst') {
      const defaultFilename = (pst.value?.purpose || '').toLowerCase().replace(/\s+/g, '-')
      $q.dialog({
        title: 'Enter Filename',
        class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
        prompt: {
          type: 'text',
          model: defaultFilename
        }
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
      // downloadWalletFile(payload.pst || pst.value)
    } else {
      // openWalletActionsDialog()
    }
  }).onCancel(() => {
    // Dialog was closed without action
  })
}

const showPstQrDialog = () => {
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



const openBottomsMenu = () => {
  $q.bottomSheet({
    title: 'More Actions',
    grid: true,
    actions: [
      {
        icon: 'delete_forever',
        label: 'Delete',
        value: 'delete',
        color: 'red'
      },
      {
        icon: 'cloud_upload',
        label: 'Sync',
        value: 'sync-pst',
        color: 'primary'
      },
      {
        icon: 'mdi-file-export',
        label: 'Export PSBT',
        value: 'export-psbt',
        color: 'primary'
      }
    ],
    class: `${getDarkModeClass(darkMode.value)} pt-card text-bow justify-between`

  }).onOk(async (action) => {
    if (action.value === 'delete') {
      await pst.value.delete({ sync: false })
      router.push(`/apps/multisig/wallet/${route.params.wallethash}`)
    }

    if (action.value === 'sync-pst') {
      await syncPst()
    }

    if (action.value === 'export-psbt') {
      showPstExportOptionsDialog()
    }
  })
}

const initiateSignTransaction = async (signer) => {
  showActionConfirmationSlider.value = true
  signingInitiatedBy.value = {
    ...signer,
    xprv: signersXPrv.value[signer.xpub]
  }
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

const combinePst = () => {
  router.push({ 
    name: 'app-multisig-wallet-pst-import',
    params: {
      wallethash: route.params.wallethash,
      unsignedtransactionhash: route.params.unsignedtransactionhash
    },
    query: {
      title: 'Combine Tx',
      description: 'Scan or Load a Partially Signed Transaction Proposal to combine with this one.',
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
