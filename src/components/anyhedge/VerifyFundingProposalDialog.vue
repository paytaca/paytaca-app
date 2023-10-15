<template>
  <q-dialog ref="dialogRef" @hide="onHide()" :persistent="loading" seamless>
    <q-card :class="darkMode ? 'text-white br-15 pt-dark-card' : 'text-black'">
      <q-card-section class="text-h6">
        {{ title }}
      </q-card-section>
      <q-card-section class="q-pt-none">
        <!-- {{ loading }} | {{ errorMessage }} | {{ spendingTx }} -->
        <div v-if="loading" class="row justify-center">
          <q-spinner color="brandblue" size="3em" :thickness="5"/>
        </div>
        <template v-if="errorMessage">
          {{ errorMessage }}
        </template>
        <div v-else-if="spendingTx">
          Spending transaction:
          <div class="row items-center no-wrap">
            <div @click="copyText(spendingTx)" v-ripple style="position:relative;">
              {{ ellipsisText(spendingTx, {start: 5, end: 10}) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://blockchair.com/bitcoin-cash/transaction/' + spendingTx"
              target="_blank"
            />
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end q-px-lg q-pb-lg">
        <q-btn
          no-caps
          label="OK"
          color="brandblue"
          padding="sm lg"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ellipsisText } from 'src/wallet/anyhedge/formatters'
import { isUtxoSpent } from 'src/wallet/anyhedge/funding'
import { computed, inject, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent, useQuasar } from 'quasar'

// dialog plugins requirement
const emit = defineEmits([
  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits
])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()


// misc
const store = useStore()
const darkMode = computed(() => store.getters['darkmode/getStatus'])
const $q = useQuasar()

const $copyText = inject('$copyText')
function copyText(value) {
  $copyText(value)
  $q.notify({
    color: 'blue-9',
    message: 'Copied to clipboard',
    icon: 'mdi-clipboard-check',
    timeout: 200
  })
}

const props = defineProps({
  position: String,
  fundingProposal: Object,
})

const loading = ref(false)
const errorMessage = ref('')
const title = ref(`Verifying ${ props.position } funding proposal`)
const spendingTx = ref('')
async function verifyFundingProposalUtxo() {
  loading.value = true
  if (props.position !== 'hedge' && props.position !== 'long') {
    loading.value = false
    title.value = 'Invalid data'
    errorMessage.value = 'Unable to determine position to verify'
    return
  }

  const fundingProposal = props?.fundingProposal
  try {
    if (!fundingProposal?.tx_hash || !(fundingProposal?.tx_index >= 0)) throw new Exception('Funding proposal not found')
    const isUtxoSpentResponse = await isUtxoSpent(fundingProposal?.tx_hash, fundingProposal?.tx_index)
    if (isUtxoSpentResponse.success) {
      if (isUtxoSpentResponse.spent) {
        title.value = 'Funding proposal is already used'
        spendingTx.value = isUtxoSpentResponse.spendingTx
      } else {
        title.value = 'Funding proposal valid'
      }
      loading.value = false
    } else {
      throw isUtxoSpentResponse.error
    }
  } catch(error) {
    errorMessage.value = 'Encountered error in verifying funding proposal'
    if (error?.message) errorMessage.value = error?.message
    title.value = 'Funding proposal verification failed'
  } finally {
    loading.value = false
  }
}
onMounted(() => verifyFundingProposalUtxo())

function onHide() {
  emit('ok', { spendingTx: spendingTx.value, error: errorMessage.value })
}
</script>
