<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="pt-card-2 text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">{{ $t('Payments') }}</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
        <q-list separator :dark="darkMode" class="q-mb-sm">
          <q-item v-for="payment in uniquePayments" :key="payment?.id">
            <q-item-section top>
              <q-item-label>
                {{ payment?.totalAmount }} {{ payment?.currency?.symbol }}
                <q-badge dense>
                  {{ capitalize(payment?.status).replaceAll('_', ' ') }}
                </q-badge>
              </q-item-label>
              <q-item-label class="text-caption">
                {{ payment?.bchTotalAmount }} BCH
              </q-item-label>
            </q-item-section>
            <q-item-section top avatar>
              <q-item-label>
                <template v-if="!isNotRefundable(payment)">
                  <span v-if="paymentsRefundErrorMap[payment?.id]">
                    <q-icon name="error" color="red" size="2em" class="q-mr-sm">
                    </q-icon>
                    <q-menu class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
                      <div class="row items-start no-wrap">
                        <q-icon name="error" color="red" class="q-mr-sm" size="1.5em"/>
                        <div class="q-space">{{ paymentsRefundErrorMap[payment?.id] }}</div>
                      </div>
                    </q-menu>
                  </span>
                  <q-btn
                    :loading="loadingPaymentsMap[payment?.id]"
                    :disable="loadingPaymentsMap[payment?.id]"
                    no-caps
                    :label="$t('Refund')"
                    class="button"
                    padding="2px md"
                    @click="() => refundPayment(payment)"
                  />
                </template>
                <div v-else-if="isNotRefundable(payment)?.length" class="text-right text-grey" style="max-width:10em;">
                  {{ isNotRefundable(payment) }}
                </div>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <template v-if="totalRefundable?.amount && uniquePayments?.length > 1">
          <q-separator :dark="darkMode" spaced/>
          <div class="row items-center">
            <div>
              <div class="text-caption top">{{ $t('TotalRefundable') }}:</div>
              <div class="text-subtitle1">{{ totalRefundable?.amount }} {{ totalRefundable?.currency?.symbol }}</div>
            </div>
            <q-space/>
            <q-btn
              no-caps
              :label="$t('RefundAll')"
              class="button"
              @click="() => refundPayments()"
            />
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { backend } from 'src/marketplace/backend';
import { Payment } from 'src/marketplace/objects';
import { errorParser } from 'src/marketplace/utils';
import { useDialogPluginComponent } from 'quasar';
import { useStore } from 'vuex';
import { capitalize, computed, onMounted, ref, watch } from 'vue';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from "vue-i18n"

const props = defineProps({
  modelValue: Boolean,
  autoRefund: Boolean,
  payments: {
    default: () => {
      return [].map(Payment.parse)
    }
  },
})

const $emit = defineEmits([
  'update:modelValue',
  'refunded',

  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const $store = useStore()
const { t } = useI18n()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const innerVal = ref(props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

const uniquePayments = computed(() => {
  if (!Array.isArray(props.payments)) return []
  return props.payments.filter((payment, index, list) => {
    return list.findIndex(_payment => _payment?.id === payment.id) === index
  })
})
const totalRefundable = computed(() => {
  const currency = uniquePayments.value[0]?.currency
  const sameCurrencies = uniquePayments.value.every(payment => payment?.currency?.symbol == currency?.symbol)
  if (!sameCurrencies) return
  const totalRefundable = uniquePayments.value.filter(payment => !isNotRefundable(payment))
    .reduce((subtotal, payment) => subtotal + (Number(payment.totalAmount) || 0), 0)
  const roundMultiplier = 10 ** 3
  return { amount: Math.floor(totalRefundable * roundMultiplier) / roundMultiplier, currency }
})

const loadingPaymentsMap = ref({})
const paymentsRefundPromiseMap = ref({})
const paymentsRefundErrorMap = ref({})
watch(innerVal, () => (innerVal.value && props.autoRefund) ? refundPayments() : null)
onMounted(() => (innerVal.value && props.autoRefund) ? refundPayments() : null)
watch(innerVal, () => {
  if (innerVal.value) return
  loadingPaymentsMap.value = {}
  paymentsRefundPromiseMap.value = {}
  paymentsRefundErrorMap.value = {}
})
async function refundPayments() {
  const refundedPayments = []
  const promiseList = uniquePayments.value
    .map(payment => {
      const prevStatus = payment?.status
      return refundPayment(payment, { emitRefunded: false })
        .then(response => {
          if (prevStatus != payment?.status && payment?.status === 'voided')  {
            refundedPayments.push(payment)
          }
          return response
        })
    })

  await Promise.allSettled(promiseList)
  if(refundedPayments?.length) $emit('refunded', refundedPayments)

  return Promise.all(refundedPayments)
}

function refundPayment(payment=Payment.parse(), opts={ emitRefunded: true }) {
  const paymentId = payment?.id

  const existingPromise = paymentsRefundPromiseMap.value[paymentId]
  if (existingPromise) return existingPromise

  loadingPaymentsMap.value[paymentId] = true
  paymentsRefundPromiseMap.value[paymentId] = backend.post(`connecta/payments/${payment?.id}/void_escrow/`)
  return paymentsRefundPromiseMap.value[paymentId]
    .finally(() => delete paymentsRefundErrorMap.value[paymentId])
    .then(response => {
      const prevStatus = payment?.status
      payment.raw = response?.data
      if (prevStatus != payment?.status && payment?.status === 'voided' && opts?.emitRefunded)  {
        $emit('refunded', [payment])
      }
      return response
    })
    .catch(error => {
      const data = error?.response?.data
      let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                         errorParser.firstElementOrValue(data?.detail)
      window.error = error
      if (!errorMessage && typeof error?.message === 'string' && error?.message?.length < 200) {
        errorMessage = error?.message
      }
      if (!errorMessage) errorMessage = t('UnknownError')
      paymentsRefundErrorMap.value[paymentId] = errorMessage
      return Promise.reject(error)
    })
    .finally(() => {
      delete paymentsRefundPromiseMap.value[paymentId]
      delete loadingPaymentsMap.value[paymentId]
    })
}

function isNotRefundable(payment=Payment.parse()) {
  if (!payment?.escrowContractAddress) return t('PaymentErrMsg1')
  switch(payment?.status) {
    case('sent'):
      return false
    case('pending'):
      return t('PaymentErrMsg2')
    case('received'):
      return t('PaymentErrMsg3')
    case('voided'):
      return t('PaymentErrMsg4')
    default:
      return false
  }
}

defineExpose({
  refundPayments,
  uniquePayments,
  refundPayment,
})
</script>
s