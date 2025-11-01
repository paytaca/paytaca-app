<template>
  <q-dialog ref="dialogRef" @hide="onHide()" :persistent="loading" seamless class="no-click-outside">
    <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section class="text-h6">
        {{ title }}
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div v-if="loading" class="row justify-center">
          <q-spinner color="brandblue" size="3em" :thickness="5"/>
        </div>
        <template v-if="errorMessage">
          {{ errorMessage }}
        </template>
        <div v-else-if="spendingTx">
          {{ $t('SpendingTransaction') }}:
          <div class="row items-center no-wrap">
            <div @click="copyText(spendingTx)" v-ripple style="position:relative;">
              {{ ellipsisText(spendingTx, {start: 5, end: 10}) }}
            </div>
            <q-btn
              flat
              icon="launch"
              size="xs" padding="xs"
              class="q-ml-sm"
              :href="'https://explorer.paytaca.com/tx/' + spendingTx"
              target="_blank"
            />
          </div>
        </div>
      </q-card-section>
      <q-card-actions class="row justify-end q-px-lg q-pb-lg">
        <q-btn
          no-caps
          :label="$t('OK')"
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
import { useDialogPluginComponent, useQuasar, format } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from 'vue-i18n'

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
const $t = useI18n().t
const { capitalize } = format

const $copyText = inject('$copyText')
function copyText(value) {
  $copyText(value)
  $q.notify({
    color: 'blue-9',
    message: $t('CopiedToClipboard'),
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
const titleText = $t(`Verifying${ capitalize(props.position) }FundingProposal`)
const title = ref(titleText)
const spendingTx = ref('')
async function verifyFundingProposalUtxo() {
  loading.value = true
  if (props.position !== 'short' && props.position !== 'long') {
    loading.value = false
    title.value = $t('InvalidData')
    errorMessage.value = $t('DetermineProposalError')
    return
  }

  const fundingProposal = props?.fundingProposal
  try {
    if (!fundingProposal?.tx_hash || !(fundingProposal?.tx_index >= 0)) throw new Exception('Funding proposal not found')
    const isUtxoSpentResponse = await isUtxoSpent(fundingProposal?.tx_hash, fundingProposal?.tx_index)
    if (isUtxoSpentResponse.success) {
      if (isUtxoSpentResponse.spent) {
        title.value = $t('UsedFundingProposal')
        spendingTx.value = isUtxoSpentResponse.spendingTx
      } else {
        title.value = $t('ValidFundingProposal')
      }
      loading.value = false
    } else {
      throw isUtxoSpentResponse.error
    }
  } catch(error) {
    errorMessage.value = $t('VerifyFundingProposalError')
    if (error?.message) errorMessage.value = error?.message
    title.value = $t('FundingValidationFailed')
  } finally {
    loading.value = false
  }
}
onMounted(() => verifyFundingProposalUtxo())

function onHide() {
  emit('ok', { spendingTx: spendingTx.value, error: errorMessage.value })
}
</script>
