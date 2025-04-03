<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('View Template')"
              backnavpath="/apps/multisig"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <q-card
                    v-if="transactionData?.transaction"
                    flat bordered class="my-card" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
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
                    <q-card-actions>
                      <q-btn flat @click="partiallySignTransaction">Partially Sign</q-btn>
                    </q-card-actions>
                  </q-card>
                </div>
            </div>
          </div>
        </div>
        <FooterMenu v-if="wallet" :address="wallet.address"/>
      </q-page>

    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadWallet } from 'src/wallet'
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst, MultisigWallet } from 'src/lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const router = useRouter()

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

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const partiallySignTransaction = async () => {
  const wallet = $store.getters['multisig/getWallet']({ address: route.params.address })
  const message = transactionData?.value?.sessionRequest?.params?.request?.params?.userPrompt
  const origin = transactionData?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  let creator = transactionData?.value?.sessionRequest?.session?.namespaces?.bch?.accounts?.[0]
  creator = creator ? creator?.replace('bch:', '') : creator
  const pst = new Pst({
    lockingData: wallet.lockingData,
    network: wallet.network
  })
  // Use currently loaded Paytaca BCH wallet
  const walletIndex = $store.getters['global/getWalletIndex']
  const { mnemonic } = await loadWallet('BCH', walletIndex)
  const hdKeys = MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
  const mySignerId = Object.keys(wallet.signers).find((signerId) => {
    return wallet.signers[signerId].xPubKey === hdKeys.hdPublicKey
  })
  pst
    .setTemplate(wallet.template)
    .setTransaction(transactionData.value.transaction)
    .setSourceOutputs(transactionData.value.sourceOutputs)
    .setMetadata({ message, origin, creator, wallet: 'Paytaca' })
    .signTransaction({ [`signer_${mySignerId}`]: hdKeys.hdPrivateKey })
    .save((pstValue) => $store.dispatch('multisig/savePst', pstValue))

  router.push({ name: 'app-multisig-wallet-pst-view', params: { address: wallet.address, id: pst.id } })
}
</script>

<style scoped>
.light {
  color: #141414;
}
</style>
