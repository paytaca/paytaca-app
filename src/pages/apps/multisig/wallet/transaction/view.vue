<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <HeaderNav
        :title="$t('Transaction')"
        :backnavpath="`/apps/multisig/wallet/${route.params.address}/transaction`"
        class="apps-header"
      />
    </q-header>
    <q-footer reveal>
      <q-bar class="full-width pt-card text-bow" :class="getDarkModeClass(darkMode)" style="padding: 0px;">
        <q-btn
          icon="keyboard_arrow_up"
          class="full-width"
          @click="openTransactionActionsDialog"
          flat>
        </q-btn>
      </q-bar>
    </q-footer>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <!-- <HeaderNav
              :title="$t('Transaction')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            /> -->
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-xs q-gutter-y-md">
                  <q-list v-if="multisigWallet && multisigTransaction?.transaction">
                    <q-item>
                      <q-item-section>
                        <!-- <q-item-label class="text-h6">{{ transactionUserPrompt }}</q-item-label> -->
                        <!-- <q-item-label caption lines="2">Origin: {{ transactionOrigin }}</q-item-label> -->
                         <q-item-label class="text-h6">{{ multisigTransaction.metadata.prompt }}</q-item-label>
                         <q-item-label caption lines="2">Origin: {{ multisigTransaction.metadata.origin }}</q-item-label>
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
                        <q-item-label caption lines="2">*Returned to sender address</q-item-label>
                      </q-item-section>
                      <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                        <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                          {{
                            getTotalBchChangeAmount(
                              multisigTransaction.transaction, multisigWallet.address,
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
                      <q-item-section >
                        <div class="flex flex-wrap items-center">
                          Required Signatures <q-icon name="draw" flat dense size="xs" class="q-ml-xs"></q-icon>
                        </div>
                      </q-item-section>
                      <q-item-section side>
                        {{ multisigWallet.m }}&nbsp;
                      </q-item-section>
                    </q-item>
                    <q-expansion-item>
                      <template v-slot:header>
                        <q-item-section>
                          Signatures {{ multisigTransaction.metadata.signatureCount }}
                        </q-item-section>
                      </template>
                      <q-item-label class="q-pa-md">
                        <code style="word-break: break-all; filter: brightness(80%)">
                          {{ stringify(multisigTransaction.signatures) }}
                        </code>
                      </q-item-label>
                    </q-expansion-item>
                    <q-separator spaced inset></q-separator>
                    <q-item>
                      <q-item-section>
                        <q-item-label class="text-h6">Wallet</q-item-label>
                        <q-item-label caption lines="2">{{ multisigWallet.address }}</q-item-label>
                      </q-item-section>
                      <q-item-section side top>
                        <!-- <q-item-label caption>5 min ago</q-item-label> -->
                        <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                      </q-item-section>
                    </q-item>
                    <q-item v-for="signerEntityIndex in Object.keys(multisigWallet.signers)" :key="signerEntityIndex">
                      <q-item-section >
                        <div class="flex flex-wrap justify-left items-center q-gutter-x-xs">
                          <span>{{ multisigWallet.signers[signerEntityIndex].signerName || `Signer ${signerEntityIndex}` }}</span>
                          <q-icon :name="signerSigned({ multisigTransaction, signerEntityIndex })? 'done_all': ''"></q-icon>
                        </div>
                      </q-item-section>
                      <q-item-section side>
                        <q-btn
                          label="Sign"
                          :disable="!multisigWallet.signerCanSign({ signerEntityIndex })"
                          :icon="multisigWallet.signerCanSign({ signerEntityIndex })? 'draw': 'edit_off'"
                          @click="partiallySignTransaction({ signerEntityIndex, xprv: multisigWallet.signers[signerEntityIndex]?.xprv })"
                          dense
                          no-caps
                          >
                        </q-btn>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-card-section class="flex flex-wrap justify-around">
                          <q-btn flat dense no-caps @click="$emit('delete')">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="delete" class="col-12"></q-icon>
                                <div class="col-12">Delete</div>
                              </div>
                            </template>
                          </q-btn>
                          <q-btn flat dense no-caps @click="broadcastTransaction">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="cell_tower" class="col-12"></q-icon>
                                <div class="col-12">Broadcast</div>
                              </div>
                            </template>
                          </q-btn>
                          <q-btn flat dense no-caps @click="downloadPSTransactionProposal">
                            <template v-slot:default>
                              <div class="row justify-center">
                                <q-icon name="share" class="col-12"></q-icon>
                                <div class="col-12">Download Transaction Proposal</div>
                              </div>
                            </template>
                          </q-btn>
                        </q-card-section>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useQuasar } from 'quasar'
import { computed, onBeforeMount, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { stringify, CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
// import { loadWallet } from 'src/wallet'
import { toP2shTestAddress } from 'src/utils/address-utils'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Pst,
  MultisigWallet,
  MultisigTransaction,
  getTotalBchInputAmount,
  getTotalBchOutputAmount,
  getTotalBchChangeAmount,
  getTotalBchFee
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import TransactionActionsDialog from 'src/components/multisig/TransactionActionsDialog.vue'
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getSignerXPrv, identifyPossiblePstCreator } = useMultisigHelpers()

// const multisigTransaction = computed(() => {
//   const transactions = $store.getters['multisig/getTransactionsByWalletAddress']({ address: route.params.address })
//   console.log('🚀 ~ multisigTransaction ~ transactions:', transactions)
//   if (transactions[route.params.index]) {
//     return MultisigTransaction.createInstanceFromObject(structuredClone(transactions[route.params.index]))
//   }
//   return transactions[route.params.index]
// })

const multisigTransaction = ref()

const signerSigned = computed(() => {
  return ({ signerEntityIndex }) => {
    return multisigWallet.value.signerSigned({ multisigTransaction: multisigTransaction.value, signerEntityIndex })
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
// const pst = ref()

const partiallySignTransaction = async ({ signerEntityIndex, xprv }) => {
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
  multisigWallet.value.signTransaction({
    multisigTransaction: multisigTransaction.value,
    signerEntityIndex
  })
  // router.push({ name: 'app-multisig-wallet-pst-view', params: { address: multisigWallet.value.address, id: pst.value.id } })
}

const deleteTransaction = async () => {
  await $store.dispatch(
    'multisig/deleteTransaction',
    { index: route.params.index }
  )
  router.back()
}

const broadcastTransaction = async () => {
  const cashAddressNetworkPrefix =
    isChipnet.value ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet

  multisigTransaction.value?.finalize({
    lockingData: multisigWallet.value.lockingData,
    template: multisigWallet.value.template,
    cashAddressNetworkPrefix
  })
}

const downloadPSTransactionProposal = () => {
  const defaultFilename = (multisigTransaction.value.metadata?.prompt || '').toLowerCase().replace(' ', '-')
  $q.dialog({
    title: 'Enter Filename',
    prompt: {
      type: 'text',
      model: defaultFilename
    }
  }).onOk((filename) => {
    if (!filename) return
    const data = multisigTransaction.value.exportBase64()
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}

const openTransactionActionsDialog = () => {
  $q.dialog({
    component: TransactionActionsDialog,
    componentProps: {
      darkMode: getDarkModeClass(darkMode.value),
      onDelete: deleteTransaction,
      onBroadcast: () => { console.log('deleting beach') },
      onExport: () => { console.log('deleting beach') }
    }
  })
}

onBeforeMount(async () => {
  if (route.params?.address) {
    multisigWallet.value = MultisigWallet.createInstanceFromObject(
      $store.getters['multisig/getWallet']({ address: route.params.address })
    )
    await multisigWallet.value.loadSignerXprivateKeys(getSignerXPrv)
    // multisigWallet.value = multisigWallet
  }
})

onMounted(async () => {
  // if (route.params?.address) {
  //   const multisigWallet = MultisigWallet.createInstanceFromObject(
  //     $store.getters['multisig/getWallet']({ address: route.params.address })
  //   )
  //   await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
  //   multisigWallet.value = multisigWallet
  // }
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
  }
  // return transactions[route.params.index]
  // multisigWallet.value = MultisigWallet.createInstanceFromObject(
  //   $store.getters['multisig/getWallet']({ address: route.params.address })
  // )
  // await multisigWallet.value.loadSignerXprivateKeys(getSignerXPrv)
  // multisigWallet.value = multisigWallet
  // console.log('WALLET', multisigWallet.value)
  // const prompt = multisigTransaction?.value?.sessionRequest?.params?.request?.params?.userPrompt
  // const origin = multisigTransaction?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  // pst.value = new Pst({
  //   lockingData: multisigWallet.value.lockingData,
  //   network: multisigWallet.value.network
  // })
  // const creator = identifyPossiblePstCreator({ signers: multisigWallet.value.signers })
  // console.log('TRANSACTION DATA', multisigTransaction.value.transaction)
  // pst.value
  //   .setTemplate(multisigWallet.value.template)
  //   .setTransaction(multisigTransaction.value.transaction)
  //   .setSourceOutputs(multisigTransaction.value.sourceOutputs)
  //   .setDesc({ prompt, origin, creator, wallet: 'Paytaca' })
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
