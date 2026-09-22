<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin br-20" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-weight-bold">{{ $t('UpdateSubscription') }}</div>
        <div class="text-caption text-grey q-mb-md">
          {{ $t('UpdateSubscriptionMsg', 'Modify the pledge amount or billing period for this subscription.') }}
        </div>

        <q-form @submit.prevent="submitUpdate">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-8">
              <q-input
                v-model.number="form.pledge"
                type="number"
                :label="$t('NewPledge')"
                outlined
                dense
                reactive-rules
                bottom-slots
                :rules="[
                  val => !!val || $t('Required'),
                  val => !subscription.max_pledge || val <= maxPledge || errorMsgs.maxPledge
                ]"
              >
                <template v-slot:append>
                  <q-btn
                    flat
                    dense
                    :label="$t('Max')"
                    @click="form.pledge = maxPledge"
                  />
                </template>
                <template v-slot:hint>
                  <div v-if="subscription.payment_category && pledgeValueSats">
                    ~{{ satsToBchDisplay(pledgeValueSats) }} BCH
                  </div>

                </template>
              </q-input>
            </div>
            <div class="col-4">
              <q-select
                v-model="form.pledgeUnit"
                :options="pledgeUnitOptions"
                label="Unit"
                outlined
                dense
                options-dense
              />
            </div>
          </div>
          <div v-if="minFeeSats && pledgeValueSats" class="q-mb-md q-gutter-y-sm">
            <div>
              <div class="text-caption text-grey">
                Paytaca Fee
                <template v-if="!subscription.payment_category">(Approx.)</template>:
              </div>
              <div>{{ satsToBchDisplay(feeSats) }} BCH</div>
            </div>
            
            <div>
              <div class="text-caption text-grey">Minimum Fee Sats (0.01 USD)</div>
              <div>{{ satsToBchDisplay(minFeeSats) }} BCH</div>
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-8">
              <q-input
                v-model.number="form.period"
                type="number"
                label="New Period"
                outlined
                dense
                :rules="[
                  val => !!val || 'Period is required',
                  () => !subscription.min_period || finalPeriodBlocks >= subscription.min_period || errorMsgs.minPeriod,
                  () => !subscription.max_period || finalPeriodBlocks <= subscription.max_period || errorMsgs.maxPeriod,
                ]"
              />
            </div>
            <div class="col-4">
              <q-select
                v-model="form.periodUnit"
                :options="['Blocks', 'Days', 'Months']"
                :label="$t('Unit')"
                outlined
                dense
                options-dense
              />
            </div>
          </div>

          <q-banner dense class="bg-grey-2 q-mb-md rounded-borders" :class="darkMode ? 'bg-grey-9 text-white' : 'text-black'">
            <template v-slot:avatar>
              <q-icon name="info" color="grey" />
            </template>
            {{ $t('UpdateNftFeeMsg', 'A network miner fee of approx. 1,500 satoshis (BCH) will be deducted from your merchant wallet to process this update.') }}
          </q-banner>

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancel" color="grey" v-close-popup />
            <q-btn unelevated rounded label="Update" color="pt-primary1" type="submit" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { useSubscriptionUtils } from 'src/composables/payment-hub/usePaymentHub'

const props = defineProps({
  subscription: {
    type: Object,
    required: true
  }
})

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const { t: $t } = useI18n();
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const { satsToBchDisplay } = useSubscriptionUtils();

const planCurrency = computed(() => props.subscription.plan_details?.currency)
const bchPrice = computed(() => {
  if (!planCurrency || planCurrency === 'BCH') return 1

  const priceFromSubscription = parseFloat(props.subscription.bch_rate_value);
  if (priceFromSubscription) return priceFromSubscription;

  return $store.state.global.fiatRates?.[planCurrency] || 0
})

const pledgeUnitOptions = computed(() => {
  const options = [];
  if (!props.subscription?.payment_category) {
    options.push('Satoshis', 'BCH');
  }
  if (planCurrency.value !== 'BCH' && bchPrice.value) {
    options.push(planCurrency.value)
  }
  return options
})

const form = ref({
  pledge: 0,
  pledgeUnit: '',
  period: 0,
  periodUnit: 'Blocks'
})

