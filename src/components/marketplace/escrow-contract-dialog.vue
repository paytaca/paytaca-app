<template>
  <q-dialog v-model="innerVal" ref="dialogRef" @hide="onDialogHide" position="bottom">
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row items-center q-pb-sm">
          <div class="text-h5 q-space">{{ $t('Escrow') }}</div>
          <q-btn flat icon="close" padding="sm" v-close-popup class="close-button" />
        </div>
        <q-tab-panels v-model="tab" style="background: none;" animated>
          <q-tab-panel name="details" class="q-pa-none">
            <div class="row items-center">
              <q-btn
                v-if="escrowContract?.isSettled || escrowContract?.isFunded"
                flat
                no-caps
                color="green"
                padding="xs none"
              >
                <template v-if="escrowContract?.isSettled">
                  {{ escrowContract?.settlementType == 'released' ? $t('PaymentReleased') : $t('PaymentRefunded') }}
                  <q-icon :name="escrowContract?.settlementType == 'released' ? 'check_circle' : 'mdi-cash-refund'" class="q-ml-xs"/>
                </template>
                <template v-else-if="escrowContract?.isFunded">
                  {{ $t('PaymentReceivedByEscrow') }}
                  <q-icon name="credit_score" class="q-ml-xs"/>
                </template>

                <q-menu class="q-pa-sm pt-card text-bow" :class="getDarkModeClass(darkMode)">
                  <template v-if="escrowContract?.settlementTxid">
                    <div class="text-caption top">{{ $t('SettlementTransaction') }}:</div>
                    <div class="ellipsis">{{ escrowContract?.settlementTxid }}</div>
                    <q-btn
                      flat padding="none"
                      no-caps
                      :label="$t('ViewTransaction')"
                      :href="escrowContract?.settlementTxLink"
                      target="_blank"
                      class="text-underline button button-text-primary"
                      :class="getDarkModeClass(darkMode)"
                    />
                  </template>
                  <q-separator
                    v-if="escrowContract?.settlementTxid && escrowContract?.fundingTxid"
                    spaced
                  />
                  <template v-if="escrowContract?.fundingTxid">
                    <div class="text-caption top">{{ $t('PaymentTransaction') }}:</div>
                    <div class="ellipsis">{{ escrowContract?.fundingTxid }}</div>
                    <q-btn
                      flat padding="none"
                      no-caps
                      :label="$t('ViewTransaction')"
                      :href="escrowContract?.fundingTxLink"
                      target="_blank"
                      class="text-underline button button-text-primary"
                      :class="getDarkModeClass(darkMode)"
                    />
                  </template>
                </q-menu>
              </q-btn>
            </div>
            <div class="row no-wrap items-center">
              <div
                class="q-mb-sm rounded-borders q-space"
                style="position:relative;" v-ripple
                @click="copyToClipboard(escrowContract?.address)"
              >
                <div class="text-caption text-grey top">{{ $t('Address') }}</div>
                <div style="word-break: break-all;">
                  {{ escrowContract?.address }}
                  <q-icon name="content_copy"/>
                </div>
              </div>
              <q-btn
                flat
                :disable="escrowContract?.isFunded"
                icon="qr_code"
                size="1.5em"
                padding="md"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="() => tab='qrcode'"
              />
            </div>

            <div
              class="q-mb-sm rounded-borders"
              style="position:relative;" v-ripple
              @click="copyToClipboard(escrowContract?.sellerAddress)"
            >
              <div class="text-caption text-grey top">{{ $t('Recipient') }}</div>
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
              <div class="text-caption text-grey top">{{ $t('DeliveryFeeRecipient') }}</div>
              <div v-if="escrowContract?.deliveryFeeKeyNft?.currentAddress" style="word-break: break-all;">
                {{ escrowContract?.deliveryFeeKeyNft?.currentAddress }}
                <q-icon name="content_copy"/>
              </div>
              <div v-else class="text-grey">
                {{ $t('None') }}
              </div>
            </div>

            <q-separator :dark="darkMode" spaced/>
            <div class="q-mb-sm" @click="() => toggleAmountsDisplay()">
              <div class="row items-start">
                <div class="text-grey q-space">{{ $t('Amount') }}</div>
                <div v-if="displayBch">{{ escrowContract?.bchAmounts?.amount }} BCH</div>
                <div v-else>{{ fiatAmounts?.amount }} {{ currency }}</div>
              </div>
              <div class="q-pl-sm">
                <div class="row items-start">
                  <div class="text-grey q-space">{{ $t('DeliveryFee') }}</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.deliveryFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.deliveryFee }} {{ currency }}</div>
                </div>

                <div class="row items-start">
                  <div class="text-grey q-space">{{ $t('ServiceFee') }}</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.serviceFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.serviceFee }} {{ currency }}</div>
                </div>

                <div class="row items-start">
                  <div class="text-grey q-space">{{ $t('ArbitrationFee') }}</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.arbitrationFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.arbitrationFee }} {{ currency }}</div>
                </div>

                <div class="row items-start">
                  <div class="text-grey q-space">{{ $t('NetworkFee') }}</div>
                  <div v-if="displayBch">{{ escrowContract?.bchAmounts?.networkFee }} BCH</div>
                  <div v-else>{{ fiatAmounts?.networkFee }} {{ currency }}</div>
                </div>
              </div>

              <div class="row items-start">
                <div class="text-grey q-space">{{ $t('Total') }}</div>
                <div v-if="displayBch">{{ escrowContract?.bchAmounts?.total }} BCH</div>
                <div v-else>{{ fiatAmounts?.total }} {{ currency }}</div>
              </div>
            </div>
          </q-tab-panel>
          <q-tab-panel name="qrcode" class="q-pa-none">
            <div class="row items-center no-wrap">
              <q-btn
                flat
                round
                icon="arrow_back"
                class="button button-text-primary"
                :class="getDarkModeClass(darkMode)"
                @click="() => tab = 'details'"
              />
              <div class="q-space text-h5">{{ $t('ScanToPay') }}</div>
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
            <div class="row items-center justify-end q-mt-sm">
              <q-btn
                rounded
                no-caps
                :label="$t('SendPayment')"
                class="button"
                :to="{ name: 'transaction-send', query: { paymentUrl: qrCodeData, network: 'BCH', assetId: 'bch' }}"
              />
            </div>
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useI18n } from "vue-i18n"

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
    const { t } = useI18n()
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
            message: message || t('CopiedToClipboard'),
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
  methods: {
    getDarkModeClass
  }
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
