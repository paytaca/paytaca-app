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
              <div class="col-xs-12 q-px-sm">
              <template v-if="multisigWallet">
                <q-form class="q-gutter-md">
                  <h6 style="margin-block-end: .5em; text-align: center" >
                  Bitcoin Cash <q-icon name="img:bitcoin-cash-circle.svg"/>
                  </h6>
                  <div class="q-gutter-y-sm">
                  <q-label class="text-bold">From</q-label>
                  <q-input :model-value="multisigWallet.template.name" readonly outlined dense bottom-slots>
                    <template v-slot:append>
                      <q-btn icon="content_copy"
                        @click="$copyText(getMultisigCashAddress({ ...multisigWallet, cashAddressNetworkPrefix }))"
                        no-capse dense flat
                      />
                    </template>
                    <template v-slot:hint>
                      <div class="text-bold" style="font-size: 1.2em;color: #0AC18E">Current Balance: {{ assetBalance }} BCH</div>
                    </template>

                  </q-input>
                  </div>
                  <div class="q-gutter-y-sm">
                    <q-label class="text-bold">Purpose</q-label>
                    <q-input
                      v-model="purpose"
                      hint="Friendly message for cosigner"
                      outlined dense>
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
            <q-btn :loading="loading" @click="createProposal" class="q-mt-lg" label="Create Proposal" color="primary">
              <template v-slot:loading>
                <div class="flex flex-nowrap items-center">
                   <span v-if="loading">Preparing Proposal</span>
                   <q-spinner-facebook v-if="loading" class="on-right"></q-spinner-facebook>
                </div>
              </template>
            </q-btn>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>

