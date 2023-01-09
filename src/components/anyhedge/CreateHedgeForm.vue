<template>
  <q-form @submit="createHedgePosition()" class="q-gutter-y-md" ref="form" @validation-error="alertError">
    <q-banner v-if="errors.length > 0 || mainError" dense rounded class="text-white bg-red q-my-sm">
      <div v-if="mainError" class="q-px-sm q-mt-xs">
        {{ mainError }}
      </div>
      <div v-if="errors?.length" class="q-ma-sm q-pa-sm rounded-borders">
        <div v-for="(error, index) in errors" :key="index" style="word-break:break-word;" class="text-caption">
          [{{index + 1}}] {{ error }}
        </div>
      </div>
      <!-- <ul class="q-pl-sm">
        <li v-for="(error, index) in errors" :key="index" style="word-break:break-word;" class="text-caption">
          {{ error }}
        </li>
      </ul> -->
    </q-banner>

    <div class="row items-center">
      <div class="q-space">
        <div v-if="createHedgeForm.selectedAsset?.latestPrice?.priceValue">
          Current price:
          {{ createHedgeForm.selectedAsset.latestPrice.priceValue / 10 ** (createHedgeForm.selectedAsset.assetDecimals || 0) }}
          <template v-if="createHedgeForm.selectedAsset?.assetCurrency">
            {{ createHedgeForm.selectedAsset.assetCurrency }} / BCH
          </template>
          <q-icon :color="darkMode ? 'grey-7' : 'black'" size="sm" name="info">
          </q-icon>
          <q-popup-proxy :breakpoint="0">
            <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']">
              <div class="q-py-xs">
                <div class="text-caption text-grey" style="margin-bottom:-0.5em">Asset Name</div>
                <span>
                  {{ createHedgeForm.selectedAsset?.assetName }}
                </span>
              </div>
              <div
                class="q-py-xs"
                style="position:relative;"
                v-ripple
                @click="copyText(createHedgeForm.selectedAsset?.oraclePubkey)"
              >
                <div class="text-caption text-grey" style="margin-bottom:-0.5em">Oracle Pubkey</div>
                <span class="row items-center no-wrap">
                  {{ ellipsisText(createHedgeForm.selectedAsset?.oraclePubkey, { start: 10, end: 10 }) }}
                  <q-icon name="content_copy" class="q-ml-xs"/>
                </span>
              </div>
              <div v-if="Number.isFinite(createHedgeForm.selectedAsset?.latestPrice?.messageTimestamp)" class="q-py-xs">
                <div class="text-caption text-grey" style="margin-bottom:-0.5em">Price timestamp</div>
                <span>
                  {{ formatTimestampToText(createHedgeForm.selectedAsset?.latestPrice?.messageTimestamp * 1000) }}
                </span>
              </div>
            </div>
          </q-popup-proxy>
        </div>
        <div v-if="spendableBch !== null">
          Balance:
          <q-btn
            flat padding="xs"
            :text-color="darkMode ? 'blue' : 'brandblue'"
            :label="`${spendableBch} BCH`"
            :disable="loading"
            @click="createHedgeForm.amount = spendableBch"
          />
        </div>
      </div>
      <q-btn
        round
        color="brandblue"
        icon="refresh"
        class="q-mx-xs"
        padding="xs"
        @click="clearCreateHedgeForm({ clearErrors: true })"
      />
    </div>
    <div v-if="position === 'long'" class="row items-center q-gutter-x-sm">
      <span>Approx hedge amount: {{ createHedgeFormMetadata.intentAmountBCH }} BCH</span>
      <q-icon
        :color="darkMode ? 'grey-7' : 'black'"
        size="sm"
        name="help"
      >
        <q-popup-proxy :breakpoint="0">
          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']" class="text-caption">
            Hedge amount is calculated from long amount below & low liquidation percentage below
          </div>
        </q-popup-proxy>
      </q-icon>
    </div>
    <div class="row no-wrap q-gutter-x-sm">
      <q-input
        :dark="darkMode"
        outlined
        dense
        label="Amount"
        suffix="BCH"
        :disable="loading"
        inputmode="decimal"
        v-model="createHedgeForm.amount"
        reactive-rules
        :rules="[
          val => val > 0 || 'Invalid amount',
          val => spendableBch === null || val <= spendableBch || `Exceeding balance ${spendableBch} BCH`,
          val => val >= createHedgeFormConstraints.minimumAmount || `Liquidity requires at least ${createHedgeFormConstraints.minimumAmount} BCH`,
          val => val <= createHedgeFormConstraints.maximumAmount || `Liquidity requires at most ${createHedgeFormConstraints.maximumAmount} BCH`,
        ]"
        class="q-space"
      >
        <template v-slot:hint>
          <div v-if="createHedgeFormMetadata.nominalAmount" class="text-caption text-grey">
            {{ createHedgeFormMetadata.nominalAmount }} {{ createHedgeForm.selectedAsset?.assetCurrency }}
          </div>
        </template>
      </q-input>
      <q-select
        :dark="darkMode"
        outlined
        dense
        label="Asset"
        :options="oracles"
        map-options
        option-value="oraclePubkey"
        option-label="assetName"
        :disable="loading"
        v-model="createHedgeForm.selectedAsset"
        :popup-content-class="darkMode ? '': 'text-black'"
        reactive-rules
        :rules="[
          val => Boolean(!createHedgeForm.autoMatch || createHedgeForm.autoMatchPoolTarget !== 'anyhedge_LP' || val?.oraclePubkey ) || 'Required'
        ]"
      />
    </div>
    <DurationField
      :dark="darkMode"
      outlined
      dense
      label="Duration"
      v-model="createHedgeForm.duration"
      :disable="loading"
      reactive-rules
      :rules="[
        val => val >= 0 || 'Invalid duration',
        (val, units, formatValue) => val >= createHedgeFormConstraints.minimumDuration || `Must at least be ${formatValue(createHedgeFormConstraints.minimumDuration)}`,
        (val, units, formatValue) => val <= createHedgeFormConstraints.maximumDuration || `Must at most be ${formatValue(createHedgeFormConstraints.maximumDuration)}`,
      ]"
    />
    <div class="row no-wrap q-gutter-x-sm">
      <q-input
        :dark="darkMode"
        outlined
        dense
        label="Low"
        suffix="%"
        :disable="loading"
        inputmode="numeric"
        v-model="createHedgeForm.lowLiquidationMultiplierPctg"
        reactive-rules
        :rules="[
          val => val/100 >= createHedgeFormConstraints.minimumLiquidationLimit || `Must be at least ${createHedgeFormConstraints.minimumLiquidationLimit * 100}%`,
          val => val/100 <= createHedgeFormConstraints.maximumLiquidationLimit || `Must be at most ${createHedgeFormConstraints.maximumLiquidationLimit * 100}%`,
        ]"
      >
        <template v-slot:hint>
          <div v-if="createHedgeFormMetadata.lowLiquidationPrice" class="text-caption text-grey">
            {{ createHedgeFormMetadata.lowLiquidationPrice }} {{ createHedgeForm.selectedAsset?.assetCurrency }} / BCH
          </div>
        </template>
      </q-input>
      <q-input
        :dark="darkMode"
        outlined
        dense
        label="High"
        suffix="%"
        :disable="loading"
        inputmode="numeric"
        v-model="createHedgeForm.highLiquidationMultiplierPctg"
        :rules="[
          val => (val > 100) || 'Must be greater than 100%',
          val => (val <= 1000) || 'Must not be higher than 1000%'
        ]"
      >
        <template v-slot:hint>
          <div v-if="createHedgeFormMetadata.highLiquidationPrice" class="text-caption text-grey">
            {{ createHedgeFormMetadata.highLiquidationPrice }} {{ createHedgeForm.selectedAsset?.assetCurrency }} / BCH
          </div>
        </template>
      </q-input>
    </div>

    <!-- <div class="row q-gutter-x-md items-center">
      <q-toggle
        :dark="darkMode"
        label="Match to liquidity pool"
        disable
        v-model="createHedgeForm.autoMatch"
      />
      <q-icon
        :color="darkMode ? 'grey-7' : 'black'"
        size="sm"
        name="help"
      >
        <q-popup-proxy :breakpoint="0">
          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']" class="text-caption">
            Disabling will create a hedge position offer instead
          </div>
        </q-popup-proxy>
      </q-icon>
    </div> -->
    <q-slide-transition>
      <div v-if="createHedgeForm.autoMatch">
        <div :class="darkMode ? 'text-white' : 'text-grey-7'">Liquidity Pool</div>
        <q-btn-toggle
          :dark="darkMode"
          no-caps
          label="Liquidity Pool"
          :disable="loading"
          v-model="createHedgeForm.autoMatchPoolTarget"
          :options="[
            {label: 'General Protocol LP', value: 'anyhedge_LP'},
            {label: 'Paytaca (P2P)', value: 'watchtower_P2P' },
          ]"
        />
      </div>
    </q-slide-transition>

    <div class="q-gutter-y-md">
      <div v-if="loading" class="text-center">
        {{ loadingMsg }}
      </div>
      <q-btn
        no-caps
        :loading="loading"
        :disable="loading"
        label="Create"
        type="submit"
        color="brandblue"
        class="full-width"
      />
      <q-btn
        no-caps
        outline
        :loading="loading"
        :disable="loading"
        label="Cancel"
        color="grey"
        class="full-width"
        @click="$emit('cancel')"
      />

    </div>
  </q-form>
