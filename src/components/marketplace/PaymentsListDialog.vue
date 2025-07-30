<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">{{ $t('Payments') }}</div>
          <q-btn flat icon="close" padding="sm" v-close-popup class="close-button" />
        </div>
        <slot name="before"></slot>
        <q-list v-if="payments?.length" class="q-r-mx-md" separator style="max-height:65vh;overflow:auto;">
          <q-item v-for="payment in payments" :key="payment?.id" clickable v-ripple>
            <q-item-section top>
              <q-item-label>
                {{ capitalize(payment?.status).replaceAll('_', ' ') }}
              </q-item-label>
              <q-item-label class="text-caption">
                {{ formatDateRelative(payment?.createdAt) }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar top>
              <q-item-label>
                {{ payment?.totalAmount }} {{ payment?.currency?.symbol }}
              </q-item-label>
              <q-item-label class="text-caption">
                {{ payment?.bchTotalAmount }} BCH
              </q-item-label>
            </q-item-section>
            <q-item-section side top style="padding-left:4px;">
              <template v-if="payment?.isEscrow || payment?.canReceive || payment?.canRefund">
                <q-icon name="more_vert"/>
                <q-menu class="text-left pt-card text-bow" :class="getDarkModeClass(darkMode)">
                  <q-list separator>
                    <!-- <q-item
                      v-if="!payment?.isEscrow && payment?.canReceive"
                      clickable v-ripple
                      v-close-popup
                      @click="() => updatePaymentStatus({ payment, status: 'received' })"
                    >
                      <q-item-section>
                        <q-item-label>Mark received</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      v-if="!payment?.isEscrow && payment?.canRefund"
                      clickable v-ripple
                      v-close-popup
                      @click="() => updatePaymentStatus({ payment, status: 'refunded' })"
                    >
                      <q-item-section>
                        <q-item-label>Mark refunded</q-item-label>
                      </q-item-section>
                    </q-item> -->
                    <q-item
                      v-if="payment.isEscrow"
                      clickable v-ripple
                      v-close-popup
                      @click="() => displayPaymentEscrowContract(payment)"
                    >
                      <q-item-section>
                        <q-item-label>{{ $t('ViewEscrow') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </template>
              <q-icon v-else/>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="text-center text-grey q-my-md">
          {{ $t('NoPayments') }}
        </div>
      </q-card-section>
      <EscrowContractDialog
        v-model="escrowContractDialog.show"
        :escrow-contract="escrowContractDialog.escrowContract"
        :bch-price="escrowContractDialog.bchPrice"
        :currency="escrowContractDialog.currency"
        :token-prices="escrowContractDialog.tokenPrices"
      />

    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/marketplace/backend'
import { BchPrice, EscrowContract, Payment } from 'src/marketplace/objects'
import { errorParser, formatDateRelative } from 'src/marketplace/utils'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { capitalize, computed, defineComponent, ref, watch } from 'vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import EscrowContractDialog from 'src/components/marketplace/escrow-contract-dialog.vue'
import { useI18n } from "vue-i18n"

export default defineComponent({
  name: 'PaymentsListDialog',
  components: {
    EscrowContractDialog,
  },
  props: {
    modelValue: Boolean,
    payments: Array,
  },
  emits: [
    'update:modelValue',
    'updated',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const { t } = useI18n()
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    function _updatePaymentStatus(opts={payment: Payment.parse(), status: null, force: false }) {
      if (!opts?.payment?.id) return Promise.reject('No payment provided')
      if (opts?.payment?.status === opts?.status && !opts?.force) return Promise.resolve(opts?.payment)

      const data = { status: opts?.status }

      return backend.patch(`connecta/payments/${opts?.payment?.id}/`, data)
        .then(response => {
          if (opts?.payment?.id != response?.data?.id) return Promise.reject({ response })
          return Payment.parse(response?.data)
        })
    }

    function updatePaymentStatus(opts={payment: Payment.parse(), status: null, force: false }) {
      const dialog = $q.dialog({
        title: t('UpdatingPayment'),
        progress: true,
        persistent: true,
        ok: false,
      })
      return _updatePaymentStatus(opts)
        .then(payment => {
          $emit('updated', payment)
          if (opts?.payment) opts.payment.raw = payment?.raw
          dialog.hide()
        })
        .catch(error => {
          const data = error?.response?.data
          let errorMessage = errorParser.firstElementOrValue(data?.non_field_errors) ||
                            errorParser.firstElementOrValue(data?.status) ||
                            data?.detail
          if (!errorMessage && Array.isArray(data)) errorMessage = data[0]
          if (!errorMessage && typeof error === 'string') errorMessage = error
          if (!errorMessage) errorMessage = t('UpdatePaymentErrMsg')
          dialog.update({ title: t('Error'), message: errorMessage })
        })
        .finally(() => {
          dialog.update({ progress: false, persistent: false, ok: { color: 'brandblue' }})
        })
    }

    const escrowContractDialog = ref({
      show: false,
      escrowContract: EscrowContract.parse(),
      bchPrice: BchPrice.parse(),
      tokenPrices: [].map(BchPrice.parse),
      currency: '',
    })
    async function displayPaymentEscrowContract(payment=Payment.parse()) {
      if (!payment.escrowContractAddress) return

      if (!payment.escrowContract) await payment.fetchEscrowContract()

      escrowContractDialog.value.escrowContract = payment.escrowContract
      escrowContractDialog.value.bchPrice = payment.bchPrice
      escrowContractDialog.value.tokenPrices = payment.tokenPrices
      escrowContractDialog.value.currency = payment.currency.symbol
      escrowContractDialog.value.show = true
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      updatePaymentStatus,

      escrowContractDialog,
      displayPaymentEscrowContract,

      // utils funcs
      formatDateRelative, capitalize,
    }
  },
  methods: {
    getDarkModeClass
  }
})
</script>