import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { computed, ref, onBeforeMount, onMounted, inject, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import Big from 'big.js'
import {
  cashAddressToLockingBytecode,
  encodeTransactionCommon,
  generateTransaction,
  getMinimumFee,
  isDustOutput,
  hexToBin
} from 'bitauth-libauth-v3'

import Watchtower from 'src/lib/watchtower'
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import {
  getMultisigCashAddress,
  getCompiler,
  getLockingBytecode,
  generateTempProposalId,
  generateTransactionHash,
  attachSourceOutputsToInputs
} from 'src/lib/multisig'
import { commonUtxoToLibauthInput, commonUtxoToLibauthOutput, selectUtxos } from 'src/utils/utxo-utils'
import { useMultisigHelpers } from 'src/composables/multisig/helpers'
const $store = useStore()
const $q = useQuasar()
const $copyText = inject('$copyText')
const router = useRouter()
const route = useRoute()
const { t: $t } = useI18n()
const { cashAddressNetworkPrefix } = useMultisigHelpers()
const multisigWallet = ref()
const assetDecimals = ref(8)
const assetBalance = ref()
const purpose = ref('Send Bitcoin Cash')
const recipients = ref([])
const watchtower = ref()
const loading = ref(false)
const darkMode = computed(() => {
  return $store.getters['darkmode/getStatus']
})

const utxos = computed(() => {
  return structuredClone(
    $store.getters['multisig/getWalletUtxos']({ address: route.params.address })
  )
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

const createProposal = async () => {
  loading.value = true
  await $store.dispatch('multisig/fetchWalletUtxos', route.params.address)
  const sendAmount = recipients.value.reduce((amtAccumulator, nextRecipient) => {
    const amountNoDecimals = Big(nextRecipient.amount).mul(`1e${assetDecimals.value}`).toNumber()
    amtAccumulator += BigInt(amountNoDecimals)
    return amtAccumulator
  }, 0n)

  const selectUtxosOptions = {
    targetAmount: sendAmount,
    filterStrategy: 'bch-only',
    sortStrategy: 'smallest'
  }
  const selected = selectUtxos(utxos.value.utxos, selectUtxosOptions)
  // Construct inputs
  const inputs = selected.selectedUtxos
  // Construct outputs
  const outputs = recipients.value.map((recipient) => {
    const valueSatoshis = BigInt(Big(recipient.amount).mul(`1e${assetDecimals.value}`))
    const output = {
      lockingBytecode: cashAddressToLockingBytecode(recipient.address).bytecode,
      valueSatoshis
    }
    return output
  })

  // Estimate fee
  const template = multisigWallet.value.template
  const compiler = getCompiler({ template })
  const sampleEntityId = Object.keys(template.entities)[0]
  const sampleScriptId = template.entities[sampleEntityId].scripts.find((scriptId) => scriptId !== 'lock')
  const scenario = compiler.generateScenario({
    unlockingScriptId: sampleScriptId
  })

  const unlockingBytecode = scenario.program.transaction.inputs[0].unlockingBytecode

  const changeOutput = {
    lockingBytecode: getLockingBytecode(multisigWallet.value).bytecode,
    valueSatoshis: selected.total - sendAmount // Temp value, tx fee not yet accounted for, will just be used for scenario
  }

  scenario.program.transaction.inputs = inputs.map(u => commonUtxoToLibauthInput(u, unlockingBytecode))
  scenario.program.transaction.outputs = [...outputs, changeOutput]

  if (!isDustOutput(changeOutput)) {
    scenario.program.transaction.outputs.push(changeOutput)
  }

  const dustRelayFeeSatPerKb = 1100n // 1.1 per byte
  const transactionForFeeEstimation = generateTransaction(scenario.program.transaction)
  const estimatedTransactionSize = encodeTransactionCommon(transactionForFeeEstimation.transaction).length
  console.log('Transaction Size', estimatedTransactionSize)
  const minimumFee = getMinimumFee(BigInt(estimatedTransactionSize), dustRelayFeeSatPerKb)

  // selectWithFee
  selectUtxosOptions.targetAmount = sendAmount + minimumFee
  const finalSelected = selectUtxos(utxos.value.utxos, selectUtxosOptions)
  const finalInputs = finalSelected.selectedUtxos.map(u => commonUtxoToLibauthInput(u, [])) // without unlocking bytecode
  const finalChangeOutput = {
    lockingBytecode: getLockingBytecode(multisigWallet.value).bytecode,
    valueSatoshis: finalSelected.total - sendAmount - minimumFee
  }

  if (!isDustOutput(finalChangeOutput)) {
    outputs.push(finalChangeOutput)
  }

  const finalTransaction = {
    locktime: 0,
    version: 2,
    inputs: finalInputs,
    outputs: outputs
  }

  console.log('Final utxo selections', finalSelected)
  if (finalSelected.total < sendAmount + minimumFee) {
    $q.dialog({ message: 'Insufficient Balance' })
  }

  const sourceOutputs =
    finalSelected.selectedUtxos
      .map(u => {
        const utxo = commonUtxoToLibauthOutput(u)
        return {
          ...utxo,
          lockingBytecode: finalChangeOutput.lockingBytecode,
          outpointTransactionHash: hexToBin(u.txid),
          outpointIndex: Number(u.vout)
        }
      })

  const multisigTransaction = {
    origin: 'paytaca',
    purpose: purpose.value,
    transaction: finalTransaction,
    sourceOutputs,
    addressIndex: multisigWallet.value.lockingData.hdKeys.addressIndex,
    address: route.params.address
  }

  attachSourceOutputsToInputs(multisigTransaction)
  await $store.dispatch('multisig/createTransaction', { multisigWallet: multisigWallet.value, multisigTransaction })
  loading.value = false
  router.push({
    name: 'app-multisig-wallet-transaction-view',
    params: {
      address: route.params.address,
      hash: generateTransactionHash(multisigTransaction)
    }
  })
}

onMounted(async () => {
  try {
  loading.value = true
  watchtower.value = new Watchtower($store.getters['global/isChipnet'])
  const response = await watchtower.value.getAddressBchBalance(route.params.address)
  if (response.data) {
    assetBalance.value = response.data.balance
  }
  multisigWallet.value = $store.getters['multisig/getWalletByAddress']({ address: route.params.address })
  addRecipient()
  $store.dispatch('multisig/fetchWalletUtxos', route.params.address)
 }
 catch(e) { console.log(e) }
 finally { loading.value = false }
})
</script>
