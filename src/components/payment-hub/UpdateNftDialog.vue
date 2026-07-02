<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin br-20" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-weight-bold">Update Subscription</div>
        <div class="text-caption text-grey q-mb-md">
          Modify the pledge amount or billing period for this subscription.
        </div>

        <q-form @submit.prevent="submitUpdate">
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-8">
              <q-input
                v-model.number="form.pledge"
                type="number"
                label="New Pledge"
                outlined
                dense
                :rules="[
                  val => !!val || 'Pledge is required',
                  () => finalPledgeSats <= subscription.max_pledge || `Cannot exceed max pledge of ${subscription.max_pledge} sats`
                ]"
              />
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
                  () => !subscription.min_period || finalPeriodBlocks >= subscription.min_period || `Cannot be less than min period of ${subscription.min_period} blocks`,
                  () => !subscription.max_period || finalPeriodBlocks <= subscription.max_period || `Cannot exceed max period of ${subscription.max_period} blocks`
                ]"
              />
            </div>
            <div class="col-4">
              <q-select
                v-model="form.periodUnit"
                :options="['Blocks', 'Days', 'Months']"
                label="Unit"
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
            A network miner fee of approx. 1,500 satoshis (BCH) will be deducted from your merchant wallet to process this update.
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
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  subscription: {
    type: Object,
    required: true
  }
})

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const $store = useStore()
const darkMode = computed(() => $store.state.global.darkMode)

const planCurrency = props.subscription.plan_details?.currency
const pledgeUnitOptions = ['Satoshis', 'BCH']
if (planCurrency && planCurrency !== 'BCH') {
  pledgeUnitOptions.push(planCurrency)
}

const bchPrice = computed(() => {
  if (!planCurrency || planCurrency === 'BCH') return 1
  return $store.state.global.fiatRates?.[planCurrency] || 0
})

const form = ref({
  pledge: props.subscription.pledge_satoshis,
  pledgeUnit: 'Satoshis',
  period: props.subscription.period_blocks,
  periodUnit: 'Blocks'
})

// Initialize with better units if possible
if (props.subscription.period_blocks % 4320 === 0) {
  form.value.period = props.subscription.period_blocks / 4320
  form.value.periodUnit = 'Months'
} else if (props.subscription.period_blocks % 144 === 0) {
  form.value.period = props.subscription.period_blocks / 144
  form.value.periodUnit = 'Days'
}

if (props.subscription.pledge_satoshis % 100000000 === 0) {
  form.value.pledge = props.subscription.pledge_satoshis / 100000000
  form.value.pledgeUnit = 'BCH'
}

const finalPledgeSats = computed(() => {
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
    new_pledge: finalPledgeSats.value,
    new_period: finalPeriodBlocks.value
  })
}
</script>
