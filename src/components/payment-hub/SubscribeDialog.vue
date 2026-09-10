<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onFormSubmit">
        <q-card-section>
          <div class="text-h6">{{ $t('SubscribeToPlan') || 'Subscribe to Plan' }}</div>
          <div v-if="step === 1" class="text-caption text-grey">{{ $t('ScanQRCode') || 'Enter or scan a Plan ID to create a new subscription.' }}</div>
          <div v-else class="text-caption text-grey">{{ $t('PlanDetails') || 'Plan Details' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <template v-if="step === 1">
            <q-input
              v-model="form.plan"
              :label="$t('Search') + ' / ' + $t('PlanID') + ' *'"
              outlined
              dense
              autofocus
              lazy-rules
              :rules="[val => !!val || $t('Required')]"
              hide-bottom-space
              @update:model-value="() => debouncedFetchFromList()"
            >
              <template v-slot:append>
                <q-btn flat round dense icon="image" @click="onQRUploaderClick" />
                <q-btn flat round dense icon="qr_code_scanner" @click="showQrScanner = true" />
              </template>
            </q-input>
            <q-slide-transition>
              <div v-if="isLoading" class="text-center">
                <q-spinner :dark="darkMode" size="1.5rem"/>
              </div>
              <q-list v-else-if="planOptions.length" bordered separator class="rounded-borders plan-list-options">
                <q-item v-for="plan of planOptions" :key="plan.id" clickable v-ripple @click="selectPlan(plan)">
                  <q-item-section top>
                    <div class="text-weight-bold ellipsis-2-lines">{{ plan.name }}</div>
                    <div class="text-caption text-grey">{{ plan.store_info.name }}</div>
                  </q-item-section>
                  <q-item-section top class="text-right">
                    <div class="text-body2 text-weight-medium">
                      <template v-if="plan.currency !== 'BCH'">{{ getTotalFiatStr(plan) }} {{ plan.currency }}</template>
                      <template v-else>{{ getTotalBchStr(plan) }} BCH</template>
                    </div>
                    <div class="text-caption">{{ getPeriodText(plan) }}</div>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-slide-transition>
          </template>

          <template v-else-if="step === 2">
            <div v-if="planDetails" class="q-gutter-y-sm">
              <div class="row items-center q-mb-sm" v-if="planDetails.store_info">
                <q-avatar size="32px" class="q-mr-sm" v-if="planDetails.store_info.logo || planDetails.store_info.logo_url">
                  <img :src="planDetails.store_info.logo || planDetails.store_info.logo_url" />
                </q-avatar>
                <q-avatar v-else size="32px" class="q-mr-sm bg-white">
                  <img src="~assets/paytaca_payment_hub_logo.png" />
                </q-avatar>
                <div class="text-subtitle1 text-weight-medium">{{ planDetails.store_info.name }}</div>
              </div>

              <div class="text-subtitle1 text-weight-bold">{{ planDetails.name }}</div>
              <div class="text-body2 text-grey">{{ planDetails.description || $t('NoDescription') }}</div>
              
              <template v-if="hasSubscriptionForm">
                <q-separator class="q-my-md" />
                <div class="text-subtitle2 text-weight-medium">{{ $t('SubscriptionForm', 'Subscription Form') }}</div>
                <JSONFormPreview
                  ref="subscriptionFormRef"
                  v-model="subscriptionFormData"
                  v-model:formDataErrors="subscriptionFormErrors"
                  :schema-data="subscriptionFormSchema"
                />
              </template>

              <q-separator class="q-my-md" />
              
              <div class="row justify-between q-mt-sm items-start">
                <div class="text-caption text-grey">{{ $t('BillingAmount', 'Billing Amount') }}</div>
                <div class="text-right">
                  <div class="text-body2 text-weight-medium">{{ totalFiatStr }} {{ planDetails.currency }}</div>
                  <div class="text-caption text-grey" v-if="planDetails.currency !== 'BCH' && (planDetails.amount_satoshis > 0 || bchPrice > 0)">
                    ~{{ totalBchStr }} BCH
                  </div>
                </div>
              </div>
              
              <div class="row justify-between items-center">
                <div class="text-caption text-grey">{{ $t('BillingReceivingPeriod', 'Billing/Receiving Period') }}</div>
                <div class="row items-center">
                  <div class="text-body2 text-weight-medium">
                    {{ getPeriodText(planDetails) }}
                  </div>
                  <q-btn
                    v-if="planDetails.period_blocks"
                    flat round dense icon="info" size="xs" color="grey" class="q-ml-xs"
                    @click="() => showBlocksInfo(planDetails.period_blocks)"
                  />
                </div>
              </div>
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-if="step === 2" flat :label="$t('Back')" color="grey" @click="step = 1" />
          <q-btn v-if="step === 1" flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn 
            unelevated 
            rounded 
            :label="step === 1 ? $t('Next') : $t('Subscribe')" 
            color="pt-primary1" 
            type="submit" 
            :loading="isLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
    
    <QRUploader
      ref="qrUploadRef"
      @detect-upload="onScannerDecode"
    />
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce, useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { extractPlanId } from 'src/wallet/payment-hub'
import { usePaymentHubCore, usePaymentHubUtils, useSubscriptionFormSchema, useSubscriptionUtils } from 'src/composables/payment-hub/usePaymentHub'
import QrScanner from 'src/components/qr-scanner.vue'
import QRUploader from 'src/components/QRUploader.vue'
import JSONFormPreview from 'src/components/jsonforms/JSONFormPreview.vue'

defineEmits([
  ...useDialogPluginComponent.emits
])

const props = defineProps({
  initialPlanId: {
    type: String,
    default: null
  }
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const { t: $t } = useI18n()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { initHub, hub } = usePaymentHubCore()
const { getPeriodText, satsToBchDisplay, getTotalCostPerCycle, showBlocksInfo } = useSubscriptionUtils();
const { formatAmount } = usePaymentHubUtils();

const formRef = ref(null)
const subscriptionFormRef = ref(null)

const step = ref(1)
const isLoading = ref(false)
const planDetails = ref(null)
const showQrScanner = ref(false)
const qrUploadRef = ref(null)
const isChipnet = computed(() => $store.getters['global/isChipnet'])

const subscriptionFormData = ref({})
const subscriptionFormErrors = ref([])
const { subscriptionFormSchema, hasSubscriptionForm } = useSubscriptionFormSchema(planDetails);

watch(planDetails, () => {
  subscriptionFormData.value = {}
  subscriptionFormErrors.value = []
}, { immediate: true })

const form = reactive({
  plan: props.initialPlanId || '',
})

onMounted(() => {
  if (props.initialPlanId) {
    // Small delay to let the UI settle before fetching
    setTimeout(() => {
      onFormSubmit()
    }, 100)
  }
})

const bchPrice = computed(() => {
  if (!planDetails.value || planDetails.value.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', planDetails.value.currency) || 0
})

const bchUsdPrice = computed(() => $store.getters['market/getAssetPrice']('bch', 'usd') || 0)
function getPlanBchPrice(plan) {
  if (!plan || plan.currency === 'BCH') return 0
  return $store.getters['market/getAssetPrice']('bch', plan.value.currency) || 0 
}

function getPlanTotalCostPerCycle(plan) {
  if (!plan) return 0
  let pledgeSats = plan.amount_satoshis
  if (!pledgeSats) {
    const bchPrice = getPlanBchPrice(plan);
    if (!bchPrice) return 0
    const bchAmount = parseFloat(plan.amount) / bchPrice
    pledgeSats = Math.round(bchAmount * 100000000)
  }

  let maxFee = 50000 // default if no USD price
  if (bchUsdPrice.value > 0) {
    maxFee = Math.round((1 / bchUsdPrice.value) * 100000000)
  }
  return getTotalCostPerCycle({ pledge_satoshis: pledgeSats, max_fee: maxFee })
}

function getTotalBchStr (plan) {
  const _totalCostSats = getPlanTotalCostPerCycle(plan);
  if (_totalCostSats === 0) return '0'
  return satsToBchDisplay(_totalCostSats) || '0'
}

function getTotalFiatStr(plan) {
  const _totalCostSats = getPlanTotalCostPerCycle(plan);
  const _totalBchStr = getTotalBchStr(plan)
  if (plan.currency === 'BCH') return _totalBchStr
  if (_totalCostSats > 0 && bchPrice.value > 0) {
    const totalBch = _totalCostSats / 100000000
    return parseFloat((totalBch * bchPrice.value).toFixed(2)).toString()
  }
  return formatAmount(plan.amount, 8)
}

const totalBchStr = computed(() => getTotalBchStr(planDetails.value))
const totalFiatStr = computed(() => getTotalFiatStr(planDetails.value))

const planOptions = ref([]);
async function fetchFromList() {
  try {
    isLoading.value = true
    const paymentHub = await initHub({ isBackground: true, autoRegister: false })
    const plansResult = await paymentHub.listPlans(undefined, {
      search: form.plan,
    })

    planOptions.value = plansResult.results
  } catch (err) {
    console.error('Error fetching plan:', err)
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err.message || $t('InvalidPlanIdOrNotFound', 'Invalid Plan ID or plan not found')
    })
  } finally {
    isLoading.value = false
  }
}
const debouncedFetchFromList = debounce(fetchFromList, 500);

function selectPlan(plan) {
  planDetails.value = plan
  step.value = 2
}

async function onFormSubmit() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  if (step.value === 1) {
    await fetchPlanDetails()
  } else if (step.value === 2) {
    if (hasSubscriptionForm.value && !subscriptionFormRef.value?.validate()) {
      $q.notify({
        type: 'negative',
        message: t('PleaseCompleteSubscriptionForm', 'Please complete the subscription form'),
      })
      return
    }

    onDialogOK({
      plan: form.plan,
      plan_details: planDetails.value,
      subscription_data: hasSubscriptionForm.value ? subscriptionFormData.value : undefined,
    })
  }
}


async function fetchPlanDetails() {
  isLoading.value = true
  try {
    const paymentHub = await initHub({ isBackground: true, autoRegister: false })
    const plan = await paymentHub.getPlan(form.plan)
    if (!plan) throw new Error('Plan not found')
    
    planDetails.value = plan
    step.value = 2
  } catch (err) {
    console.error('Error fetching plan:', err)
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err.message || $t('InvalidPlanIdOrNotFound', 'Invalid Plan ID or plan not found')
    })
  } finally {
    isLoading.value = false
  }
}

function onScannerDecode(content) {
  showQrScanner.value = false
  if (content) {
    const stringContent = Array.isArray(content) ? content[0].rawValue : content
    if (stringContent) {
      form.plan = extractPlanId(stringContent)
      if (form.plan) {
        setTimeout(() => {
          onFormSubmit()
        }, 100)
      }
    }
  }
}

function onQRUploaderClick() {
  if (qrUploadRef.value) {
    qrUploadRef.value.$refs['q-file'].pickFiles()
  }
}

function onCancelClick() {
  onDialogCancel()
}
</script>
<style lang="scss" scoped>
.plan-list-options {
  max-height: 45vh;
  overflow-y: auto !important;
  overflow: hidden;
}
</style>