<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card :class="darkMode ? 'text-white pt-dark-card' : 'text-black'">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">Escrow</div>
          <q-btn flat icon="close" padding="sm" v-close-popup/>
        </div>
        <q-tab-panels v-model="tab" style="background: none;" animated>
          <q-tab-panel name="details" class="q-pa-none">
            <div class="row items-center justify-end">
              <q-btn
                v-if="escrowContract?.settlementTxid"
                flat
                color="green"
                no-caps
                rounded
                padding="xs sm"
              >
                {{ escrowContract?.settlementType == 'released' ? 'Payment received' : 'Refunded' }}
                <q-icon :name="escrowContract?.settlementType == 'released' ? 'check_circle' : 'mdi-cash-refund'" class="q-ml-xs"/>
                <q-menu :class="['q-pa-sm', darkMode ? 'pt-dark' : 'text-black']">
                  <div class="ellipsis">
                    Transaction:
                    {{ escrowContract?.settlementTxid }}
                  </div>
                  <q-btn
                    flat padding="none"
                    no-caps label="View transaction"
                    :href="escrowContract?.settlementTxLink"
                    target="_blank"
                    class="text-underline"
                  />
                </q-menu>
              </q-btn>
              <q-btn
                v-if="escrowContract?.fundingTxid && escrowContract?.fundingVout >= 0"
                flat
                color="green"
                no-caps
                rounded
                padding="xs sm"
              >
                Payment sent
                <q-icon name="credit_score" class="q-ml-xs"/>
                <q-menu :class="['q-pa-sm', darkMode ? 'pt-dark' : 'text-black']">
                  <div class="ellipsis">
                    Transaction:
                    {{ escrowContract?.fundingTxid }}
                  </div>
                  <q-btn
                    flat padding="none"
                    no-caps label="View transaction"
                    :href="escrowContract?.fundingTxLink"
                    target="_blank"
                    class="text-underline"
                  />
                </q-menu>
              </q-btn>
            </div>
            <div class="row no-wrap items-center">
              <div
                class="q-mb-sm rounded-borders q-space"
                style="position:relative;" v-ripple
                @click="copyToClipboard(escrowContract?.address)"
              >
                <div class="text-caption text-grey top">Address</div>
                <div style="word-break: break-all;">
                  {{ escrowContract?.address }}
                  <q-icon name="content_copy"/>
                </div>
              </div>
              <q-btn
                flat
                icon="qr_code"
                size="1.5em"
                padding="md"
                @click="() => tab='qrcode'"
              />
            </div>
    
            <div
              class="q-mb-sm rounded-borders"
              style="position:relative;" v-ripple
              @click="copyToClipboard(escrowContract?.sellerAddress)"
            >
              <div class="text-caption text-grey top">Recipient</div>
              <div style="word-break: break-all;">
                {{ escrowContract?.sellerAddress }}
                <q-icon name="content_copy"/>
              </div>
            </div>

            <div
              class="q-mb-sm rounded-borders"
              style="position:relative;" v-ripple
              @click="copyToClipboard(escrowContract?.deliveryServiceAddress)"
            >
              <div class="text-caption text-grey top">Delivery fee receipient</div>
              <div v-if="escrowContract?.deliveryFeeKeyNft?.currentAddress" style="word-break: break-all;">
                {{ escrowContract?.deliveryFeeKeyNft?.currentAddress }}
                <q-icon name="content_copy"/>
              </div>
              <div v-else class="text-grey">
                None
              </div>
            </div>
    
            <q-separator :dark="darkMode" spaced/>
            <div class="q-mb-sm" @click="() => toggleAmountsDisplay()">
              <div class="row items-start">
                <div class="text-grey q-space">Amount</div>
                <div v-if="displayBch">{{ escrowContract?.bchAmounts?.amount }} BCH</div>
                <div v-else>{{ fiatAmounts?.amount }} {{ currency }}</div>
              </div>
              <div class="q-pl-sm">
                <div class="row items-start">
                  <div class="text-grey q-space">Delivery fee</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.deliveryFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.deliveryFee }} {{ currency }}</div>
                </div>
        
                <div class="row items-start">
                  <div class="text-grey q-space">Service fee</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.serviceFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.serviceFee }} {{ currency }}</div>
                </div>
        
                <div class="row items-start">
                  <div class="text-grey q-space">Arbitration fee</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.arbitrationFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.arbitrationFee }} {{ currency }}</div>
                </div>
    
                <div class="row items-start">
                  <div class="text-grey q-space">Network fee</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.networkFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.networkFee }} {{ currency }}</div>
                </div>
              </div>
    
              <div class="row items-start">
                <div class="text-grey q-space">Total</div>
                <div v-if="displayBch">{{ escrowContract?.bchAmounts?.total }} BCH</div>
                <div v-else>{{ fiatAmounts?.total }} {{ currency }}</div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="qrcode" class="q-pa-none">
            <div class="row items-center no-wrap">
              <q-btn flat round icon="arrow_back" @click="() => tab = 'details'"/>
              <div class="q-space text-h5">Scan to pay</div>
            </div>
            <div class="row items-center justify-center">
              <div class="col-qr-code">
                <qr-code :text="qrCodeData"/>
              </div>
            </div>
            <q-input
              dense
              outlined
              readonly
              autogrow
              :dark="darkMode"
              :model-value="qrCodeData"
              class="q-pt-sm"
            />
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { BchPrice, EscrowContract } from 'src/marketplace/objects'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { computed, defineComponent, ref, watch } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'EscrowContractDialog',
  props: {
    modelValue: Boolean,
    escrowContract: EscrowContract,
    bchPrice: BchPrice,
    currency: String,
  },
  emits: [
    'update:modelValue',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  setup(props, { emit: $emit }) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const tab = ref('details') // details | qrcode

    const fiatAmounts = computed(() => {
      const data = {
        amount: null,
        serviceFee: null,
        arbitrationFee: null,
        deliveryFee: null,
        networkFee: null,
        total: null,
      }
      if (!isFinite(props.bchPrice?.price)) return data
      const rate = props.bchPrice?.price
      const round = (amount, decimals) => Math.round(amount * 10 ** decimals) / 10 ** decimals
      data.amount = round(props.escrowContract?.bchAmounts?.amount * rate, 3)
      data.serviceFee = round(props.escrowContract?.bchAmounts?.serviceFee * rate, 3)
      data.arbitrationFee = round(props.escrowContract?.bchAmounts?.arbitrationFee * rate, 3)
      data.deliveryFee = round(props.escrowContract?.bchAmounts?.deliveryFee * rate, 3)
      data.networkFee = round(props.escrowContract?.bchAmounts?.networkFee * rate, 3)
      data.total = round(props.escrowContract?.bchAmounts?.total * rate, 3)

      return data
    })

    const displayBch = ref(true)
    function toggleAmountsDisplay() {
      if (!isFinite(props.bchPrice?.price)) {
        displayBch.value = true
        return
      }
      displayBch.value = !displayBch.value
    }

    const qrCodeData = computed(() => {
      return `${props.escrowContract?.address}?amount=${props.escrowContract?.bchAmounts?.total}`
    })

    function copyToClipboard(value, message='') {
      this.$copyText(value)
        .then(() => {
          $q.notify({
            message: message || 'Copied to clipboard',
            timeout: 800,
            icon: 'mdi-clipboard-check',
            color: 'blue-9'
          })
        })
        .catch(() => {})
    }

    return {
      darkMode,
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,
      tab,

      fiatAmounts,
      displayBch,
      toggleAmountsDisplay,

      qrCodeData,

      copyToClipboard,
    }
  },
})
</script>
<style lang="scss" scoped>
  .col-qr-code {
    display: flex;
    justify-content: center;
    border-radius: 16px;
    border: 4px solid #ed5f59;
    background: white;
    padding: 12px;
  }
</style>
