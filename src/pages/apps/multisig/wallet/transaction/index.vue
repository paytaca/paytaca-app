<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Transactions')"
              :backnavpath="`/apps/multisig/wallet/${route.params.address}`"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row q-mt-lg justify-center">
                <div class="col-xs-12 col-md-8 q-px-md q-gutter-y-md">
                  <q-card
                    v-for="unsigned, i in transactions"
                    :key="`app-multisig-tx-`+i"
                    flat bordered class="my-card" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
                    <q-card-section>
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h6">{{ transactionUserPrompt(unsigned) }}</div>
                          <div class="text-subtitle2">Origin: {{ transactionOrigin(unsigned) }}</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-separator />
                    <q-card-section>
                      <div>Spend Summary</div>
                      {{ spendSummary(unsigned.transaction) }}
                    </q-card-section>
                    <q-separator />
                    <q-card-section>
                      <div>Number of recipients</div>
                      {{ unsigned.transaction.outputs.length }}
                    </q-card-section>
                    <q-card-actions>
                      <q-btn
                        flat
                        :to="{ name: 'app-multisig-wallet-transaction-view', params: { address:route.params.address, index: i } }">
                        Open
                      </q-btn>
                    </q-card-actions>
                    {{ unsigned.transaction }}
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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// import { decodePrivateKeyWif } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { loadLibauthHdWallet } from '../../../wallet'
// import { getLockingData } from '../../../lib/multisig'

const $store = useStore()
const route = useRoute()
const router = useRouter()
const { t: $t } = useI18n()

const transactions = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

// const psbct = ref()
// const myXPubKey = ref()

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const transactionOrigin = computed(() => {
  return (data) => {
    return data?.sessionRequest?.verifyContext?.verified?.origin || 'Unknown Origin'
  }
})

const transactionUserPrompt = computed(() => {
  return (data) => {
    return data?.sessionRequest?.params?.request?.params?.userPrompt || 'Signature Request'
  }
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

// const isChipnet = computed(() => $store.getters['global/isChipnet'])

// const extractTransactionData = (signatureRequest) => {
//   const transaction = signatureRequest?.params?.request?.method?.params?.transaction
//   const sourceOutputs = signatureRequest?.params?.request?.method?.params?.sourceOutputs
//   return { transaction, sourceOutputs }
// }

// const resolveMyXPubKey = () => {
//   const { xPubKey /* , derivationPath */ } = $store.getters['global/getWallet']('bch')
//   myXPubKey.value = xPubKey
// }

// const getTransactionProposal = ({ transaction }) => {
//   const transactionProposal = {
//     locktime: transaction.locktime,
//     version: transaction.version,
//     outputs: transaction.outputs
//   }
//   return transactionProposal
// }

// const partiallySignTransaction = async ({ transactionProposal }) => {
// const p2pkhWallet = await loadLibauthHdWallet(0, isChipnet.value)
// const wif = p2pkhWallet.getPrivateKeyWifAt('0/0')
// const decodedPrivkey = decodePrivateKeyWif(wif)
// const transactionProposal = getTransactionProposal({ transaction: psbct.value.transaction })
// const lockingData = getLockingData({ signers: wallet.value.signers })
// // identify who we are
//
// }

onMounted(() => {
  console.log('ROUTE PARAMS', route.params)
  transactions.value = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  console.log('🚀 ~ onMounted ~ transactions:', transactions.value)
  if (transactions.value && transactions.value?.length === 1) {
    router.push({ name: 'app-multisig-wallet-transaction-view', params: { address: route.params.address, index: 0 } })
  }
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
