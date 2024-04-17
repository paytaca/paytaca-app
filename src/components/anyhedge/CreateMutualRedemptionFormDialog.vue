<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" :persistent="loading" seamless>
    <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row no-wrap items-center justify-center q-pl-md">
        <div class="text-h6 q-space q-mt-sm">{{ $t('MutualRedemptionProposal') }}</div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          :disabled="loading"
          v-close-popup
          class="close-button"
        />
      </div>
      <q-card-section>
        <q-form class="q-gutter-y-sm" @submit="createMutualRedemption()">
          <q-banner v-if="errors.length > 0" dense rounded class="text-white bg-red q-my-sm">
            <ul class="q-pl-md">
              <li v-for="(error, index) in errors" :key="index">
                {{ error }}
              </li>
            </ul>
          </q-banner>
          <div v-if="totalPayoutSats" class="text-subtitle1">
            {{ $t('TotalPayout') }}: {{ getAssetDenomination(denomination, (totalPayoutSats || 0) / 10 ** 8) }}
          </div>
          <q-select
            :dark="darkMode"
            outlined
            dense
            :popup-content-class="darkMode ? '': 'text-black'"
            :label="$t('Type')"
            v-model="mutualRedemptionProposal.redemptionType"
            :options="['refund', 'early_maturation', 'arbitrary']"
            :option-label="val => $t(`${(val.charAt(0).toUpperCase() + val.substr(1)).replaceAll('_', ' ')}`)"
            map-options
          />
          <q-input
            v-if="mutualRedemptionProposal.redemptionType === 'early_maturation'"
            :dark="darkMode"
            outlined
            dense
            :label="$t('SettlementPrice')"
            :suffix="oracleInfo?.assetCurrency ? `${oracleInfo?.assetCurrency}/${denomination}` : ''"
            v-model="mutualRedemptionProposal.settlementPrice"
            :rules="[
              val => val >= settlemenPriceBounds.min
                || $t(
                  'MustBeGreaterThan',
                  { amount: settlemenPriceBounds.min },
                  `Must be greater than ${settlemenPriceBounds.min}`
                ),
              val => val <= settlemenPriceBounds.max
                || $t(
                  'MustBeLessThan',
                  { amount: settlemenPriceBounds.max },
                  `Must be less than ${settlemenPriceBounds.max}`
                ),
            ]"
          />

          <div v-if="mutualRedemptionProposal.redemptionType === 'arbitrary'" class="row items-center">
            <q-space/>
            <q-btn
              flat
              rounded
              padding="sm"
              :icon="mutualRedemptionProposal.arbitraryUseSliders ? 'tune' : 'keyboard'"
              @click="mutualRedemptionProposal.arbitraryUseSliders = !mutualRedemptionProposal.arbitraryUseSliders"
            />
          </div>
          <div
            v-if="mutualRedemptionProposal.redemptionType === 'arbitrary' && mutualRedemptionProposal.arbitraryUseSliders"
            class="q-mx-sm"
          >
            <div>
              <div class="row">
                <div class="q-space">{{ $t('Hedge') }}</div>
                <div>{{ `${mutualRedemptionProposal.shortBch} ${denomination}` }}</div>
              </div>
              <q-slider
                :dark="darkMode"
                color="brandblue"
                :min="0"
                :inner-min="DUST"
                :max="totalPayoutSats/10 ** 8"
                :inner-max="totalPayoutSats/10 ** 8-DUST"
                :step="10 ** -6"
                v-model="mutualRedemptionProposal.shortBch"
              >
              </q-slider>
            </div>
            <div>
              <div class="row">
                <div class="q-space">{{ $t('Long') }}</div>
                <div>{{ `${mutualRedemptionProposal.longBch} ${denomination}` }}</div>
              </div>
              <q-slider
                :dark="darkMode"
                color="brandblue"
                :min="0"
                :inner-min="DUST"
                :max="totalPayoutSats/10 ** 8"
                :inner-max="totalPayoutSats/10 ** 8-DUST"
                :step="10 ** -6"
                v-model="mutualRedemptionProposal.longBch"
              >
              </q-slider>
            </div>
          </div>
          <div v-else class="row items-center no-wrap q-gutter-x-sm">
            <q-input
              :dark="darkMode"
              outlined
              dense
              :disable="mutualRedemptionProposal.redemptionType !== 'arbitrary'"
              :label="$t('Hedge')"
              v-model="mutualRedemptionProposal.shortBch"
            />
            <q-input
              :dark="darkMode"
              outlined
              dense
              :disable="mutualRedemptionProposal.redemptionType !== 'arbitrary'"
              :label="$t('Long')"
              v-model="mutualRedemptionProposal.longBch"
            />
          </div>
          <div class="q-gutter-y-md q-mt-sm">
            <div v-if="loading" class="text-center">
              {{ loadingMsg }}
            </div>
            <q-btn
              no-caps
              :loading="loading"
              :disable="loading"
              :label="$t('Create')"
              type="submit"
              color="brandblue"
              class="full-width"
            />
            <q-btn
              no-caps
              outline
              :loading="loading"
              :disable="loading"
              :label="$t('Cancel')"
              color="grey"
              class="full-width"
              v-close-popup
              @click="$emit('cancel')"
            />
          </div>
        </q-form>
      </q-card-section>
      <!-- <div>
        <q-btn label="Test" @click="generateMutualRefund()"/>
      </div> -->
    </q-card>
  </q-dialog>  