onMounted(() => resetForm())
function resetForm() {
  const sub = props.subscription;
  if (sub.payment_category) {
    const decimals = sub.plan_details?.token?.decimals ?? 0;
    form.value.pledge = sub.pledge_tokens / 10 ** decimals;
    form.value.pledgeUnit = planCurrency.value
  } else {
    form.value.pledge = sub.pledge_satoshis
    form.value.pledgeUnit = 'Satoshis';

    if (form.value.pledge % 1e8 === 0) {
      form.value.pledge = form.value.pledge / 1e8
      form.value.pledgeUnit = 'BCH'
    }
  }

  form.value.period = sub.period_blocks;
  form.value.periodUnit = 'Blocks';

  // Initialize with better units if possible
  if (props.subscription.period_blocks % 4320 === 0) {
    form.value.period = props.subscription.period_blocks / 4320
    form.value.periodUnit = 'Months'
  } else if (props.subscription.period_blocks % 144 === 0) {
    form.value.period = props.subscription.period_blocks / 144
    form.value.periodUnit = 'Days'
  }
}

const pledgeValueSats = computed(() => {
  if (form.value.pledgeUnit === 'BCH') return Math.floor(form.value.pledge * 1e8);
  if (form.value.pledgeUnit === 'Satoshis') return form.value.pledge;

  if (!bchPrice.value) return null;
  return Math.floor((form.value.pledge / bchPrice.value) * 1e8);
})
const feeSats = computed(() => {
  const sub = props.subscription;
  const fee = Math.floor(pledgeValueSats.value / 100)
  if (fee > sub.max_fee) return sub.max_fee;
  if (fee < minFeeSats.value) return minFeeSats.value;
  return fee;
})

const usdPrice = computed(() => $store.getters['market/getAssetPrice']('bch', 'USD'))
const minFeeSats = computed(() => {
  // This is 0.01 USD
  return Math.floor(1e6 / usdPrice.value);
})

const maxPledge = computed(() => {
  const sub = props.subscription;
  const maxUnit = sub.max_pledge;
  if (sub.payment_category) {
    const decimals = sub.plan_details?.token?.decimals ?? 0;
    return maxUnit / 10 ** decimals;
  } else {
    if (form.value.pledgeUnit === 'BCH') return maxUnit / 1e8;
    if (form.value.pledgeUnit === planCurrency.value && bchPrice.value) {
      const bch = maxUnit / 1e8;
      return bch * bchPrice.value;
    }
    return maxUnit;
  }
})

const finalPledgeUnits = computed(() => {
  const sub = props.subscription
  if (sub.payment_category) {
    const decimals = sub.plan_details?.token?.decimals ?? 0;    
    return Math.floor(form.value.pledge * 10 ** decimals);
  }

  if (form.value.pledgeUnit === 'BCH') {
    return Math.floor(form.value.pledge * 1e8)
  }
  if (form.value.pledgeUnit === planCurrency && planCurrency !== 'BCH') {
    if (!bchPrice.value) return props.subscription.pledge_satoshis
    const bchAmount = parseFloat(form.value.pledge) / bchPrice.value
    return Math.floor(bchAmount * 1e8)
  }
  return form.value.pledge
})

const finalPeriodBlocks = computed(() => {
  if (form.value.periodUnit === 'Days') {
    return form.value.period * 144
  }
  if (form.value.periodUnit === 'Months') {
    return form.value.period * 4320
  }
  return form.value.period
})

function submitUpdate() {
  onDialogOK({
    new_pledge: finalPledgeUnits.value,
    new_fee_sats: feeSats.value,
    new_period: finalPeriodBlocks.value,
  })
}

const errorMsgs = computed(() => {
  const subscription = props.subscription;
  return {
    maxPledge: $t(
      'CannotExceedMaxPledgeMsg', { maxPledge: maxPledge.value },
      `Cannot exceed max pledge of ${maxPledge.value}`
    ),
    minPeriod: $t(
      'MinPeriodMsg', { blocks: subscription.min_period },
      `Cannot be less than min period of ${subscription.min_period} blocks`
    ),
    maxPeriod: $t(
      'MaxPeriodMsg', { blocks: subscription.max_period },
      `Cannot exceed max period of ${subscription.max_period} blocks`),
  }
})
</script>