</template>
<script setup>
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend';
import { parseHedgePositionData, parseHedgePositionOffer, ellipsisText, formatTimestampToText } from '../../wallet/anyhedge/formatters'
import { calculateGeneralProtocolsLPFee, createFundingProposal } from '../../wallet/anyhedge/funding'
import { Wallet } from 'src/wallet';
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import { useStore } from 'vuex'
import { useQuasar } from 'quasar';
import HedgePositionOfferSelectionDialog from './HedgePositionOfferSelectionDialog.vue';
import CreateHedgeConfirmDialog from './CreateHedgeConfirmDialog.vue';
import SecurityCheckDialog from '../SecurityCheckDialog.vue';
import DurationField from './DurationField.vue';

function alertError(...args) {
  console.error('form error', args)
}

// misc
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const $emit = defineEmits(['created', 'cancel'])

const $copyText = inject('$copyText')
function copyText(value, message='') {
  $copyText(value)
  $q.notify({
    color: 'blue-9',
    message: message || 'Copied to clipboard',
    icon: 'mdi-clipboard-check',
    timeout: 200
  })
}

const props = defineProps({
  wallet: Wallet,
  position: {
    type: String,
    default: 'hedge',
    validator(value) {
      // The value must match one of these strings
      return ['hedge', 'long'].includes(value)
    }
  }
})

