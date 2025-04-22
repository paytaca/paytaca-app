<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Transaction')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <q-list v-if="wallet && transactionData?.transaction">
                    <q-item>
                      <q-item-section>
                        <q-item-label class="text-h6">{{ transactionUserPrompt }}</q-item-label>
                        <q-item-label caption lines="2">Origin: {{ transactionOrigin }}</q-item-label>
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
                        {{ transactionData.transaction.outputs.length }}&nbsp;
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label>Spending</q-item-label>
                      </q-item-section>
                      <q-item-section side top class="flex flex-wrap items-center q-gutter-x-xs">
                        <q-btn flat dense icon-right="img:bitcoin-cash-circle.svg">
                          {{ getTotalBchInputAmount(transactionData.transaction) }}
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
                              transactionData.transaction
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
                              transactionData.transaction, wallet.address,
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
                          {{ getTotalBchFee(transactionData.transaction) }}
                          &nbsp;
                        </q-btn>
                      </q-item-section>
                    </q-item>
                    <q-expansion-item>
                      <template v-slot:header>
                        <q-item-section>
                          Raw Transaction
                        </q-item-section>
                      </template>
                      <code>
                        {{ transactionData.transaction }}
                      </code>
                    </q-expansion-item>
                    <q-separator spaced inset></q-separator>
                    <q-item>
                      <q-item-section>
                        <q-item-label class="text-h6">Wallet</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <!-- <q-item-label caption>5 min ago</q-item-label> -->
                        <q-icon name="mdi-wallet-outline" color="grad"></q-icon>
                      </q-item-section>
                    </q-item>
                    <q-item v-for="signerEntityIndex in Object.keys(wallet.signers)" :key="signerEntityIndex">
                      <q-item-section>{{ wallet.signers[signerEntityIndex].signerName || `Signer ${signerEntityIndex}` }}</q-item-section>
                      <q-item-section side>
                        <q-btn
                          :disable="!wallet.signerCanSign({ signerEntityIndex })"
                          :icon="wallet.signerCanSign({ signerEntityIndex })? 'draw': 'edit_off'"
                          @click="partiallySignTransaction({ signerEntityIndex, xprv: wallet.signers[signerEntityIndex]?.xprv })"
                          flat
                          dense
                          >
                        </q-btn>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section class="flex justify-end">
                        <q-btn @click="deleteTransaction" color="red">Delete Transaction</q-btn>
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
import { computed, onBeforeMount, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// import { loadWallet } from 'src/wallet'
import { toP2shTestAddress } from 'src/utils/address-utils'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  Pst,
  MultisigWallet,
  getTotalBchInputAmount,
  getTotalBchOutputAmount,
  getTotalBchChangeAmount,
  getTotalBchFee
} from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()
const { getSignerXPrv, identifyPossiblePstCreator } = useMultisigHelpers()

const transactionData = computed(() => {
  const transactions = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  return transactions[route.params.index]
})

const transactionOrigin = computed(() => {
  if (transactionData.value?.sessionRequest?.verifyContext) {
    return transactionData.value?.sessionRequest?.verifyContext?.verified?.origin || 'Unknown Origin'
  }
  return 'Wallet'
})

const transactionUserPrompt = computed(() => {
  return transactionData.value?.sessionRequest?.params?.request?.params?.userPrompt || 'Signature Request'
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

const wallet = ref()
const pst = ref()

const partiallySignTransaction = async ({ signerEntityIndex, xprv }) => {
  console.log('sign', signerEntityIndex, xprv)
  if (!wallet.value) return
  // const walletObject = $store.getters['multisig/getWallet']({ address: route.params.address })
  // const wallet = MultisigWallet.fromObject(walletObject)
  // const prompt = transactionData?.value?.sessionRequest?.params?.request?.params?.userPrompt
  // const origin = transactionData?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  // const pst = new Pst({
  //   lockingData: wallet.value.lockingData,
  //   network: wallet.value.network
  // })
  // // Use currently loaded Paytaca BCH wallet
  // const walletIndex = $store.getters['global/getWalletIndex']
  // const { mnemonic } = await loadWallet('BCH', walletIndex)
  // const hdKeys = MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
  // const creator = Object.keys(wallet.value.signers).find((signerId) => {
  //   return wallet.value.signers[signerId].xpub === hdKeys.hdPublicKey
  // })
  // pst
  //   .setTemplate(wallet.value.template)
  //   .setTransaction(transactionData.value.transaction)
  //   .setSourceOutputs(transactionData.value.sourceOutputs)
  //   .setDesc({ prompt, origin, creator, wallet: 'Paytaca' })
  //   .signTransaction({ [`signer_${creator}`]: hdKeys.hdPrivateKey })
  //   .save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
  pst.value
    .signTransaction({ [`signer_${signerEntityIndex}`]: xprv })
    .save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
  router.push({ name: 'app-multisig-wallet-pst-view', params: { address: wallet.value.address, id: pst.value.id } })
}

const deleteTransaction = () => {
  $store.dispatch('multisig/deleteTransaction', { index: route.params.index })
}

onBeforeMount(async () => {
  if (route.params?.address) {
    const multisigWallet = MultisigWallet.fromObject(
      $store.getters['multisig/getWallet']({ address: route.params.address })
    )
    await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
    wallet.value = multisigWallet
  }
})

onMounted(async () => {
  // if (route.params?.address) {
  //   const multisigWallet = MultisigWallet.fromObject(
  //     $store.getters['multisig/getWallet']({ address: route.params.address })
  //   )
  //   await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
  //   wallet.value = multisigWallet
  // }
  const multisigWallet = MultisigWallet.fromObject(
    $store.getters['multisig/getWallet']({ address: route.params.address })
  )
  await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
  wallet.value = multisigWallet
  console.log('WALLET', wallet.value)
  const prompt = transactionData?.value?.sessionRequest?.params?.request?.params?.userPrompt
  const origin = transactionData?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  pst.value = new Pst({
    lockingData: wallet.value.lockingData,
    network: wallet.value.network
  })
  const creator = identifyPossiblePstCreator({ signers: wallet.value.signers })
  console.log('TRANSACTION DATA', transactionData.value.transaction)
  pst.value
    .setTemplate(wallet.value.template)
    .setTransaction(transactionData.value.transaction)
    .setSourceOutputs(transactionData.value.sourceOutputs)
    .setDesc({ prompt, origin, creator, wallet: 'Paytaca' })
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
