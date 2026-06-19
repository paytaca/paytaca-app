<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onOKClick">
        <q-card-section>
          <div class="text-h6">{{ $t('CreatePlan') || 'Create Plan' }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <q-input
            v-model="form.name"
            :label="($t('PlanName') || 'Plan Name') + ' *'"
            outlined
            dense
            autofocus
            lazy-rules
            :rules="[val => !!val || $t('Required')]"
            hide-bottom-space
          />
          
          <q-input
            v-model="form.description"
            :label="$t('DescriptionOptional') || 'Description (Optional)'"
            outlined
            dense
            type="textarea"
            rows="3"
            hide-bottom-space
          />

          <div class="row q-col-gutter-sm">
            <div class="col">
              <q-input
                v-model.number="form.amount"
                :label="($t('Amount') || 'Amount') + ' *'"
                outlined
                dense
                type="number"
                step="any"
                lazy-rules
                :rules="[
                  val => !!val || $t('Required'),
                  val => val > 0 || 'Amount must be positive'
                ]"
                hide-bottom-space
              />
            </div>
            <div class="col-4">
              <q-select
                v-model="form.currency"
                :options="currencyOptions"
                :label="$t('Currency') || 'Currency'"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
              />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col">
              <q-input
                v-model.number="form.period_value"
                :label="($t('IntervalValue') || 'Interval Value') + ' *'"
                outlined
                dense
                type="number"
                step="1"
                lazy-rules
                :rules="[
                  val => !!val || $t('Required'),
                  val => Number.isInteger(val) && val > 0 || 'Must be a positive integer'
                ]"
                hide-bottom-space
              />
            </div>
            <div class="col-5">
              <q-select
                v-model="form.period_type"
                :options="periodTypeOptions"
                :label="($t('IntervalUnit') || 'Unit') + ' *'"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat :label="$t('Cancel')" color="grey" @click="onCancelClick" />
          <q-btn unelevated rounded :label="$t('Create')" color="pt-primary1" type="submit" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const periodTypeOptions = [
  { label: 'Days', value: 'days' },
  { label: 'Blocks', value: 'blocks' }
]

const currencyOptions = [
  { label: 'BCH', value: 'BCH' },
  { label: 'USD', value: 'USD' },
  { label: 'PHP', value: 'PHP' },
  { label: 'EUR', value: 'EUR' }
]

const form = reactive({
  name: '',
  description: '',
  amount: null,
  currency: 'BCH',
  period_value: 30,
  period_type: 'days'
})

async function onOKClick() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  const payload = {
    name: form.name,
    description: form.description,
    amount: form.amount,
    currency: form.currency
  }

  if (form.period_type === 'days') {
    payload.period_days = form.period_value
  } else {
    payload.period_blocks = form.period_value
  }

  onDialogOK(payload)
}

function onCancelClick() {
  onDialogCancel()
}
</script>