async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

const oracles = computed(() => {
  const oracles = $store.getters['anyhedge/oracles']
  const parsedOracles = Object.getOwnPropertyNames(oracles)
    .map(oraclePubkey => {
      if (!oracles?.[oraclePubkey]) return
      
      return Object.assign({ oraclePubkey }, oracles[oraclePubkey])
    })
    .filter(Boolean)
    .filter(oracle => oracle?.oraclePubkey)
    // parsedOracles.unshift({
    //   oraclePubkey: '',
    //   assetName: 'Auto',
    // })

    return parsedOracles
})

const createHedgeForm = ref({
  amount: 0.0,
  duration: 4 * 3600,
  lowLiquidationMultiplierPctg: 0.8 * 100,
  highLiquidationMultiplierPctg: 5 * 100,
  selectedAsset: oracles.value[0],

  autoMatch: true,
  autoMatchPoolTarget: 'anyhedge_LP',
})
const createHedgeFormMetadata = computed(() => {
  const data = {
    nominalAmount: 0, longNominalAmount: 0,
    lowLiquidationPrice: 0, highLiquidationPrice: 0,
    intentAmountBCH: 0,
    longAmountBCH: 0,
  }

  // const priceValue = 13049
  const priceValue = createHedgeForm.value?.selectedAsset?.latestPrice?.priceValue
  const decimalsMultiplier = 10 ** createHedgeForm.value?.selectedAsset?.assetDecimals
  const assetPrice = priceValue / decimalsMultiplier

  if (assetPrice) {
    data.nominalAmount = Math.round(priceValue * createHedgeForm.value.amount) / decimalsMultiplier
    data.lowLiquidationPrice = Math.round(assetPrice * createHedgeForm.value.lowLiquidationMultiplierPctg) / 100
    data.highLiquidationPrice = Math.round(assetPrice * createHedgeForm.value.highLiquidationMultiplierPctg) / 100
    
    const totalBch = data.nominalAmount / data.lowLiquidationPrice
    const longBch = totalBch - createHedgeForm.value.amount
    const longNominalUnits = Math.round(longBch * priceValue) / decimalsMultiplier

    // const totalNominalAmountMult = 100 / createHedgeForm.value.lowLiquidationMultiplierPctg
    // const totalNominalAmount = data.nominalAmount * totalNominalAmountMult
    data.couterPartyNominalAmount = longNominalUnits
  }

  if (props?.position === 'long') {
    const lowPriceMult = createHedgeForm.value.lowLiquidationMultiplierPctg / 100
    const amount = createHedgeForm.value.amount
    data.intentAmountBCH = amount / (1/lowPriceMult - 1)
    data.intentAmountBCH = Math.round(data.intentAmountBCH * 10 ** 8) / 10 ** 8
    data.longAmountBCH = Math.round(amount * 10 ** 8) / 10 ** 8
  } else {
    data.intentAmountBCH = createHedgeForm.value.amount
    const totalSats = Math.round(data.nominalAmount / data.lowLiquidationPrice * 10 ** 8)
    data.longAmountBCH = Math.round(totalSats - (data.intentAmountBCH * 10 ** 8)) / 10 ** 8
  }

  return data
})

const spendableBch = computed(() => {
  const asset = $store.getters['assets/getAsset']?.('bch')
  const balance = asset?.[0]?.spendable
  if (!isFinite(balance)) return null
  return balance
})

const balanceUpdateInterval = ref(null)
onMounted(() => {
  clearInterval(balanceUpdateInterval.value)
  balanceUpdateInterval.value = setInterval(() => updateSpendableBalance(), 60 * 1000)
  updateSpendableBalance()
})
onUnmounted(() => clearInterval(balanceUpdateInterval.value))
async function updateSpendableBalance() {
  const response = await props.wallet?.BCH?.getBalance()
  $store.commit('assets/updateAssetBalance', {
    id: 'bch',
    balance: response.balance,
    spendable: response.spendable
  })
}

const form = ref(null)
async function clearCreateHedgeForm(opts) {
  createHedgeForm.value.amount = 0
  createHedgeForm.value.duration = 0
  createHedgeForm.value.lowLiquidationMultiplierPctg = 0.8 * 100
  createHedgeForm.value.highLiquidationMultiplierPctg = 5 * 100
  createHedgeForm.value.selectedAsset = oracles.value[0]
  createHedgeForm.value.autoMatch = true
  createHedgeForm.value.autoMatchPoolTarget = 'anyhedge_LP'

  if (opts?.clearErrors) {
    mainError.value = ''
    errors.value = []
  }

  await nextTick()
  form.value.resetValidation()
}

