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
                    <q-list>
                      <q-item-label header>Source of funds</q-item-label>
                      <q-item v-for="input, i in psbct?.sourceOutputs" :key="`signature-request-in-${i}`">
                        <q-item-section>{{ input }}</q-item-section>
                      </q-item>
                      <q-separator spaced />
                      <q-item-label header>Recipients</q-item-label>
                      <q-item v-for="output, i in (psbct?.transaction?.outputs || [])" :key="`signature-request-out-${i}`">
                        <q-item-section>{{ output }}</q-item-section>
                      </q-item>
                    </q-list>
                </div>
                <div class="col-xs-12 col-md-8 text-right q-px-md q-gutter-y-md">
                  <q-btn label="Partially Sign Transaction" @click="partiallySignTransaction"></q-btn>
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
import { decodePrivateKeyWif } from 'bitauth-libauth-v3'
import HeaderNav from 'components/header-nav'
import FooterMenu from 'components/multisig/footer-menu.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadLibauthHdWallet } from '../../../wallet'
import { getLockingData } from '../../../lib/multisig'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const signatureRequest = ref()
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const psbct = ref()
const myXPubKey = ref()

const wallet = computed(() => {
  if (route.params?.address) {
    return $store.getters['multisig/getWallet']({ address: route.params.address })
  }
  return null
})

const isChipnet = computed(() => $store.getters['global/isChipnet'])

const extractTransactionData = (signatureRequest) => {
  const transaction = signatureRequest?.params?.request?.method?.params?.transaction
  const sourceOutputs = signatureRequest?.params?.request?.method?.params?.sourceOutputs
  return { transaction, sourceOutputs }
}

const resolveMyXPubKey = () => {
  const { xPubKey /* , derivationPath */ } = $store.getters['global/getWallet']('bch')
  myXPubKey.value = xPubKey
}

const getTransactionProposal = ({ transaction }) => {
  const transactionProposal = {
    locktime: transaction.locktime,
    version: transaction.version,
    outputs: transaction.outputs
  }
  return transactionProposal
}

const partiallySignTransaction = async ({ transactionProposal }) => {
  // const p2pkhWallet = await loadLibauthHdWallet(0, isChipnet.value)
  // const wif = p2pkhWallet.getPrivateKeyWifAt('0/0')
  // const decodedPrivkey = decodePrivateKeyWif(wif)
  // const transactionProposal = getTransactionProposal({ transaction: psbct.value.transaction })
  // const lockingData = getLockingData({ signers: wallet.value.signers })
  // // identify who we are
  //
}

onMounted(() => {
  resolveMyXPubKey()
  signatureRequest.value = $store.getters['multisig/getSignatureRequest']({ address: route.params.address })
  const { transaction, sourceOutputs } = extractTransactionData(signatureRequest.value)
  psbct.value = {
    transaction,
    sourceOutputs,
    wallet: wallet.value,
    partialSignatures: {} // { signer_1: '', .... }
  }
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
