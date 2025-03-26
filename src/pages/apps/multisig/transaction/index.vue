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
                    v-for="transaction, i in transactions"
                    :key="`app-multisig-tx-`+i"
                    flat bordered class="my-card" :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-2'">
                    <q-card-section>
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h6">Our Planet</div>
                          <div class="text-subtitle2">by John Doe</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section>
                      {{ transaction }}
                    </q-card-section>
                    <q-separator />
                    <q-card-actions>
                      <q-btn flat :to="{ name: 'app-multisig-transaction-view', params: { address:route.params.address, index: i } }">Open</q-btn>
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
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
// import { decodePrivateKeyWif } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
// import { loadLibauthHdWallet } from '../../../wallet'
// import { getLockingData } from '../../../lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const transactions = ref()

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const psbct = ref()
// const myXPubKey = ref()

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

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
  // resolveMyXPubKey()
  transactions.value = $store.getters['multisig/getTransactionsByAddress']({ address: route.params.address })
  // const { transaction, sourceOutputs } = extractTransactionData(signatureRequest.value)
  // psbct.value = {
  //   transaction,
  //   sourceOutputs,
  //   wallet: wallet.value,
  //   partialSignatures: {} // { signer_1: '', .... }
  // }

  console.log('TODO: always redirect to transaction view page if there is only one transaction')
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
