<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 95vw;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ $t('ChangePlan') || 'Change Plan' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="loading" />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <p class="text-body2 text-grey q-mb-md">
          {{ $t('ChangePlanPrompt') || 'Select a new plan to upgrade or downgrade your subscription.' }}
        </p>

        <div v-if="fetchingPlans" class="row justify-center q-py-lg">
          <q-spinner-dots color="pt-primary1" size="40px" />
        </div>
        <div v-else-if="availablePlans.length === 0" class="text-center text-grey q-py-lg">
          {{ $t('NoOtherPlansAvailable') || 'No other active plans available for this store.' }}
        </div>
        <div v-else class="q-gutter-y-sm">
          <q-select
            v-model="selectedPlan"
            :options="availablePlans"
            option-label="name"
            option-value="id"
            dense
            outlined
            rounded
            :label="$t('SelectPlan') || 'Select Plan'"
            :dark="darkMode"
            :bg-color="darkMode ? 'pt-dark' : 'white'"
            color="pt-primary1"
            class="q-mb-md"
            :disable="loading"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption class="text-grey">
                    {{ scope.opt.amount }} {{ scope.opt.currency }} / 
                    {{ getPeriodText(scope.opt) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Warning about dynamic BCH pricing if fiat -->
          <q-banner
            v-if="selectedPlan && selectedPlan.currency !== 'BCH'"
            rounded
            dense
            class="bg-blue-2 text-blue-9 q-mb-md text-caption"
          >
            <template v-slot:avatar>
              <q-icon name="info" color="blue-9" />
            </template>
            The BCH required for this plan will be calculated based on the current exchange rate at the moment you submit this update.
          </q-banner>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat :label="$t('Cancel') || 'Cancel'" color="grey" v-close-popup :disable="loading" />
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('UpdatePlan') || 'Update Plan'"
          class="q-px-md"
          @click="submitChangePlan"
          :disable="!selectedPlan || loading || availablePlans.length === 0"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { PaymentHub } from 'src/wallet/payment-hub'
import { encodeCashAddress } from '@bitauth/libauth'
import { Contract, TransactionBuilder, SignatureTemplate } from 'cashscript13'
import { ElectrumNetworkProvider } from 'cashscript13'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { loadWallet } from 'src/wallet'
import { getPkhash } from 'src/wallet/payment-hub-cashscript'

const props = defineProps({
  subscription: { type: Object, required: true }
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const wallet = ref()
const hub = ref()

const fetchingPlans = ref(true)
const availablePlans = ref([])
const selectedPlan = ref(null)
const loading = ref(false)

async function initHub() {
  if (!wallet.value) wallet.value = await loadWallet()
  if (!hub.value) hub.value = new PaymentHub(wallet.value);
}

onMounted(async () => {
  try {
    const storeId = props.subscription.plan_details?.store
    if (!storeId) throw new Error('Store ID not found in subscription plan details')

    const response = await hub.value.listPlans(storeId, { is_active: true })
    // Filter out the current plan
    availablePlans.value = response.results.filter(p => p.id !== props.subscription.plan)
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Failed to fetch available plans' })
  } finally {
    fetchingPlans.value = false
  }
})

function getPeriodText(p) {
  if (p.period_days) {
    return `${p.period_days} ${p.period_days === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  }
  const blocks = p.period_blocks
  if (!blocks) return ''
  if (blocks % 4320 === 0) return `${blocks / 4320} ${blocks / 4320 === 1 ? (t('Month') || 'month') : (t('Months') || 'months')}`
  if (blocks % 1008 === 0) return `${blocks / 1008} ${blocks / 1008 === 1 ? (t('Week') || 'week') : (t('Weeks') || 'weeks')}`
  if (blocks % 144 === 0) return `${blocks / 144} ${blocks / 144 === 1 ? (t('Day') || 'day') : (t('Days') || 'days')}`
  return `${blocks} ${t('Blocks') || 'blocks'}`
}

async function submitChangePlan() {
  if (!selectedPlan.value) return

  loading.value = true
  try {
    await initHub()
    $q.loading.show({ message: 'Fetching plan update kit...' })
    const kit = await hub.value.getSubscriptionUpdateKit(props.subscription.id, selectedPlan.value.id)

    if (!kit.inputs || kit.inputs.length === 0) {
      throw new Error('Could not fetch update requirements.')
    }

    $q.loading.show({ message: 'Signing update transaction...' })

    const sub = props.subscription
    const merchantPayload = getPkhash(sub.merchant_address)
    const funderPayload = getPkhash(sub.funder_address)

    const isChipnet = $store.getters['global/isChipnet']
    const bchWallet = isChipnet ? wallet.value.BCH_CHIP : wallet.value.BCH

    // 1. Fetch contract artifact
    const artifactObj = await hub.value.getContractArtifact()
    const provider = new ElectrumNetworkProvider(isChipnet ? 'chipnet' : 'mainnet')
    const paytacaPayload = getPkhash(kit.paytaca_address)
    const reversedCategoryHex = sub.category.match(/.{1,2}/g).reverse().join('')
    const categoryBytes = new Uint8Array(reversedCategoryHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

    const contract = new Contract(artifactObj, [
      merchantPayload,
      funderPayload,
      paytacaPayload,
      BigInt(sub.max_fee),
      BigInt(sub.max_pledge || sub.pledge_satoshis), // fallback to pledge_satoshis if max_pledge is undefined
      BigInt(sub.min_period || sub.period_blocks),
      BigInt(sub.max_period || sub.period_blocks),
      categoryBytes,
      BigInt(sub.contract_timestamp),
      BigInt(sub.max_payments || 0)
    ], { provider })

    // 2. Fetch private key using the exact address index
    const addressIndex = sub.merchant_address_index
    if (addressIndex == null) throw new Error('Merchant address index not provided by backend')
    const pathStr = `0/${addressIndex}`

    const privKeyWif = await bchWallet.getPrivateKey(pathStr)
    if (!privKeyWif) throw new Error('Could not derive private key for merchant address')

    // 3. Build & sign transaction
    const sig = new SignatureTemplate(privKeyWif)
    const toAddress = encodeCashAddress(
      isChipnet ? 'bchtest' : 'bitcoincash',
      'p2pkh',
      getPkhash(kit.outputs[0].to)
    )
    const formattedInputs = kit.inputs.map(input => {
      const formattedInput = {
        ...input,
        satoshis: BigInt(input.satoshis)
      }
      if (input.token) {
        formattedInput.token = {
          ...input.token,
          amount: BigInt(input.token.amount)
        }
      }
      return formattedInput
    })

    const txBuilder = new TransactionBuilder({ provider })
    txBuilder.addInputs(formattedInputs, contract.unlock[kit.function_name](sig.getPublicKey(), sig))
    
    // Add the token output
    txBuilder.addOutput({ 
      to: toAddress, 
      amount: BigInt(kit.outputs[0].satoshis),
      token: {
        category: kit.outputs[0].token.category,
        amount: BigInt(kit.outputs[0].token.amount),
        nft: {
          capability: kit.outputs[0].token.nft.capability,
          commitment: kit.outputs[0].token.nft.commitment
        }
      }
    })

    const rawTx = txBuilder.build()

    // 4. Submit to Payment Hub
    $q.loading.show({ message: 'Submitting plan update...' })
    await hub.value.submitSubscriptionUpdate(sub.id, rawTx, {})

    $q.notify({ type: 'positive', message: $t('PlanUpdatedSuccessfully') || 'Plan updated successfully' })
    onDialogOK()
  } catch (error) {
    console.error(error)
    const errorMsg = error.response?.data?.error || error.message
    $q.notify({ type: 'negative', message: ($t('ErrorUpdatingPlan') || 'Error updating plan: ') + errorMsg })
  } finally {
    loading.value = false
    $q.loading.hide()
  }
}
</script>
