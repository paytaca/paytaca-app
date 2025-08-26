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
            <q-item>
              <q-item-section>
                Debit
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg" :label="`- ${pst.getTotalDebitSatoshis() / 1e8}`" color="red">
                  &nbsp;
                </q-btn>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                Change
              </q-item-section>
              <q-item-section side>
                <q-btn icon-right="img:bitcoin-cash-circle.svg" :label="Big(pst.getTotalChangeSatoshis()).div(1e8).toString()" flat dense>
                  &nbsp;
                </q-btn>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                Fee
              </q-item-section>
              <q-item-section side>
                <q-btn icon-right="img:bitcoin-cash-circle.svg" :label="Big(pst.getFeeSatoshis()).div(1e8).toString()" flat dense>
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
                  <!-- <q-icon
                    :color="isSignerSignatureOk({ signerEntityKey })? 'green': 'grey-8'"
                    :name="isSignerSignatureOk({ signerEntityKey })? 'done_all': ''"
                    size="sm"
                    >
                  </q-icon> -->
                </div>
              </q-item-section>
              <q-item-section side top>
                <q-btn
                  label="Sign"
                  :disable="!signersXPrv[signer.xpub] || pst.signerSigned(signer.xpub) || signingProgress?.signingProgress === 'fully-signed'"
                  :icon="signButtonIcon(signer)"
                  :color="signersXPrv[signer.xpub]? 'secondary': ''"
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
                <!-- <q-btn @click="() => pst?.delete()">Delete</q-btn> -->
                <div class="row justify-between q-gutter-x-md">
                  <q-btn v-if="signingProgress != 'fully-signed'" class="tile col-xs-3" flat dense no-caps @click="loadCosignerPst" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center">
                        <q-icon name="mdi-file-upload" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="col-12 tile-label">Load Cosigner PST</div>
                      </div>
                    </template>
                  </q-btn>
                  <q-btn v-if="signingProgress != 'fully-signed'" class="tile col-xs-3" flat dense no-caps @click="loadCosignerPst" v-close-popup>
                    <template v-slot:default>
                      <div class="row justify-center items-stretch">
                        <q-icon name="cell_tower" class="col-12" color="primary" size="lg"></q-icon>
                        <div class="tile-label col-12">Broadcast</div>
                      </div>
                    </template>
                  </q-btn>
                  <q-btn v-if="signingProgress != 'fully-signed'" class="tile col-xs-3" flat dense no-caps @click="openBottomsMenu" v-close-popup>
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
import { useI18n } from 'vue-i18n'
import { useQuasar, openURL } from 'quasar'
import { computed, ref, onMounted, watch, toValue, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stringify, hashTransaction, decodeTransactionCommon, hexToBin } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { MultisigWallet, Pst, shortenString } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import DragSlide from 'src/components/drag-slide.vue'
import SecurityCheckDialog from 'components/SecurityCheckDialog.vue'
import Big from 'big.js'
import { sign } from '@psf/bch-js/src/ecpair'

const {
  getSignerXPrv,
  multisigWallets,
  txExplorerUrl,
  cashAddressNetworkPrefix
} = useMultisigHelpers()


const $q = useQuasar()
const route = useRoute()
const $store = useStore()
const signersXPrv = ref({})
const showActionConfirmationSlider = ref(false)
const signTransactionInitiatedByXPrv = ref('')
const signingProgress = ref({})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const pst = computed(() => {
    const storedPst = $store.getters['multisig/getPstByUnsignedTransactionHash'](route.params.unsignedtransactionhash)
    if (!storedPst) return null
    const p = Pst.fromObject(
      $store.getters['multisig/getPstByUnsignedTransactionHash'](route.params.unsignedtransactionhash),
      { store: $store }
    )
    return p
})

const wallet = computed(() => {
  const walletObject = $store.getters['multisig/getWalletByHash'](route.params.wallethash)
  if (walletObject) {
    return MultisigWallet.fromObject(walletObject)
  }
  return walletObject
})  

const signButtonIcon = computed(() => {
  return (signer) => {
    if (!signersXPrv.value[signer.xpub]) return 'edit_off'
    if (pst.value.signerSigned(signer.xpub)) return 'done_all'
    return 'draw'
  }
})

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
        value: 'share-pst',
        color: 'primary'
      },
      {
        icon: 'mdi-file-export',
        label: 'Export PST',
        value: 'copy-unsigned-tx-hash',
        color: 'primary'
      }
    ],
    class: `${getDarkModeClass(darkMode.value)} pt-card text-bow`

  }).onOk(async (value) => {
    if (value === 'delete') {
      await pst.value.delete()
      $router.push(`/apps/multisig/wallet/${wallet.value.getHash()}`)
    } else if (value === 'share-pst') {
      await pst.value.sharePst()
    } else if (value === 'copy-unsigned-tx-hash') {
      await $q.copy(pst.value.getUnsignedTransactionHash())
      $q.notify({ type: 'positive', message: 'Copied to clipboard' })
    } else if (value === 'view-in-explorer') {
      const url = txExplorerUrl.value.replace('{txid}', pst.value.getUnsignedTransactionHash())
      openURL(url)
    }
  })
}

const initiateSignTransaction = async (signer) => {
  showActionConfirmationSlider.value = true
  signTransactionInitiatedByXPrv.value = signersXPrv.value[signer.xpub]
}

const executeSignTransaction = async () => {
  if (!signTransactionInitiatedByXPrv.value) return
  pst.value.sign(signTransactionInitiatedByXPrv.value)
  signTransactionInitiatedByXPrv.value = ''
  signingProgress.value = pst.value.getSigningProgress()
}

const onConfirmSliderSwiped = async (reset) => {
  showActionConfirmationSlider.value = false
  await new Promise((resolve, reject) => {
    $q.dialog({ component: SecurityCheckDialog })
    .onOk(() => {
      showActionConfirmationSlider.value = false
      executeSignTransaction()
      resolve(true)
    })
    .onDismiss(() => {
      signTransactionInitiatedByXPrv.value = ''
      reset?.()
      resolve(false)
    })

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

  if (pst.value) {
    signingProgress.value = pst.value.getSigningProgress()
    console.log('INITIAL SIGNING PROGRESS', signingProgress.value)
  }
})

</script>
