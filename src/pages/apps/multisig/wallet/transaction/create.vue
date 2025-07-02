<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div class="static-container">
          <div id="app-container" :class="getDarkModeClass(darkMode)">
            <HeaderNav
              :title="$t('Send')"
              :backnavpath="`/apps/multisig/wallet/${route.params.address}`"
              class="q-px-sm apps-header gift-app-header"
            />
            <div class="row justify-center">
              <div class="col-xs-12 q-px-sm q-gutter-y-sm">
               <template v-if="multisigWallet && multisigTransaction">
                <q-form class="q-gutter-md">
                  <div class="q-gutter-y-sm">
                   <q-label class="text-bold">Select Asset</q-label>
                   <q-select
                    :options="assetOptions"
                    v-model="assetSelected"
                    hint="The asset to send"
                    outlined dense>
                   </q-select>
                  </div>

                  <div class="q-gutter-y-sm">
                   <q-label class="text-bold">Purpose</q-label>
                   <q-input
                    v-model="purpose"
                    hint="Friendly message for cosigner"
                    outlined dense>
                   </q-input>
                  </div>
                  <div class="q-gutter-y-sm">
                   <q-label class="text-bold">From</q-label>
                   <q-input :model-value="multisigWallet.template.name" readonly outlined dense >
                     <template v-slot:append>
                       <q-btn icon="content_copy"
                         @click="$copyText(getMultisigCashAddress({ ...multisigWallet, cashAddressNetworkPrefix }))"
                         no-capse dense flat
                       />
                     </template>
                   </q-input>
                  </div>
                  <div class="q-gutter-y-md">
                    <q-label class="text-bold">To</q-label>
                    <div v-for="(recipient, i) in recipients" :key="i" class="q-gutter-y-md">

                     <div class="flex justify-between items-center">
                        <span class="text-italic">Recipient {{ i + 1 }}</span>
                        <q-btn v-if="i > 0" @click="removeRecipient(i)" icon="remove" color="red" flat dense ></q-btn>
                     </div>
                     <q-input
                       v-model="recipient.address" :label="`Paste address of recipient ${i + 1}`"
                       outlined dense>
                     </q-input>
                     <q-input
                       v-model="recipient.amount" label="Amount"
                       outlined dense>
                     </q-input>
                   </div>
                   <div class="text-right">
                    <q-btn @click="addRecipient()" icon="add" color="primary" label="Add Recipient" flat dense no-caps></q-btn>
                   </div>
                  </div>
                </q-form>
               </template>
              </div>
            </div>
            <div class="q-my-lg q-mx-sm"> </div>
              <q-btn @click="createProposal" label="Create Proposal" color="primary"></q-btn>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch, onBeforeMount, onMounted, inject } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getMultisigCashAddress,
  initEmptyMultisigTransaction,
  getCompiler
} from 'src/lib/multisig'
import { commonUtxoToLibauthInput, selectUtxos } from 'src/utils/utxo-utils'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
import { cashAddressToLockingBytecode, encodeTransactionCommon, generateTransaction, getMinimumFee, hexToBin } from 'bitauth-libauth-v3'

const $store = useStore()
const $q = useQuasar()
const $copyText = inject('$copyText')
const route = useRoute()
const { t: $t } = useI18n()
const { cashAddressNetworkPrefix } = useMultisigHelpers()
const multisigWallet = ref()
const multisigTransaction = ref({ name: '' })
const assetSelected = ref('Bitcoin Cash')
const assetOptions = ref(['Bitcoin Cash'])
const assetDecimals = ref(8)
const purpose = ref('Send Bitcoin Cash')
const recipients = ref([])

const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const utxos = computed(() => {
  return structuredClone($store.getters['multisig/getWalletUtxos']({ address: route.params.address }))
})

const utxosLastUpdate = computed(() => {
  return utxos.value?.lastUpdate
})

const removeRecipient = (index) => {
  recipients.value.splice(index, 1)
}

const addRecipient = () => {
  recipients.value.push({
    address: '',
    amount: '0'
  })
}

const createProposal = () => {
  const sendAmount = recipients.value.reduce((amtAccumulator, nextRecipient) => {
    const amountNoDecimals = Math.floor(nextRecipient.amount * `1e${assetDecimals.value}`)
    amtAccumulator += BigInt(amountNoDecimals)
    return amtAccumulator
  }, 0n)

  let filterStrategy = 'bch-only'
  let tokenFilter = null
  const isSendingToken = assetSelected.value !== 'Bitcoin Cash'

  if (isSendingToken) {
    filterStrategy = 'token-only'
    tokenFilter = { category: assetSelected.value }
  }

  const options = {
    targetAmount: sendAmount,
    filterStrategy,
    sortStrategy: 'smallest',
    tokenFilter: tokenFilter
  }

  const selected = selectUtxos(utxos.value.utxos, options)
  console.log('selected', selected)
  // TODO: construct multisigTransaction proposal
  const template = multisigWallet.value.template
  const compiler = getCompiler({ template })
  const sampleEntityId = Object.keys(template.entities)[0]
  const sampleScriptId = template.entities[sampleEntityId].scripts.find((scriptId) => scriptId !== 'lock')
  const scenario = compiler.generateScenario({
    unlockingScriptId: sampleScriptId
  })
  const sampleUnlockingBytecode = scenario.program.transaction.inputs[0].unlockingBytecode
  const inputsFromSelectedUtxos = selected.selectedUtxos.map(u => {
    return commonUtxoToLibauthInput(u, sampleUnlockingBytecode)
  })
  scenario.program.transaction.inputs = inputsFromSelectedUtxos
  // ADD OUTPUTS
  const outputs = recipients.value.map((recipient) => {
    let valueSatoshis = BigInt(Math.floor(recipient.amount * `1e${assetDecimals.value}`))
    let token = null
    if (isSendingToken) {
      valueSatoshis = 1000n
      token = {
        category: hexToBin(assetSelected.value),
        amount: BigInt(recipient.amount)
      }
    }
    const output = {
      lockingBytecode: cashAddressToLockingBytecode(recipient.address).bytecode,
      valueSatoshis
    }
    if (token) {
      output.token = token
    }
    return output
  })

  scenario.program.transaction.outputs = outputs

  const generatedTransaction = generateTransaction(scenario.program.transaction)
  const estimatedTransactionSize = encodeTransactionCommon(generatedTransaction.transaction).length
  const minimumFee = getMinimumFee(BigInt(estimatedTransactionSize), 1000n)
  if (selected.total < sendAmount + minimumFee) {
    $q.dialog({ message: 'Insufficient Balance' })
  }

  console.log('TRANSACTION', scenario.program.transaction)
}

const updateAssetsOptions = (utxos) => {
  const options = new Set()
  utxos?.forEach((utxo) => {
    if (utxo?.token?.category && utxo.token?.amount && BigInt(utxo.token?.amount) > 0n) options.add(utxo.token.category)
  })
  assetOptions.value = ['Bitcoin Cash', ...Array.from(options)]
}

watch(utxosLastUpdate.value, () => {
  updateAssetsOptions(utxos.value?.utxos)
})

onBeforeMount(async () => {
  await $store.dispatch('multisig/fetchWalletUtxos', route.params.address)
})

onMounted(() => {
  multisigWallet.value = $store.getters['multisig/getWalletByAddress']({ address: route.params.address })
  multisigTransaction.value = initEmptyMultisigTransaction({
    userPrompt: `Send ${assetSelected.value}`, walletId: multisigWallet.value.id
  })
  addRecipient()
  updateAssetsOptions(utxos.value?.utxos)
})
</script>
