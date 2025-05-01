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
                    class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
                    v-if="pst"
                    flat
                    >
                    <q-card-section>
                      Transaction Details
                      <div class="row items-center no-wrap">
                        <div class="col">
                          <div class="text-h5">Transaction Details</div>
                          <div class="text-subtitle2"> Prompt: {{ pst.desc?.prompt }}</div>
                          <div class="text-subtitle2">Origin: {{ pst.desc?.origin }}</div>
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-section>
                      {{ pst.transaction }}
                    </q-card-section>
                    <q-card-section>
                      <div>Spend Summary</div>
                      {{ spendSummary(pst.transaction) }}
                    </q-card-section>
                    <q-separator />
                    <q-card-section>
                      <div>Number of recipients: {{ pst.outputs.length }}</div>
                    </q-card-section>
                    <q-card-section>
                      <div>
                        Required Signatures: {{ pst.m }} of {{ pst.n }}
                      </div>
                    </q-card-section>
                    <q-separator />
                    <q-card-section v-if="Object.keys(pst?.signatures || {}).length > 0">
                      {{ pst.signatures }}
                    </q-card-section>
                    <q-separator />
                    <q-list>
                      <q-item v-for="signerEntityIndex in Object.keys(wallet.signers)" :key="signerEntityIndex">
                        <q-item-section>{{ wallet.signers[signerEntityIndex].name || `Signer ${signerEntityIndex}` }}</q-item-section>
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
                      <!-- <q-btn @click="partiallySignTransaction({ xprv: wallet.signers[signerEntityIndex].xprv })">Partially Sign</q-btn> -->
                      <q-btn @click="deletePst">Delete PSt</q-btn>
                      <q-btn icon="download" label="Download PST File" @click="downloadPstFile"/>
                      <q-btn icon="download" label="Check if Sigs Complete" @click="() => pst.checkIfSignaturesAreComplete()"/>
                      <q-btn v-if="!pst.isSignaturesComplete" label="Sign" @click="partiallySignTransaction"></q-btn>
                      <q-btn v-else label="Submit Transaction" @click="finalizeAndSubmitTransaction"></q-btn>
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
import { useQuasar } from 'quasar'
const $q = useQuasar()
import { computed, onBeforeMount, ref, onMounted, toValue } from 'vue'
import { useRoute } from 'vue-router'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { Pst, MultisigWallet } from 'src/lib/multisig'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import Watchtower from 'src/lib/watchtower'

const $store = useStore()
const { t: $t } = useI18n()
const route = useRoute()
const { getSignerXPrv } = useMultisigHelpers()

const wallet = ref()
const pst = ref()

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

const partiallySignTransaction = async ({ signerEntityIndex, xprv }) => {
  if (!wallet.value) return
  // const walletObject = $store.getters['multisig/getWallet']({ address: route.params.address })
  // const wallet = MultisigWallet.createInstanceFromObject(walletObject)
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
}

const deletePst = () => {
  $store.dispatch('multisig/deletePstById', { id: route.params.id })
}

const downloadPstFile = () => {
  $q.dialog({
    title: 'Enter filename',
    message: '',
    prompt: {
      type: 'text',
      placeholder: 'Mypstfile'
    }
  }).onOk((filename) => {
    if (!filename) return
    const data = pst.value.toBase64()
    const blob = new Blob([data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.ppst`
    document.body.appendChild(a)
    a.click()
  }).onCancel(() => {})
}

const finalizeAndSubmitTransaction = async () => {
  const compilationResult = pst.value.finalize()
  if (compilationResult.success) {
    // TODO: REMOVE, THIS SHOULD BE DONE DURING WALLET CREATION
    const watchtower = new Watchtower($store.getters['global/isChipnet'])
    await watchtower.subscribe({ address: pst.value.address })
    const response = await watchtower.broadcastTx(pst.value.signedTransaction)
    console.log('🚀 ~ finalizeAndSubmitTransaction ~ response:', response)
    if (response.success) {
      pst.value.txid = response.txid
      pst.value.save((pstValue) => $store.dispatch('multisig/savePst', pstValue))
    }
    // TODO: SHOW RESPONSE
  }
}

onBeforeMount(async () => {
  if (route.params?.address) {
    const multisigWallet = MultisigWallet.createInstanceFromObject(
      toValue($store.getters['multisig/getWallet']({ address: route.params.address }))
    )
    await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
    wallet.value = multisigWallet
  }
})

onMounted(async () => {
  // if (route.params?.address) {
  //   const multisigWallet = MultisigWallet.createInstanceFromObject(
  //     $store.getters['multisig/getWallet']({ address: route.params.address })
  //   )
  //   await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
  //   wallet.value = multisigWallet
  // }
  const multisigWallet = MultisigWallet.createInstanceFromObject(
    $store.getters['multisig/getWallet']({ address: route.params.address })
  )
  await multisigWallet.loadSignerXprivateKeys(getSignerXPrv)
  wallet.value = multisigWallet
  // console.log('WALLET', wallet.value)
  // const prompt = transactionData?.value?.sessionRequest?.params?.request?.params?.userPrompt
  // const origin = transactionData?.value?.sessionRequest?.verifyContext?.verified?.verifyUrl
  // pst.value = new Pst({
  //   lockingData: wallet.value.lockingData,
  //   network: wallet.value.network
  // })

  const id = route.params.id
  const pstFromStore = $store.getters['multisig/getPstById']({ id })
  console.log('🚀 ~ onMounted ~ pstFromStore:', pstFromStore)
  if (pstFromStore) {
    pst.value = Pst.createInstanceFromObject(pstFromStore)
    pst.value.setTemplate(wallet.value.template)
    console.log('🚀 ~ onMounted ~ pst:', pst.value)
  }
  // const creator = identifyPossiblePstCreator({ signers: wallet.value.signers })
  // console.log('TRANSACTION DATA', transactionData.value.transaction)
  // pst.value
  //   .setTemplate(wallet.value.template)
  //   .setTransaction(transactionData.value.transaction)
  //   .setSourceOutputs(transactionData.value.sourceOutputs)
  //   .setDesc({ prompt, origin, creator, wallet: 'Paytaca' })
})

</script>

<style scoped>
.light {
  color: #141414;
}
</style>
