<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">Payments</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
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
                {{ payment?.amount }} {{ payment?.currency?.symbol }}
              </q-item-label>
              <q-item-label class="text-caption">
                ~ {{ payment?.bchAmount }} BCH
              </q-item-label>
            </q-item-section>
            <q-item-section side top style="padding-left:4px;">
              <template v-if="payment?.isEscrow">
                <q-icon name="more_vert"/>
                <q-menu :class="[ 'text-left', darkMode ? 'pt-dark' : 'text-black' ]">
                  <q-list separator>
                    <q-item
                      v-if="payment.isEscrow"
                      clickable v-ripple
                      v-close-popup
                      @click="() => displayPaymentEscrowContract(payment)"
                    >
                      <q-item-section>
                        <q-item-label>View escrow</q-item-label>
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
          No payments
        </div>
      </q-card-section>

      <EscrowContractDialog
        v-model="escrowContractDialog.show"
        :escrow-contract="escrowContractDialog.escrowContract"
        :bch-price="escrowContractDialog.bchPrice"
        :currency="escrowContractDialog.currency"
      />
    </q-card>
  </q-dialog>
</template>
<script setup>
import { formatDateRelative } from 'src/marketplace/utils'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { capitalize, computed, ref, watch } from 'vue'
import { BchPrice, EscrowContract, Payment } from 'src/marketplace/objects'
import EscrowContractDialog from './escrow-contract-dialog.vue'

const props = defineProps({
  modelValue: Boolean,
  payments: Array,
})

const $emit = defineEmits([
  'update:modelValue',
  'updated',

  // REQUIRED; need to specify some events that your
  // component will emit through useDialogPluginComponent()
  ...useDialogPluginComponent.emits,
])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const innerVal = ref(props.modelValue)
watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
watch(innerVal, () => $emit('update:modelValue', innerVal.value))

const escrowContractDialog = ref({
  show: false,
  escrowContract: EscrowContract.parse(),
  bchPrice: BchPrice.parse(),
  currency: '',
})
async function displayPaymentEscrowContract(payment=Payment.parse()) {
  if (!payment.escrowContractAddress) return

  if (!payment.escrowContract) await payment.fetchEscrowContract()

  escrowContractDialog.value.escrowContract = payment.escrowContract
  escrowContractDialog.value.bchPrice = payment.bchPrice
  escrowContractDialog.value.currency = payment.currency.symbol
  escrowContractDialog.value.show = true
}
</script>
