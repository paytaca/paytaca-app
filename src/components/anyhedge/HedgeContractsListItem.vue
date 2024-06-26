<template>
  <q-card-section :class="{'text-grey': contract?.cancelled?.at }">
    <div class="row justify-end items-center q-gutter-x-sm">
      <div class="q-space text-body1">
        {{ ellipsisText(contract?.address, { end: 5 }) }}
      </div>
      <q-icon v-if="contract?.cancelled?.at" name="block" color="red" size="md" @click.stop>
        <q-popup-proxy :breakpoint="0">
          <div class="q-px-md q-py-sm pt-card pt-label" :class="getDarkModeClass(darkMode)">
            {{ $t('ContractWasCancelled') }}
            <template v-if="contract?.cancelled?.by">
              {{ $t('By') }} {{ contract?.cancelled?.by }}
            </template>

            <div v-if="contract?.cancelled?.at > 0" class="text-grey">
              ({{ formatDate(contract?.cancelled?.at * 1000) }})
            </div>
          </div>
        </q-popup-proxy>
      </q-icon>

      <q-icon v-if="matured || settled" name="handshake" :color="settled ? 'green': 'amber'" size="md" @click.stop>
        <q-popup-proxy :breakpoint="0">
          <div class="q-px-md q-py-sm pt-card pt-label" :class="getDarkModeClass(darkMode)">
            <template v-if="settled">
              {{ $t('ContractSettled') }}
              <div v-if="settlementMetadata.settlementTimestamp > 0" class="text-grey">
                ({{ formatDate(settlementMetadata.settlementTimestamp * 1000) }})
              </div>
            </template>
            <template v-else-if="matured">{{ $t('ContractMaturity') }}</template>
          </div>
        </q-popup-proxy>
      </q-icon>

      <q-icon :name="funding === 'complete' ? 'credit_score': 'credit_card'" :color="fundingIconColor" size="md" @click.stop>
        <q-popup-proxy :breakpoint="0">
          <div class="q-px-md q-py-sm pt-card pt-label" :class="getDarkModeClass(darkMode)">
            {{ $t(fundingIconTooltip) }}
          </div>
        </q-popup-proxy>
      </q-icon>
    </div>
    <div class="row">
      <div class="col" style="white-space: nowrap;">
        <div class="row items-start no-wrap">
          <div class="col-4 text-caption" style="margin-bottom:-0.25em;">{{ $t('Hedge') }}</div>
          <div>
            <div>
              {{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }}
              {{ oracleInfo.assetCurrency }}
            </div>
            <div style="margin-top:-0.45em" class="text-grey">
              {{ getAssetDenomination(denomination, formatUnits(contract.metadata.shortInputInSatoshis, 8)) }}
            </div>
          </div>
        </div>
        <div class="row items-start no-wrap">
          <div class="col-4 text-caption" style="margin-bottom:-0.25em;">{{ $t('Long') }}</div>
          <div>
            <div>
              {{ formatUnits(contract.metadata.longInputInOracleUnits, oracleInfo.assetDecimals) }}
              {{ oracleInfo.assetCurrency }}
            </div>
            <div style="margin-top:-0.45em" class="text-grey">
              {{ getAssetDenomination(denomination, formatUnits(contract.metadata.longInputInSatoshis, 8)) }}
            </div>
          </div>
        </div>
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
      <div>
        {{ $t('SettlementType') }}: {{ $t(settlementMetadata.settlementTypeText) }}
        <template v-if="settlementMetadata.mutualRedemptionTypeText">
          ({{settlementMetadata.mutualRedemptionTypeText}})
        </template>
      </div>
      <div class="row">
        <div class="col">
          <div>{{ $t('Hedge') }}</div>
          <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.short.assetChangePctg)}` + ' text-weight-medium'">
            {{ oracleInfo?.assetCurrency || $t('Asset') }}: {{ settlementMetadata.short.assetChangePctg }}%
          </div>
          <div :class="`text-${resolveColor(settlementMetadata.short.bchChangePctg)}` + ' text-weight-medium'">
            {{ `${denomination}: ${settlementMetadata.short.bchChangePctg}%` }}
          </div>
        </div>
        <div class="col">
          <div>{{ $t('Long') }}</div>
          <div v-if="settlementMetadata.settlementPriceValue" :class="`text-${resolveColor(settlementMetadata.long.assetChangePctg)}` + ' text-weight-medium'">
            {{ oracleInfo?.assetCurrency || $t('Asset') }}: {{ settlementMetadata.long.assetChangePctg }}%
          </div>
          <div :class="`text-${resolveColor(settlementMetadata.long.bchChangePctg)}` + ' text-weight-medium'">
            {{ `${denomination}: ${settlementMetadata.long.bchChangePctg}%` }}
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <span v-show="false">{{ updateTickCtr }}</span>
      <q-icon name="mdi-timer-sand"/>
      {{ formatDate(formatUnits(contract.parameters.startTimestamp, -3)) }} ->
      {{ formatDate(formatUnits(contract.parameters.maturityTimestamp, -3)) }}
    </div>
    <hr/>
  </q-card-section>
</template>
<script setup>
import { useQuasar } from 'quasar';
import { formatUnits, formatDate, ellipsisText, parseSettlementMetadata } from 'src/wallet/anyhedge/formatters';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useStore } from 'vuex';
import { getAssetDenomination } from 'src/utils/denomination-utils'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({ contract: Object })
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const denomination = computed(() => $store.getters['global/denomination'])

const durationUpdateTimeout = ref(null)
const updateTickCtr = ref(0)
function updateTick() {
  const maturityTimestamp = parseInt(props?.contract?.parameters?.maturityTimestamp)
  const startTimestamp = parseInt(props?.contract?.parameters?.startTimestamp)
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
  return oracles?.[props.contract?.parameters?.oraclePublicKey] || defaultOracleInfo
})

const matured = computed(() => Date.now()/1000 >= props.contract?.parameters?.maturityTimestamp)
const settled = computed(() => props.contract?.fundings?.map(funding => funding?.settlement?.settlementTransactionHash).find(Boolean))
const funding = computed(() => {
  if (props.contract?.fundings?.[0]?.fundingTransactionHash) return 'complete'
  else if (props.contract?.shortFundingProposal && props.contract?.longFundingProposal) return 'ready'
  else if (props.contract?.shortFundingProposal || props.contract?.longFundingProposal) return 'partial'

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
      return 'FundingComplete'
    case 'ready':
      return 'FundingReady'
    case 'partial':
      return 'FundingPartial'
    case 'pending':
      return 'FundingPending'
  }
  return ''
})

const settlementMetadata = computed(() => parseSettlementMetadata(props?.contract))

function resolveColor(changePctg) {
  if (changePctg > 0) return 'green'
  else if (changePctg < 0) return 'red'
  return 'grey-7'
}
</script>
