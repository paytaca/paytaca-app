<template>
  <q-pull-to-refresh
    id="app-container"
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
                  <!-- <q-item-label class="text-h6">{{ transactionUserPrompt }}</q-item-label> -->
                  <!-- <q-item-label caption lines="2">Origin: {{ transactionOrigin }}</q-item-label> -->
                    <q-item-label class="text-h6">{{ multisigTransaction.metadata?.prompt }}</q-item-label>
                    <q-item-label caption lines="2">Origin: {{ multisigTransaction.metadata?.origin }}</q-item-label>
                    <q-item-label caption lines="2">
                      Status:
                      <q-btn
                        @click="() => multisigTransaction.refreshStatus(multisigWallet)"
                        :loading="multisigTransaction.metadata?.isRefreshingStatus"
                        flat
                        no-caps
                        dense
                      >
                        <template v-slot:default>
                          <div class="flex flex-nowrap items-center">
                            <span class="text-caption">{{ multisigTransaction.status }}</span> <q-icon name="refresh" size="sm" class="q-ml-sm"></q-icon>
                          </div>
                        </template>
                      </q-btn>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <!-- <q-item-label caption>5 min ago</q-item-label> -->
                  <q-icon name="payment" color="grad"></q-icon>
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
                  <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
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
                        multisigTransaction.transaction, route.params.address,
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
              <q-item>
                <q-item-section>
                  <q-item-label>Status</q-item-label>
                </q-item-section>
                <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                  <q-btn
                    @click="() => multisigTransaction.refreshStatus(multisigWallet)"
                    :loading="multisigTransaction.metadata?.isRefreshingStatus"
                    flat
                    no-caps
                    dense
                  >
                    <template v-slot:default>
                      <div class="flex flex-nowrap items-center">
                        {{ multisigTransaction.status }} <q-icon name="refresh" size="sm" class="q-ml-sm"></q-icon>
                      </div>
                  </template>
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
                    {{ shortenString(multisigWallet.address, 20) }}
                  </q-item-label>
                  <!-- <q-icon name="bch" color="green" /> -->
                </q-item-section>
              </q-item>
              <q-separator spaced inset></q-separator>
              <!-- <q-item>
                <q-item-section>
                  <q-item-label class="text-h6">Wallet</q-item-label>
                  <q-item-label caption lines="2">{{ multisigWallet.address }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                </q-item-section>
              </q-item> -->
              <q-item>
                <q-item-section>
                  <q-item-label class="text-h6">Signatures</q-item-label>
                </q-item-section>
                <!-- <q-item-section side top>
                  <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                </q-item-section> -->
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Required Signatures <q-icon name="draw" flat dense size="xs" class="q-ml-xs"></q-icon>
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ multisigWallet.m }}&nbsp;
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <div class="flex flex-wrap items-center">
                    Current Signatures <q-icon name="draw" flat dense size="xs" class="q-ml-xs"></q-icon>
                  </div>
                </q-item-section>
                <q-item-section side>
                  {{ multisigTransaction.getSignatureCount(multisigWallet) }}&nbsp;
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
              <q-item v-for="signerEntityIndex in Object.keys(multisigWallet.signers)" :key="signerEntityIndex">
                <q-item-section >
                  <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                    <div>
                      {{ multisigWallet.signers[signerEntityIndex].signerName || `Signer ${signerEntityIndex}` }}
                    </div>
                    <q-icon
                      :color="signerCanSign({ signerEntityIndex }) && signerSigned({ multisigTransaction, signerEntityIndex })? 'green': 'grey-8'"
                      :name="signerCanSign({ signerEntityIndex }) && signerSigned({ multisigTransaction, signerEntityIndex })? 'done_all': ''"
                      size="sm"
                      >
                    </q-icon>
                  </div>
                </q-item-section>
                <q-item-section side top>
                  <q-btn
                    label="Sign"
                    :disable="!signerCanSign({ signerEntityIndex })"
                    :icon="signerCanSign({ signerEntityIndex })? 'draw': 'edit_off'"
                    @click="signTransaction({ signerEntityIndex, xprv: multisigWallet.signers[signerEntityIndex]?.xprv })"
                    dense
                    no-caps
                    flat
                    :class="signerCanSign({ signerEntityIndex }) ? 'default-text-color': 'inactive-color'"
                    >
                  </q-btn>
                </q-item-section>
              </q-item>
              <q-separator spaced inset />
              <q-item>
                <q-item-section >
                  <div class="flex flex-wrap justify-around relative">
                    <q-btn @click="deleteTransaction" class="footer-icon-btn default-text-color" flat dense no-caps :color="!darkMode && 'primary'">
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="delete_outline" class="col-12"></q-icon>
                          <div class="col-12">Delete</div>
                        </div>
                      </template>
                    </q-btn>
                    <q-btn @click="downloadPST" flat dense no-caps :color="!darkMode && 'primary'">
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="mdi-file-export-outline" class="col-12"></q-icon>
                          <div class="col-12">Export</div>
                        </div>
                      </template>
                    </q-btn>
                    <q-btn
                      v-if="multisigTransaction.isFinalized"
                      @click="broadcastTransaction"
                      flat dense no-caps
                      :loading="multisigTransaction.isBroadcasting"
                      >
                      <template v-slot:default>
                        <div class="row justify-center">
                          <q-icon name="cell_tower" class="col-12"></q-icon>
                          <div class="col-12">Submit</div>
                        </div>
                      </template>
                      <template v-slot:loading>
                        <q-spinner-radio class="on-left" />
                      </template>
                    </q-btn>
                    <q-inner-loading :showing="visible">
                      <q-spinner-gears size="50px" color="primary" />
                    </q-inner-loading>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </template>
      </div>
    </div>
  </q-pull-to-refresh>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stringify, CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