</template>
<script setup>
import { signMutualEarlyMaturation, signMutualRefund, signArbitraryPayout } from 'src/wallet/anyhedge/mutual-redemption'
import { castBigIntSafe, getPrivateKey } from 'src/wallet/anyhedge/utils'
import { AnyHedgeManager } from '@generalprotocols/anyhedge'
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { anyhedgeBackend } from 'src/wallet/anyhedge/backend'
import { formatUnits, parseHedgePositionData } from 'src/wallet/anyhedge/formatters'
import SecurityCheckDialog from 'src/components/SecurityCheckDialog.vue'
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

const manager = new AnyHedgeManager()
// dialog plugins requirement
defineEmits([
  'cancel',
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const DUST = computed(() => 546 / 10 ** 8)
// misc
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const denomination = computed(() => store.getters['global/denomination'])
const $q = useQuasar()
const $t = useI18n().t

const props = defineProps({
  contract: {
    type: Object,
    required: true,
  },
  viewAs: String,
  wallet: Object,
})

async function dialogPromise(qDialogOptions) {
  return new Promise((resolve, reject) => {
    $q.dialog(qDialogOptions).onOk(resolve).onDismiss(reject)
  })
}

const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
const oracleInfo = computed(() => {
  const oracles = store.getters['anyhedge/oracles']
  return oracles?.[props.contract?.parameters?.oraclePublicKey] || defaultOracleInfo
})
const assetDecimals = computed(() => oracleInfo.value?.assetDecimals || 0)

const totalPayoutSats = computed(() => {
  return formatUnits(props?.contract?.metadata?.shortInputInSatoshis + props?.contract?.metadata?.longInputInSatoshis, 0)
})
const fundingSatoshis = computed(() => {
  if (props?.contract?.fundings?.[0]?.fundingSatoshis) return props?.contract?.fundings?.[0]?.fundingSatoshis
  return manager.calculateTotalRequiredFundingSatoshis(props.contract)
})

const refundBchPayout = computed(() => {
  return {
    short: formatUnits(props?.contract?.metadata?.shortInputInSatoshis, 8),
    long: formatUnits(props?.contract?.metadata?.longInputInSatoshis, 8),
  }
})

const mutualRedemptionProposal = ref({
  redemptionType: '',
  settlementPrice: 0,
  shortBch: 0,
  longBch: 0,

  arbitraryUseSliders: false,
})

watch(
  () => [mutualRedemptionProposal.value.redemptionType],
  () => {
    if (mutualRedemptionProposal.value.redemptionType == 'refund') {
      mutualRedemptionProposal.value.shortBch = refundBchPayout.value.short
      mutualRedemptionProposal.value.longBch = refundBchPayout.value.long
    } else if (mutualRedemptionProposal.value.redemptionType == 'early_maturation') {
      let settlementPrice = oracleInfo.value?.latestPrice?.priceValue
      if (assetDecimals.value) settlementPrice = settlementPrice / 10 ** assetDecimals.value
      if (!isNaN(settlementPrice)) mutualRedemptionProposal.value.settlementPrice = settlementPrice
    }
  }
)

watch(() => mutualRedemptionProposal.value.shortBch, () => {
  if (mutualRedemptionProposal.value.redemptionType == 'arbitrary' && fundingSatoshis.value) {
    const longSats = Math.round(totalPayoutSats.value - mutualRedemptionProposal.value.shortBch * 10 ** 8)
    mutualRedemptionProposal.value.longBch = longSats / 10 ** 8
  }
})

watch(() => mutualRedemptionProposal.value.longBch, () => {
  if (mutualRedemptionProposal.value.redemptionType == 'arbitrary' && fundingSatoshis.value) {
    const shortSats = Math.round(totalPayoutSats.value - mutualRedemptionProposal.value.longBch * 10 ** 8)
    mutualRedemptionProposal.value.shortBch = shortSats / 10 ** 8
  }
})

watch(() => mutualRedemptionProposal.value.settlementPrice, () => {
  let settlementPrice = mutualRedemptionProposal.value.settlementPrice
  if (assetDecimals.value) {
    settlementPrice = settlementPrice * 10 ** assetDecimals.value
  }
  updatePayoutFromSettlementPrice(settlementPrice)
})

const settlemenPriceBounds = computed(() => {
  const data = {
    min: formatUnits(props.contract?.parameters?.lowLiquidationPrice),
    max: formatUnits(props.contract?.parameters?.highLiquidationPrice),
  }

  if (assetDecimals.value) {
    data.min = data.min / 10 ** assetDecimals.value
    data.max = data.max / 10 ** assetDecimals.value
  }

  return data
})

function updatePayoutFromSettlementPrice(settlementPrice=0) {
  if (!settlementPrice) {
    mutualRedemptionProposal.value.shortBch = 0
    mutualRedemptionProposal.value.longBch = 0
    return
  }

  manager.calculateSettlementOutcome(
    props?.contract?.parameters, fundingSatoshis.value,  castBigIntSafe(settlementPrice))
    .then(outcome => {
      const { shortPayoutSatsSafe, longPayoutSatsSafe } = outcome;
      mutualRedemptionProposal.value.shortBch = formatUnits(shortPayoutSatsSafe, 8)
      mutualRedemptionProposal.value.longBch = formatUnits(longPayoutSatsSafe, 8)
    })
}

async function confirmMutualRedemption(data) {
  const message = `${$t('HedgePayout')}: ${data.short_satoshis / 10 ** 8} BCH<br/>` +
                    `${$t('LongPayout')}: ${data.long_satoshis / 10 ** 8} BCH<br/>` +
                    `${$t('AreYouSure')}`
  await dialogPromise({
    title: $t('ConfirmMutualRedemptionProposal'),
    message: message,
    html: true,
    ok: { label: $t('OK') },
    cancel: { label: $t('Cancel') },
    color: 'brandblue',
    class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
  })
  await dialogPromise({component: SecurityCheckDialog})
}

const loading = ref(false)
const loadingMsg = ref('')
const errors = ref([])
async function validateContractFunding() {
  if (!props?.contract?.fundings?.[0]?.fundingTransactionHash) throw new Exception('No funding transaction found')
  const contractAddress = props?.contract?.address

  if (!contractAddress) throw new Exception('Contract address not found')
  const { data } = await anyhedgeBackend.post(`anyhedge/hedge-positions/${contractAddress}/validate_contract_funding/`)
  return data
}

async function createMutualRedemption() {
  const data = {
    redemption_type: mutualRedemptionProposal.value.redemptionType,
    short_satoshis: Math.round(mutualRedemptionProposal.value.shortBch * 10 ** 8),
    long_satoshis: Math.round(mutualRedemptionProposal.value.longBch * 10 ** 8),
    short_schnorr_sig: undefined,
    long_schnorr_sig: undefined,
    settlement_price: undefined,
  }

  if (data.redemption_type === 'early_maturation') {
    data.settlement_price = (mutualRedemptionProposal.value.settlementPrice * 10 ** assetDecimals.value) || undefined
  }


  if (!props?.contract?.fundings?.[0]?.fundingSatoshis) {
    try {
      loading.value = true
      loadingMsg.value = $t('VerifyingContractFunding')
      const contractDataApi = await validateContractFunding()
      const contractData = await parseHedgePositionData(contractDataApi)
      Object.assign(props.contract, contractData)
    } catch(error) {
      console.error(error)
      loading.value = false
      loadingMsg.value = ''
      errors.value = [$t('ValidatingContractFundingError')]
      if (typeof error?.response?.data === 'string') errors.value = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors.value = error?.response?.data
      else if (typeof error?.message === 'string') errors.value = [error.message]
      return
    } finally {
      loading.value = false
      loadingMsg.value = ''
    }
  }

  let privkey
  try {
    loading.value = true
    loadingMsg.value = $t('RetrievePrivateKey')
    privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
    if (!privkey) throw new Error('Unable to find resolve private key for contract')
  } catch(error) {
    console.error(error)
    errors.value = [$t('RetrievePrivateKeyError')]
    loading.value = false
    loadingMsg.value =''
    return
  } finally {
    loading.value = false
    loadingMsg.value = ''
  }


  let transactionProposal
  try{
    let signMutualPayoutResponse
    loading.value = true
    loadingMsg.value = $t('SigningProposal')
    switch(data.redemption_type) {
      case 'refund':
        signMutualPayoutResponse = await signMutualRefund(props?.contract, privkey)
        break;
      case 'early_maturation':
        signMutualPayoutResponse = await signMutualEarlyMaturation(
          props?.contract, privkey, data.settlement_price)
        break;
      case 'arbitrary':
        signMutualPayoutResponse = await signArbitraryPayout(
          props?.contract, privkey, data.short_satoshis, data.long_satoshis)
        break;
      default:
        throw new Error('Invalid redemption type')
    }

    if (!signMutualPayoutResponse.success) throw signMutualPayoutResponse.error
    transactionProposal = signMutualPayoutResponse.proposal
  } catch(error) {
    console.error(error)
    errors.value = [$t('SigningProposalError')]
    if (typeof error?.message === 'string') errors.value = [error.message]
    loading.value = false
    loadingMsg.value = ''
    return
  } finally {
    loading.value = false
    loadingMsg.value =''
  }

  if (!transactionProposal) {
    errors.value = [$t('UnresolvedTransactionProposal')]
    return
  }

  const shortPayoutAddress = props?.contract?.metadata?.shortPayoutAddress
  const longPayoutAddress = props?.contract?.metadata?.longPayoutAddress
  const signedShortSats = transactionProposal?.outputs?.find(output => output?.to === shortPayoutAddress)?.amount
  const signedLongSats = transactionProposal?.outputs?.find(output => output?.to === longPayoutAddress)?.amount

  if (signedShortSats !== castBigIntSafe(data.short_satoshis)) {
    errors.value = [$t(
      'InvalidHedgeSatoshis',
      { amount: signedShortSats },
      `Invalid short satoshis, expected ${signedShortSats}`
    )]
    return
  }

  if (signedLongSats !== castBigIntSafe(data.long_satoshis)) {
    errors.value = [$t(
      'InvalidHedgeSatoshis',
      { amount: signedLongSats },
      `Invalid short satoshis, expected ${signedLongSats}`
    )]
    return
  }

  const shortSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['short_key.schnorr_signature.all_outputs'])?.['short_key.schnorr_signature.all_outputs']
  const longSchnorrSig = transactionProposal?.redemptionDataList?.find(e => e['long_key.schnorr_signature.all_outputs'])?.['long_key.schnorr_signature.all_outputs']

  data.short_schnorr_sig = shortSchnorrSig || undefined
  data.long_schnorr_sig = longSchnorrSig || undefined

  await confirmMutualRedemption(data)

  loading.value = true
  loadingMsg.value = $t('SubmittingMutualRedemption')
  const contractAddress = props?.contract?.address
  anyhedgeBackend.post(`/anyhedge/hedge-positions/${contractAddress}/mutual_redemption/`, data)
    .then(response => {
      if (response?.data?.address) {
        parseHedgePositionData(response?.data).then(contractData => Object.assign(props.contract, contractData))
        $q.dialog({
          title: $t('MutualRedemptionSubmitted'),
          seamless: true,
          ok: { label: $t('OK') },
          color: 'brandblue',
          class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
        }).onDismiss(() => onDialogHide())
        return Promise.resolve(response)
      }
      return Promise.reject(response)
    })
    .catch(error => {
      console.error(error)
      errors.value = [$t('SubmittingMutualRedemptionError')]
      if (typeof error?.response?.data === 'string') errors.value = [error.response.data]
      else if (Array.isArray(error?.response?.data)) errors.value = error.response.data
    })
    .finally(() => {
      loading.value = false
      loadingMsg.value = ''
    })
}

async function generateMutualRefund() {
  const privkey = await getPrivateKey(props?.contract, props?.viewAs, props?.wallet)
  if (!privkey) throw new Error('Unable to find resolve private key for contract')
  signMutualRefund(props?.contract, privkey).then(console.log).catch(console.error)
  signMutualEarlyMaturation(props?.contract, privkey, 11400).then(console.log).catch(console.error)
}
</script>
