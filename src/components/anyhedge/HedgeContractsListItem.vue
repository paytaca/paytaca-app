<template>
  <q-card-section>
    <div class="row justify-end items-center q-gutter-sm">
      <div class="q-space text-body1">
        {{ ellipsisText(contract?.address, { end: 5 }) }}
      </div>
      <q-icon v-if="matured || settled" name="handshake" :color="settled ? 'green': 'amber'" size="md" @click.stop>
        <q-popup-proxy :breakpoint="0">
          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']">
            <template v-if="settled">Contract has been settled</template>
            <template v-else-if="matured">Contract has reached maturity</template>
          </div>
        </q-popup-proxy>
      </q-icon>

      <q-icon :name="funding === 'complete' ? 'credit_score': 'credit_card'" :color="fundingIconColor" size="md" @click.stop>
        <q-popup-proxy :breakpoint="0">
          <div :class="['q-px-md q-py-sm', darkMode ? 'pt-dark-label pt-dark' : 'text-black']">
            {{ fundingIconTooltip }}
          </div>
        </q-popup-proxy>
      </q-icon>
    </div>
    <div class="row">
      <div class="col">
        <div>{{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}</div>
        <div class="text-grey">{{ contract.metadata.hedgeInputSats / (10**8) }} BCH</div>
      </div>
      <div class="col">
        <div v-if="settled" style="text-align:right">
          {{ formatUnits(settlementMetadata.settlementPriceValue, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
        </div>
        <template v-else>
        <div style="text-align:right">
          {{ formatUnits(contract.parameters.lowLiquidationPrice, oracleInfo.assetDecimals) }}
          - 
          {{ formatUnits(contract.parameters.highLiquidationPrice, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
        </div>
        <div style="text-align:right">
          {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
        </div>
        </template>
      </div>
    </div>
    <div v-if="settled">
      <div class="row">
        <div class="col">
          <div>Hedge</div>
          <div :class="`text-${resolveColor(settlementMetadata.hedge.assetChangePctg)}` + ' text-weight-medium'">
            {{ oracleInfo?.assetCurrency || 'Asset' }}: {{ settlementMetadata.hedge.assetChangePctg }}%
          </div>
          <div :class="`text-${resolveColor(settlementMetadata.hedge.bchChangePctg)}` + ' text-weight-medium'">
            BCH: {{ settlementMetadata.hedge.bchChangePctg }}%
          </div>
        </div>
        <div class="col">
          <div>Long</div>
          <div :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
            {{ oracleInfo?.assetCurrency || 'Asset' }}: {{ settlementMetadata.long.assetChangePctg }}%
          </div>
          <div :class="`text-${resolveColor(settlementMetadata.long.bchChangePctg)}` + ' text-weight-medium'">
            BCH: {{ settlementMetadata.long.bchChangePctg }}%
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <span v-show="false">{{ updateTickCtr }}</span>
      <q-icon name="mdi-timer-sand"/>
      {{ formatDate(contract.parameters.startTimestamp * 1000) }} ->
      {{ formatDate(contract.parameters.maturityTimestamp * 1000) }}
    </div>
    <hr/>
  </q-card-section>
</template>
<script setup>
import { useQuasar } from 'quasar';
import { formatUnits, formatDate, ellipsisText } from 'src/wallet/anyhedge/formatters';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({ contract: Object })
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const durationUpdateTimeout = ref(null)
const updateTickCtr = ref(0)
function updateTick() {
  const maturityTimestamp = props?.contract?.parameters?.maturityTimestamp
  const startTimestamp = props?.contract?.parameters?.startTimestamp
  const maturityDelta = Math.abs((Date.now() / 1000) - maturityTimestamp)
  const startDelta = Math.abs((Date.now() / 1000) - startTimestamp)
  const tickDelta = Math.min(maturityDelta, startDelta)
  let nextTickInMs = -1
  if (tickDelta) {
    if (tickDelta > 3600) {
      nextTickInMs = (tickDelta % 3600) * 1000
    } else if (tickDelta <= 3600) {
      nextTickInMs = (tickDelta % 60) * 1000
    }
  }

  if (nextTickInMs >= 0) {
    clearTimeout(durationUpdateTimeout.value)
    durationUpdateTimeout.value = setTimeout(() => {
      updateTickCtr.value++
      updateTick()
    }, nextTickInMs)
  }
}
watch(() => props?.contract?.parameters?.maturityTimestamp, () => updateTick())
onMounted(() => updateTick())
onUnmounted(() => clearTimeout(durationUpdateTimeout.value))

const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
const oracleInfo = computed(() => {
  const oracles = $store.getters['anyhedge/oracles']
  return oracles?.[props.contract?.metadata?.oraclePublicKey] || defaultOracleInfo
})

const matured = computed(() => Date.now()/1000 >= props.contract?.parameters?.maturityTimestamp)
const settled = computed(() => props.contract?.settlement?.[0]?.spendingTransaction)
const funding = computed(() => {
  if (props.contract?.funding?.[0]?.fundingTransaction) return 'complete'
  else if (props.contract?.hedgeFundingProposal && props.contract?.longFundingProposal) return 'ready'
  else if (props.contract?.hedgeFundingProposal || props.contract?.longFundingProposal) return 'partial'

  return 'pending'
})
const fundingIconColor = computed(() => {
  if (funding.value === 'complete' || funding.value === 'ready') return 'green'
  else if (funding.value === 'partial') return 'amber'
  return 'red'
})
const fundingIconTooltip = computed(() => {
  switch(funding.value) {
    case 'complete':
      return 'Contract is already funded'
    case 'ready':
      return 'Funds are in place but is not yet completed'
    case 'partial':
      return 'Not all parties have submitted funding proposals'
    case 'pending':
      return 'Both parties have not submitted funding proposals yet'
  }
  return ''
})

const settlementMetadata = computed(() => {
  const data = {
    settlementPriceValue: 0,
    hedge: { assetChangePctg: 0, bchChangePctg: 0 },
    long: { assetChangePctg: 0, bchChangePctg: 0 },
  }
  const settlement = props.contract?.settlement?.[0]
  if (settlement?.hedgeSatoshis >= 0 && settlement?.longSatoshis >= 0 && settlement?.settlementPrice) {
    data.settlementPriceValue = settlement.settlementPrice
    const { hedgeSatoshis, longSatoshis } = settlement
    const hedgeUnits = (hedgeSatoshis * settlement.settlementPrice) / 10 ** 8
    const longUnits = (longSatoshis * settlement.settlementPrice) / 10 ** 8
  
    data.hedge.assetChangePctg = Math.round((hedgeUnits / props.contract?.metadata?.nominalUnits) * 10000)
    data.hedge.bchChangePctg = Math.round((hedgeSatoshis / props.contract?.metadata?.hedgeInputSats) * 10000)
    data.long.assetChangePctg = Math.round((longUnits / props.contract?.metadata?.longInputUnits) * 10000)
    data.long.bchChangePctg = Math.round((longSatoshis / props.contract?.metadata?.longInputSats) * 10000)

    data.hedge.assetChangePctg = -(10000 - data.hedge.assetChangePctg) / 100
    data.hedge.bchChangePctg = -(10000 - data.hedge.bchChangePctg) / 100
    data.long.assetChangePctg = -(10000 - data.long.assetChangePctg) / 100
    data.long.bchChangePctg = -(10000 - data.long.bchChangePctg) / 100
  }
  return data
})

function resolveColor(changePctg) {
  if (changePctg > 0) return 'green'
  else if (changePctg < 0) return 'red'
  return 'grey-7'
}
</script>