// import { loadWallet } from 'src/wallet'
import { toP2shTestAddress } from 'src/utils/address-utils'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  MultisigWallet,
  MultisigTransaction,
  getTotalBchInputAmount,
  getTotalBchOutputAmount,
  getTotalBchChangeAmount,
  getTotalBchFee,
  shortenString
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const { getSignerXPrv, deleteTransaction } = useMultisigHelpers()

// const multisigTransaction = computed(() => {
//   const transactions = $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
//   console.log('🚀 ~ multisigTransaction ~ transactions:', transactions)
//   if (transactions[route.params.index]) {
//     return MultisigTransaction.createInstanceFromObject(structuredClone(transactions[route.params.index]))
//   }
//   return transactions[route.params.index]
// })

const multisigTransaction = ref()

// const signerSigned = computed(() => {
//   return ({ signerEntityIndex }) => {
//     return multisigWallet.value.signerSigned({ multisigTransaction: multisigTransaction.value, signerEntityIndex })
//   }
// })

const signerSigned = computed(() => {
  return ({ signerEntityIndex }) => {
    if (multisigWallet.value && multisigTransaction.value) {
      return multisigTransaction.value?.signerSigned({
        multisigWallet: multisigWallet.value,
        signerEntityId: `signer_${signerEntityIndex}`
      })
    }
  }
})

const signerCanSign = computed(() => {
  return ({ signerEntityIndex }) => {
    return multisigWallet.value?.signerCanSign({ signerEntityIndex })
  }
})

// const transactionOrigin = computed(() => {
//   if (multisigTransaction.value?.sessionRequest?.verifyContext) {
//     return multisigTransaction.value?.sessionRequest?.verifyContext?.verified?.origin || 'Unknown Origin'
//   }
//   return 'Wallet'
// })

// const transactionUserPrompt = computed(() => {
//   return multisigTransaction.value?.sessionRequest?.params?.request?.params?.userPrompt || 'Signature Request'
// })

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

const multisigWallet = ref()

const signTransaction = async ({ signerEntityIndex, xprv }) => {
  console.log('sign', signerEntityIndex, xprv)
  if (!multisigWallet.value) return
  // const walletObject = $store.getters['multisig/getWallet']({ address: route.params.address })
  // const wallet = MultisigWallet.createInstanceFromObject(walletObject)
  // const prompt = multisigTransaction?.value?.sessionRequest?.params?.request?.params?.userPrompt
  // const origin = multisigTransaction?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  // const pst = new Pst({
  //   lockingData: multisigWallet.value.lockingData,
  //   network: multisigWallet.value.network
  // })
  // // Use currently loaded Paytaca BCH wallet
  // const walletIndex = $store.getters['global/getWalletIndex']
  // const { mnemonic } = await loadWallet('BCH', walletIndex)
  // const hdKeys = multisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
  // const creator = Object.keys(multisigWallet.value.signers).find((signerId) => {
  //   return multisigWallet.value.signers[signerId].xpub === hdKeys.hdPublicKey
  // })
  // pst
  //   .setTemplate(multisigWallet.value.template)
  //   .setTransaction(multisigTransaction.value.transaction)
  //   .setSourceOutputs(multisigTransaction.value.sourceOutputs)
  //   .setDesc({ prompt, origin, creator, wallet: 'Paytaca' })
  //   .signTransaction({ [`signer_${creator}`]: hdKeys.hdPrivateKey })
  //   .save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
  // pst.value
  //   .signTransaction({ [`signer_${signerEntityIndex}`]: xprv })
  //   .save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
  // multisigWallet.value.signTransaction({
  //   multisigTransaction: multisigTransaction.value,
  //   signerEntityIndex
  // })
  multisigTransaction.value.signTransaction({
    multisigWallet: multisigWallet.value,
    signerEntityIndex
  })
  // router.push({ name: 'app-multisig-wallet-pst-view', params: { address: multisigWallet.value.address, id: pst.value.id } })
}

const broadcastTransaction = async () => {
  const cashAddressNetworkPrefix =
    isChipnet.value ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet

  if (!multisigTransaction.value?.isFinalized) {
    multisigTransaction.value?.finalize({
      lockingData: multisigWallet.value.lockingData,
      template: multisigWallet.value.template,
      cashAddressNetworkPrefix
    })
  }
  console.log('🚀 ~ broadcastTransaction ~ multisigTransaction:', multisigTransaction)
  if (multisigTransaction.value?.metadata?.signedTransaction) {
    const network = isChipnet.value ? 'chipnet' : 'mainnet'
    const response = await multisigTransaction.value.broadcast({ network })
    console.log('🚀 ~ broadcastTransaction ~ response:', await response.json())
  }
}

const downloadPST = () => {
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
    const data = multisigTransaction.value.exportPST({ signers: multisigWallet.value.signersSafe })
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}

onMounted(async () => {
  const m = MultisigWallet.createInstanceFromObject(
    $store.getters['multisig/getWallet']({ address: route.params.address })
  )
  await m.loadSignerXprivateKeys(getSignerXPrv)
  multisigWallet.value = m

  const transactions =
    $store.getters['multisig/getTransactionsByWalletAddress']({
      address: route.params.address
    })

  console.log('🚀 ~ multisigTransaction ~ transactions:', transactions)
  if (transactions[route.params.index]) {
    multisigTransaction.value =
      MultisigTransaction.createInstanceFromObject(
        structuredClone(transactions[route.params.index])
      )
    await multisigTransaction.value.refreshStatus(multisigWallet.value)
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
