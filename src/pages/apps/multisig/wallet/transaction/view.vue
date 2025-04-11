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
                  <q-card
                    v-if="wallet && transactionData?.transaction"
                    flat
                    :class="getDarkModeClass(darkMode)" >
                    <q-card-section>
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h6">{{ transactionUserPrompt }}</div>
                          <div class="text-subtitle2">Origin: {{ transactionOrigin }}</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section>
                      {{ transaction }}
                    </q-card-section>
                    <q-card-section>
                      <div>Spend Summary</div>
                      {{ spendSummary(transactionData.transaction) }}
                    </q-card-section>
                    <q-separator />
                    <q-card-section>
                      <div>Number of recipients: {{ transactionData.transaction.outputs.length }}</div>
                    </q-card-section>
                    <q-separator />
                    <q-card-section v-if="Object.keys(pst?.signatures || {}).length > 0">
                      {{ pst.signatures }}
                    </q-card-section>
                    <q-separator />
                    <q-list>
                      <q-item v-for="signerEntityIndex in Object.keys(wallet.signers)" :key="signerEntityIndex">
                        <q-item-section>{{ wallet.signers[signerEntityIndex].signerName || `Signer ${signerEntityIndex}` }}</q-item-section>
                        <q-item-section side top>
                          <q-btn
                            label="Sign"
                            :disable="!wallet.signerCanSign({ signerEntityIndex })"
                            :icon="wallet.signerCanSign({ signerEntityIndex })? 'draw': 'edit_off'"
                            @click="partiallySignTransaction({ signerEntityIndex, xprv: wallet.signers[signerEntityIndex]?.xprv })"
                            >
                          </q-btn>
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <q-card-actions>
                      <!-- {{ wallet.signers }} -->
                      <q-chip v-for="signerEntityIndex in Object.keys(wallet.signers)" :key="signerEntityIndex">
                        {{ wallet.signers[signerEntityIndex].signerName }} {{ wallet.signers[signerEntityIndex].xprv }}
                      </q-chip>
                    </q-card-actions>
                    <q-card-actions>
                      <!-- <q-btn @click="partiallySignTransaction({ xprv: wallet.signers[signerEntityIndex].xprv })">Partially Sign</q-btn> -->
                      <q-btn @click="deleteTransaction">Delete Transaction</q-btn>
                    </q-card-actions>
                  </q-card>
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
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst, MultisigWallet } from 'src/lib/multisig'
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

const spendSummary = computed(() => {
  return (transaction) => {
    let satoshis = 0
    const tokens = {}
    transaction.inputs.forEach((input) => {
      satoshis += Number(String(input.sourceOutput?.valueSatoshis || '0'))
      const token = input.sourceOutput?.token?.category
      if (token && token.category) {
        if (!tokens[token.category]) {
          tokens[token.category] = 0
        }
        tokens[token.category] += (token.amount || 0)
      }
    })
    return { satoshis, tokens }
  }
})

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

// const isChipnet = computed(() => $store.getters['global/isChipnet'])

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
