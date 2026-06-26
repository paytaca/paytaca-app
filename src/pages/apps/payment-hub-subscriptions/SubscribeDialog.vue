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
              :label="($t('PlanID') || 'Plan ID') + ' *'"
              outlined
              dense
              autofocus
              lazy-rules
              :rules="[val => !!val || $t('Required')]"
              hide-bottom-space
            >
              <template v-slot:append>
                <q-btn flat round dense icon="qr_code_scanner" @click="showQrScanner = true" />
              </template>
            </q-input>
          </template>

          <template v-else-if="step === 2">
            <div v-if="planDetails" class="q-gutter-y-sm">
              <div class="text-subtitle2">{{ planDetails.name }}</div>
              <div class="text-body2 text-grey">{{ planDetails.description || $t('NoDescription') }}</div>
              
              <q-separator class="q-my-md" />
              
              <div class="row justify-between q-mt-sm">
                <div class="text-caption text-grey">{{ $t('Amount') }}</div>
                <div class="text-body2 text-weight-medium">{{ planDetails.amount }} {{ planDetails.currency }}</div>
              </div>
              
              <div class="row justify-between">
                <div class="text-caption text-grey">{{ $t('IntervalUnit') }}</div>
                <div class="text-body2 text-weight-medium">
                  {{ planDetails.period_days ? planDetails.period_days + ' ' + ($t('Days') || 'Days') : planDetails.period_blocks + ' ' + ($t('Blocks') || 'Blocks') }}
                </div>
              </div>
            </div>
          </template>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-if="step === 2" flat :label="$t('Back') || 'Back'" color="grey" @click="step = 1" />
          <q-btn v-if="step === 1" flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn 
            unelevated 
            rounded 
            :label="step === 1 ? ($t('Next') || 'Next') : ($t('Subscribe') || 'Subscribe')" 
            color="pt-primary1" 
            type="submit" 
            :loading="isLoading"
          />
        </q-card-actions>
      </q-form>
    </q-card>
    
    <QrScanner
      v-model="showQrScanner"
      @decode="onScannerDecode"
    />
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { PaymentHub } from 'src/wallet/payment-hub'
import QrScanner from 'src/components/qr-scanner.vue'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const $q = useQuasar()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const step = ref(1)
const isLoading = ref(false)
const planDetails = ref(null)
const showQrScanner = ref(false)

const form = reactive({
  plan: '',
})

async function onFormSubmit() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  if (step.value === 1) {
    await fetchPlanDetails()
  } else if (step.value === 2) {
    onDialogOK({ plan: form.plan })
  }
}

async function fetchPlanDetails() {
  isLoading.value = true
  try {
    const wallet = $store.getters['global/getWallet']('bch')
    const paymentHub = new PaymentHub(wallet)
    
    const plan = await paymentHub.getPlan(form.plan)
    if (!plan) throw new Error('Plan not found')
    
    planDetails.value = plan
    step.value = 2
  } catch (err) {
    console.error('Error fetching plan:', err)
    $q.notify({
      type: 'negative',
      message: err?.response?.data?.message || err.message || 'Invalid Plan ID or plan not found'
    })
  } finally {
    isLoading.value = false
  }
}

function onScannerDecode(content) {
  showQrScanner.value = false
  let planId = content
  
  if (content.includes('paymenthub.paytaca.com') || content.includes('chipnet.paymenthub.paytaca.com')) {
    try {
      const url = new URL(content)
      const pathParts = url.pathname.split('/').filter(p => p)
      planId = pathParts[pathParts.length - 1]
    } catch (e) {}
  } else if (content.startsWith('paytaca:')) {
    try {
      const url = new URL(content)
      if (url.searchParams.has('plan')) {
        planId = url.searchParams.get('plan')
      }
    } catch(e) {}
  }
  
  form.plan = planId
}

function onCancelClick() {
  onDialogCancel()
}
</script>
