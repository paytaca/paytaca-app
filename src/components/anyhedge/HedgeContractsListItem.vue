<template>
  <q-card-section>
    <div class="row">
      <div class="col">
        <div>{{ formatUnits(contract.metadata.nominalUnits, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}</div>
        <div class="text-grey">{{ contract.metadata.hedgeInputSats / (10**8) }} BCH</div>
      </div>
      <div class="col">
        <div style="text-align:right">
          {{ formatUnits(contract.parameters.lowLiquidationPrice, oracleInfo.assetDecimals) }}
          - 
          {{ formatUnits(contract.parameters.highLiquidationPrice, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
        </div>
        <div style="text-align:right">
          {{ formatUnits(contract.metadata.startPrice, oracleInfo.assetDecimals) }} {{ oracleInfo.assetCurrency }}
        </div>
      </div>
    </div>
    <div>
      <q-icon name="mdi-timer-sand"/>
      {{ formatDate(contract.parameters.startTimestamp * 1000) }} ->
      {{ formatDate(contract.parameters.maturityTimestamp * 1000) }}
    </div>
    <hr/>
  </q-card-section>
</template>
<script setup>
import { formatUnits, formatDate } from 'src/wallet/anyhedge/formatters';
import { computed } from 'vue';
import { useStore } from 'vuex';

const props = defineProps({ contract: Object })
const store = useStore()

const defaultOracleInfo = { assetName: '', assetCurrency: '', assetDecimals: 0 }
const oracleInfo = computed(() => {
  const oracles = store.getters['anyhedge/oracles']
  return oracles?.[props.contract?.metadata?.oraclePublicKey] || defaultOracleInfo
})
</script>