const liquidityServiceInfo = computed(() => $store.getters['anyhedge/liquidityServiceInfo'])
const createHedgeFormConstraints = computed(() => {
  const data = {
    minimumNominalUnits: 0,
    maximumNominalUnits: Infinity,
    minimumDuration: 0,
    maximumDuration: Infinity,
    minimumLiquidationLimit: 0,
    maximumLiquidationLimit: Infinity,
    minimumAmount: 0,
    maximumAmount: Infinity
  }

  const { autoMatch, autoMatchPoolTarget, selectedAsset } = createHedgeForm.value
  if (autoMatch && autoMatchPoolTarget === 'anyhedge_LP' && selectedAsset) {
    const constraints = liquidityServiceInfo.value?.liquidityParameters?.[selectedAsset?.oraclePubkey]?.[props.position == 'hedge' ? 'long' : 'hedge']
    if (constraints) Object.assign(data, constraints)

    const priceValue = selectedAsset?.latestPrice?.priceValue
    if (priceValue) {
      data.minimumAmount = Math.round(data.minimumNominalUnits * 10**8 / priceValue) / 10 ** 8
      data.maximumAmount = Math.round(data.maximumNominalUnits * 10**8 / priceValue) / 10 ** 8
    }
  }

  return data
})

const loading = ref(false)
const loadingMsg = ref('')
const mainError = ref('')
const errors = ref([])

async function getAddressesFromStore() {
  const response = { success: false, addressSet: { change: '', receiving: '', pubkey: '', index: 0, privateKey: '' } }
  try {
    const bchWalletInfo = $store.getters['global/getWallet']('bch')
    if (bchWalletInfo) {
      const { lastAddress, lastChangeAddress, lastAddressIndex } = bchWalletInfo
      if (lastAddress && lastChangeAddress && lastAddressIndex >= 0 ) {
        response.addressSet.receiving = lastAddress
        response.addressSet.change = lastChangeAddress
        response.addressSet.pubkey = await props.wallet.BCH.getPublicKey(`0/${lastAddressIndex}`)
        response.addressSet.index = lastAddressIndex
        response.addressSet.privateKey = await props.wallet.BCH.getPrivateKey(`0/${lastAddressIndex}`)
        response.success = true
      }
    }
  } catch(error) {
    console.error(error)
  }

  return response
}
onMounted(() => window.a = getAddressesFromStore)

async function getAddresses() {
  const response = { success: false, error: null, addressSet: { change: '', receiving: '', pubkey: '', index: 0, privateKey: ''} }
  try {
    loadingMsg.value = 'Generating receiving address'
    loading.value = true

    const getAddressesFromStoreResponse = await getAddressesFromStore()
    if (getAddressesFromStoreResponse.success) {
      response.addressSet = getAddressesFromStoreResponse.addressSet
      response.success = true
      return response
    }

    const addressIndex = 0
    let addressSet = await props.wallet.BCH.getNewAddressSet(addressIndex)
    if (!addressSet?.receiving) throw new Error('Expected receiving address')
    response.addressSet = addressSet
    response.addressSet.index = addressIndex
    response.addressSet.privateKey = await props.wallet.BCH.getPrivateKey(`0/${addressIndex}`)
    response.addressSet.pubkey = await props.wallet.BCH.getPublicKey(`0/${addressIndex}`)
    response.success = true
    return response
  } catch(error) {
    mainError.value = 'Error generating addresses'
    errors.value = []
    response.error = error
    response.success = false
    return response
  } finally {
    loadingMsg.value = ''
    loading.value = false
  }
}

