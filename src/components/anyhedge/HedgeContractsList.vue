<template>  
  <div>
    <HedgeContractsListItem
      v-for="(contract, index) in contracts" :key="index"
      :contract="contract"
      @click="displayContractInDialog(contract)"
      v-ripple
    />
  </div>
</template>
<script setup>
import { useQuasar } from 'quasar'
import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue'
import HedgeContractsListItem from './HedgeContractsListItem.vue';

const $q = useQuasar()

const props = defineProps({
  contracts: Array,
  viewAs: String,
  wallet: Object,
})

function displayContractInDialog(contractData) {
  $q.dialog({
    component: HedgeContractDetailDialog,
    componentProps: { contract: contractData, viewAs: props.viewAs, wallet: props.wallet }
  })
}
</script>