async function createHedgePosition() {
  console.log('creating hedge position')
  // retrieve addresses
  const getAddressesResponse = await getAddresses()
  if (!getAddressesResponse?.success) return
  const { addressSet } = getAddressesResponse

  // return console.log(getAddressesResponse)

  // hold data in case the source value changes while the whole process ingoing
  const position = props.position
   
  // grouping data
  const intent = {
    amount: createHedgeFormMetadata.value.intentAmountBCH,
    longAmountBCH: createHedgeFormMetadata.value.longAmountBCH,
    lowPriceMult: createHedgeForm.value.lowLiquidationMultiplierPctg / 100,
    highPriceMult: createHedgeForm.value.highLiquidationMultiplierPctg / 100,
    duration: createHedgeForm.value.duration,
  }

  const pubkeys = {
    hedgeAddress:     position === 'hedge' ? addressSet.receiving : undefined,
    hedgePubkey:      position === 'hedge' ? addressSet.pubkey : undefined,
    hedgeAddressPath: position === 'hedge' ? `0/${addressSet.index}` : undefined,

    longAddress:      position === 'long' ? addressSet.receiving : undefined,
    longPubkey:       position === 'long' ? addressSet.pubkey : undefined,
    longAddressPath:  position === 'long' ? `0/${addressSet.index}` : undefined,
  }

  const misc = {
    walletHash: props.wallet.BCH.getWalletHash(),
    autoMatch: createHedgeForm.value.autoMatch,
    autoMatchPoolTarget: createHedgeForm.value.autoMatchPoolTarget,
    // necessary when using settlement service, they serve as credentials to gain access to the contract
    accessKeys: { publicKey: '', signature: '', authenticationToken: '' },

    // for p2p
    matchedHedgePositionOffer: parseHedgePositionOffer(null),
    isPositionOffer: false,
  }

  // for p2p
  const cancelAcceptedPositionOffer = () => {
    if (misc?.matchedHedgePositionOffer?.id) {
      anyhedgeBackend.post(`anyhedge/hedge-position-offers/${misc.matchedHedgePositionOffer.id}/cancel_accept_offer/`)
    }
  }

  const priceData = { oraclePubkey: '', priceValue: 0, messageTimestamp: 0, messageSequence: 0 }
  const oracleInfo = { oraclePubkey: '', assetName: '', assetDecimals: 0, assetCurrency: '' }
  if (createHedgeForm.value.selectedAsset?.oraclePubkey) {
    Object.assign(oracleInfo, createHedgeForm.value.selectedAsset)
    priceData.oraclePubkey = createHedgeForm.value.selectedAsset.oraclePubkey
    priceData.priceValue = createHedgeForm.value.selectedAsset?.latestPrice?.priceValue
    priceData.messageTimestamp = createHedgeForm.value.selectedAsset?.latestPrice?.messageTimestamp
    priceData.messageSequence = createHedgeForm.value.selectedAsset?.latestPrice?.messageSequence
  }

  const funding = {
    prepareFunding: false,
    positionTaker: position,
    contractCreationParams: {
      address: '',
      version: '',  
    },
    liquidityFee: 0,
    fee: { satoshis: 0, address: '' },
    fundingProposal: {
      txHash: '',
      txIndex: 0,
      txValue: 0,
      scriptSig: '',
      pubkey: '',
      inputTxHashes: [],
    },
    contractData: {},
  }

  // calculating fees
  if (misc.autoMatchPoolTarget === 'anyhedge_LP') {
    try {
      loading.value = true
      loadingMsg.value = 'Calculating contract fees'
      const generalProtocolsLPFeeResponse = await calculateGeneralProtocolsLPFee(
        intent, pubkeys, priceData, liquidityServiceInfo.value, addressSet.privateKey, position,
      )
      if(!generalProtocolsLPFeeResponse?.success) throw generalProtocolsLPFeeResponse

      misc.accessKeys.publicKey = generalProtocolsLPFeeResponse.accessKeys.publicKey
      misc.accessKeys.signature = generalProtocolsLPFeeResponse.accessKeys.signature
      misc.accessKeys.authenticationToken = generalProtocolsLPFeeResponse.accessKeys.authenticationToken
      if (position === 'hedge') {
        pubkeys.longAddress = generalProtocolsLPFeeResponse.contractData.metadata.longAddress
        pubkeys.longPubkey = generalProtocolsLPFeeResponse.contractData.metadata.longPublicKey
      } else if (position === 'long') {
        pubkeys.hedgeAddress = generalProtocolsLPFeeResponse.contractData.metadata.hedgeAddress
        pubkeys.hedgePubkey = generalProtocolsLPFeeResponse.contractData.metadata.hedgePublicKey
      }

      const fee = generalProtocolsLPFeeResponse.contractData?.fee
      if (fee?.satoshis && fee?.address) {
        funding.fee.satoshis = generalProtocolsLPFeeResponse.contractData.fee.satoshis
        funding.fee.address = generalProtocolsLPFeeResponse.contractData.fee.address
      }

      if (generalProtocolsLPFeeResponse?.liquidityFee?.fee) {
        funding.liquidityFee = generalProtocolsLPFeeResponse.liquidityFee.fee
      }
      funding.prepareFunding = true
    } catch(error) {
      console.error(error)
      mainError.value = 'Error calculating contract fees'

      if (error?.error?.name === 'PrepareContractPositionError')
        mainError.value = 'Encountered error in preparing contract position'
      if (error?.error?.name === 'ContractCompileError')
        mainError.value = 'Encountered error in compiling contract'
      if (error?.error?.name === 'ContractProposalError')
        mainError.value = 'Encountered error in contract proposal'
      if (error?.error?.name === 'ContractStatusError')
        mainError.value = 'Encountered error in fetching contract status'

      errors.value = typeof error?.error === 'string' ? [error.error]: []
      if (Array.isArray(error?.errorMessages) && error?.errorMessages?.length) {
        errors.value = error?.errorMessages
      }
      return
    } finally {
      loading.value = false
      loadingMsg.value = ''
    }
  } else if (misc.autoMatchPoolTarget === 'watchtower_P2P') {
    funding.prepareFunding = false
    funding.fee.satoshis = 0
    funding.fee.address = ''

    const p2pMatchOpts = {
      matchingPositionOffer: null,
      similarPositionOffers: [],
    }
    try {
      loading.value = true
      loadingMsg.value = 'Finding matching contract'
      const findMatchData = {
        wallet_hash: misc.walletHash,
        position: position,
        satoshis: position === 'hedge' ? 
          Math.round(intent.amount * 10 ** 8) : 
          Math.round(intent.longAmountBCH * 10 ** 8),
        duration_seconds: intent.duration,
        low_liquidation_multiplier: intent.lowPriceMult,
        high_liquidation_multiplier: intent.highPriceMult,
        oracle_pubkey: priceData?.oraclePubkey,
      }
      const findMatchResp = await anyhedgeBackend.post('anyhedge/hedge-position-offers/find_match/', findMatchData)
      p2pMatchOpts.matchingPositionOffer = findMatchResp?.data?.matching_position_offer
      p2pMatchOpts.similarPositionOffers = findMatchResp?.data?.similar_position_offers
    } catch(error) {
      console.error(error)
      errors.value = [
        `Error in finding matching ${position === 'hedge' ? 'long' : 'hedge' } position`,
      ]
      return
    } finally {
      loading.value = false
      loadingMsg.value = ''
    }

    if (p2pMatchOpts.matchingPositionOffer?.id) {
      misc.matchedHedgePositionOffer = parseHedgePositionOffer(p2pMatchOpts.matchingPositionOffer)
    } else if (p2pMatchOpts.similarPositionOffers?.length) {
      try {
        loading.value = true
        loadingMsg.value = 'Similar offers found'
        await dialogPromise({
          title: 'No matching offer',
          message: `No matching offers found but found similar offers. Select one instead?`,
          ok: true,
          cancel: true,
          class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
        })
      } catch(error) {
        console.error(error)
        return
      } finally {
        loading.value = false
        loadingMsg.value = ''
      }

      try {
        loading.value = true
        loadingMsg.value = 'Selecting from similar offers'
        const selectedSimilarOffer = await dialogPromise({
          component: HedgePositionOfferSelectionDialog,
          componentProps: {
            hedgePositionOffers: p2pMatchOpts.similarPositionOffers?.map(parseHedgePositionOffer),
          },
        })
        if (selectedSimilarOffer) misc.matchedHedgePositionOffer = selectedSimilarOffer
        else throw new Error('User cancelled')
      } catch(error) {
        console.error(error)
        if (typeof error?.message === 'string') errors.value = [error.message]
      } finally {
        loading.value = false
        loadingMsg.value = ''
      }
    }

    if (!misc.matchedHedgePositionOffer?.id){
      try {
        await dialogPromise({
          title: 'No matching offer',
          message: `No matching offers found, create one instead?`,
          ok: true,
          cancel: true,
          class: darkMode.value ? 'text-white br-15 pt-dark-card' : 'text-black',
        })
        misc.isPositionOffer = true
        funding.prepareFunding = false
        funding.fee.satoshis = 0
        funding.fee.address = ''
      } catch(error) {
        console.error(error)
        errors.value = [
          `No matching ${position === 'hedge' ? 'long' : 'hedge' } position found`,
        ]
        return
      } finally {
        loading.value = false
        loadingMsg.value = ''
      }
    }

    if (misc.matchedHedgePositionOffer?.id) {
      try {
        loading.value = true
        loadingMsg.value = 'Found existing offer. Accepting position offer'
        const acceptOfferData = {
          wallet_hash: misc.walletHash,
          address: position === 'hedge' ? pubkeys.hedgeAddress : pubkeys.longAddress,
          pubkey: position === 'hedge' ? pubkeys.hedgePubkey : pubkeys.longPubkey,
          address_path: position === 'hedge' ? pubkeys.hedgeAddressPath : pubkeys.longAddressPath,
          oracle_message_sequence: priceData?.messageSequence,
        }
        const acceptOfferResp = await anyhedgeBackend.post(
          `anyhedge/hedge-position-offers/${misc.matchedHedgePositionOffer.id}/accept_offer/`,
          acceptOfferData,
        )
        const matchedOffer = parseHedgePositionOffer(acceptOfferResp?.data)
        misc.matchedHedgePositionOffer = matchedOffer

        if (position === 'hedge') {
          pubkeys.longAddress = matchedOffer.address
          pubkeys.longPubkey = matchedOffer.pubkey
          pubkeys.longAddressPath = matchedOffer.addressPath
        } else {
          pubkeys.hedgeAddress = matchedOffer.address
          pubkeys.hedgePubkey = matchedOffer.pubkey
          pubkeys.hedgeAddressPath = matchedOffer.addressPath
        }

        misc.matchedHedgePositionOffer = matchedOffer
        intent.amount = matchedOffer.position === 'hedge' ?
          matchedOffer.satoshis / 10 ** 8 :
          matchedOffer.counterPartyInfo.calculatedHedgeSats / 10 ** 8
        intent.duration = matchedOffer.durationSeconds
        intent.lowPriceMult = matchedOffer.lowLiquidationPriceMultiplier
        intent.highPriceMult = matchedOffer.highLiquidationPriceMultiplier

        priceData.priceValue = matchedOffer.counterPartyInfo?.priceValue
        priceData.messageTimestamp = matchedOffer.counterPartyInfo?.priceMessageTimestamp
        priceData.messageSequence = matchedOffer.counterPartyInfo?.oracleMessageSequence
        funding.contractCreationParams.address = matchedOffer.counterPartyInfo?.contractAddress
        funding.contractCreationParams.version = matchedOffer.counterPartyInfo?.contractVersion
        funding.positionTaker = matchedOffer.position
        funding.fee.address = matchedOffer?.counterPartyInfo?.settlementServiceFeeAddress
        funding.fee.satoshis = matchedOffer?.counterPartyInfo?.settlementServiceFee
        funding.liquidityFee = 0
        funding.prepareFunding = true
      } catch(error) {
        console.error(error)
        errors.value = ['Encountered error in accepting matching position offer']
        return
      } finally {
        loading.value = false
        loadingMsg.value = ''
      }
    }
  }

  try {
    loading.value = true
    loadingMsg.value = 'Confirm'
    await dialogPromise({
      component: CreateHedgeConfirmDialog,
      componentProps: {
        intent: intent,
        pubkeys: pubkeys,
        priceData: priceData,
        funding: funding,
        oracleInfo: oracleInfo,
        position: position,
        positionTaker: funding.positionTaker,
        isPositionOffer: misc.isPositionOffer,
      }
    })
  } catch(error) {
    console.error(error)
    mainError.value = ''
    errors.value = []
    cancelAcceptedPositionOffer()
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }

  try {
    loading.value = true
    loadingMsg.value = 'Security check'
    await dialogPromise({component: SecurityCheckDialog})
  } catch(error) {
    console.error(error)
    mainError.value = 'Security check failed'
    errors.value = []
    cancelAcceptedPositionOffer()
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }

  // creating utxo phase
  if (funding.prepareFunding) {
    try {
      // the following data possibly doesn't exist but;
      // is necessary for creating a funding utxo
      if (!pubkeys.longAddress || !pubkeys.longPubkey || !pubkeys.hedgeAddress || !pubkeys.hedgePubkey ||
        !priceData.oraclePubkey || !priceData.priceValue || !priceData.messageTimestamp || !priceData.messageSequence
      ) {
        mainError.value = 'Unable to create funding utxo due to incomplete data'
        errors.value = []
        return
      }

      loading.value = true
      loadingMsg.value = 'Creating utxo for funding proposal'
      const contractCreationParameters = {
        address: funding.contractCreationParams.address,
        anyhedge_contract_version: funding.contractCreationParams.version,
        satoshis: intent.amount * 10 ** 8,
        start_timestamp: priceData.messageTimestamp,
        maturity_timestamp: priceData.messageTimestamp + intent.duration,
        hedge_address: pubkeys.hedgeAddress,
        hedge_pubkey: pubkeys.hedgePubkey,
        long_address: pubkeys.longAddress,
        long_pubkey: pubkeys.longPubkey,
        oracle_pubkey: priceData.oraclePubkey,
        start_price: priceData.priceValue,
        low_liquidation_multiplier: intent.lowPriceMult,
        high_liquidation_multiplier: intent.highPriceMult,
        fee: {
          address: funding.fee.address,
          satoshis: funding.fee.satoshis,
        }
      }
      const contractData = await parseHedgePositionData(contractCreationParameters)

      const { fundingUtxo, signedFundingProposal } = await createFundingProposal(
        contractData, position, props.wallet, addressSet, funding.liquidityFee, funding.positionTaker)
      funding.fundingProposal.txHash = fundingUtxo.txid
      funding.fundingProposal.txIndex = fundingUtxo.vout
      funding.fundingProposal.txValue = fundingUtxo.amount
      funding.fundingProposal.inputTxHashes = fundingUtxo.dependencyTxids
      funding.fundingProposal.pubkey = signedFundingProposal.publicKey
      funding.fundingProposal.scriptSig = signedFundingProposal.signature
      funding.contractData = contractData
    } catch(error) {
      console.error(error)
      mainError.value = 'Encountered error in preparing funding transaction'
      errors.value = []
      if (typeof error?.response?.data === 'string') errors.value = [error?.response?.data]
      else if (typeof error?.response?.data?.error === 'string') errors.value = [error?.response?.data?.error]
      else if (Array.isArray(error?.response?.data?.errors)) errors.value = error?.response?.data?.errors
      else if(typeof error === 'string') errors.value = [error]
      else if(typeof error?.message === 'string') errors.value = [error?.message]
      cancelAcceptedPositionOffer()
      return

    } finally {
      loading.value = false
      loadingMsg.value = ''
    }
  }

  const hedgePositionOfferData = {
    position: position,
    wallet_hash: misc.walletHash,

    satoshis: position === 'hedge' ?
      Math.round(intent.amount * 10 ** 8) : Math.round(intent.longAmountBCH * 10 ** 8),
    duration_seconds: intent.duration,
    high_liquidation_multiplier: intent.highPriceMult,
    low_liquidation_multiplier: intent.lowPriceMult,

    address: position === 'hedge' ? pubkeys.hedgeAddress : pubkeys.longAddress,
    pubkey: position === 'hedge' ? pubkeys.hedgePubkey : pubkeys.longPubkey,
    address_path: position === 'hedge' ? pubkeys.hedgeAddressPath : pubkeys.longAddressPath,

    oracle_pubkey: priceData.oraclePubkey || undefined,
  }

  const settleOfferData = {
    hedge_position_offer_id: misc.matchedHedgePositionOffer?.id || undefined,
    counter_party_funding_proposal: {
      tx_hash: funding.fundingProposal.txHash,
      tx_index: funding.fundingProposal.txIndex,
      tx_value: funding.fundingProposal.txValue,
      script_sig: funding.fundingProposal.scriptSig,
      pubkey: funding.fundingProposal.pubkey,
      input_tx_hashes: funding.fundingProposal.inputTxHashes
    }
  }

  const fungGPLPContractData = {
    contract_address:         funding.contractData.address,
    position:                 position,
    hedge_wallet_hash:        position === 'hedge' ? misc.walletHash : undefined,
    hedge_pubkey:             position === 'hedge' ? misc.accessKeys.publicKey : undefined,
    hedge_address_path:       position === 'hedge' ? pubkeys.hedgeAddressPath : undefined,
    long_wallet_hash:         position === 'long' ? misc.walletHash : undefined,
    long_pubkey:              position === 'long' ? misc.accessKeys.publicKey : undefined,
    long_address_path:        position === 'long' ? pubkeys.longAddressPath : undefined,
    oracle_message_sequence:  priceData.messageSequence || undefined,
    liquidity_fee:            funding.liquidityFee,
    settlement_service: {
      domain: liquidityServiceInfo.value?.settlementService?.host,
      scheme: liquidityServiceInfo.value?.settlementService?.scheme,
      port: liquidityServiceInfo.value?.settlementService?.port,
      hedge_signature: position === 'hedge' ? misc.accessKeys.signature : undefined,
      long_signature: position === 'long' ? misc.accessKeys.signature : undefined,
      auth_token: misc.accessKeys.authenticationToken || undefined,
    },
    funding_proposal: {
      tx_hash: funding.fundingProposal.txHash,
      tx_index: funding.fundingProposal.txIndex,
      tx_value: funding.fundingProposal.txValue,
      script_sig: funding.fundingProposal.scriptSig,
      pubkey: funding.fundingProposal.pubkey,
      input_tx_hashes: funding.fundingProposal.inputTxHashes
    }
  }

  // console.log(hedgePositionOfferData)
  // console.log(fungGPLPContractData)
  // return

  let data
  let path = ''
  let isResponseOffer = true
  if (misc.autoMatch && misc.autoMatchPoolTarget === 'anyhedge_LP') {
    data = fungGPLPContractData
    path = '/anyhedge/hedge-positions/fund_gp_lp_contract/'
    isResponseOffer = false
  } else if(misc.autoMatchPoolTarget === 'watchtower_P2P' && misc.matchedHedgePositionOffer?.id) {
    path = `/anyhedge/hedge-position-offers/${settleOfferData.hedge_position_offer_id}/settle_offer/`
    data = settleOfferData
    isResponseOffer = false
  } else {
    data = hedgePositionOfferData
    path = '/anyhedge/hedge-position-offers/'
    isResponseOffer = true
  }

  loading.value = true
  loadingMsg.value = isResponseOffer ? 'Creating hedge position offer' : 'Finalizing hedge position'
  if (isResponseOffer) {
    if (position === 'hedge') loadingMsg.value = 'Creating hedge position offer'
    if (position === 'long') loadingMsg.value = 'Creating long position offer'
  } else {
    if (position === 'hedge') loadingMsg.value = 'Finalizing hedge position'
    if (position === 'long') loadingMsg.value = 'Finalizing long position'
  }

  anyhedgeBackend.post(path, data)  
    .then(response => {
      // console.log(response)
      if(response?.data?.id || response?.data?.hedge_position?.id) {
        const emitData = { position: position }
        if (isResponseOffer) emitData.hedgePositionOffer = response.data
        else emitData.hedgePosition = response.data
        $emit('created', emitData)
        clearCreateHedgeForm()
        mainError.value = ''
        errors.value = []
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.log(error)
      let errorMsg = 'Encountered error creating contract'
      if (position === 'hedge') errorMsg = 'Encountered error in creating hedge position'
      if (position === 'long') errorMsg = 'Encountered error in creating long position'
      if (isResponseOffer) errorMsg += ' offer'
      mainError.value = errorMsg
      errors.value = []
      if (typeof error?.response?.data == 'string') errors.value = [error?.response?.data]
      if (typeof error?.response?.data?.detail == 'string') errors.value = [error?.response?.data?.detail]
      if (Array.isArray(error?.response?.data)) errors.value = error?.response?.data
      if (Array.isArray(error?.response?.data?.detail)) errors.value = error?.response?.data?.detail
      cancelAcceptedPositionOffer()
    })
    .finally(() => {
      loading.value = false
      loadingMsg.value = ''
    })
}

// mechanisms to keep selected asset prices up to date
const oraclePriceUpdateInterval = ref(null)
onMounted(() => {
  clearInterval(oraclePriceUpdateInterval.value)
  oraclePriceUpdateInterval.value = setInterval(() => updateSelectedAssetPrice(), 60 * 1000)
})
onUnmounted(() => clearInterval(oraclePriceUpdateInterval.value))
watch(() => createHedgeForm.value?.selectedAsset?.oraclePubkey, () => updateSelectedAssetPrice())
onMounted(() => updateSelectedAssetPrice())
function updateSelectedAssetPrice() {
  if (!createHedgeForm.value?.selectedAsset?.oraclePubkey) return
  const dispatchPayload = { oraclePubkey: createHedgeForm.value?.selectedAsset?.oraclePubkey, checkTimestampAge: true }
  $store.dispatch('anyhedge/updateOracleLatestPrice', dispatchPayload)
}
</script>
