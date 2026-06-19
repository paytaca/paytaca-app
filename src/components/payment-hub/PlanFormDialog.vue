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

          <q-input
            v-model.number="form.amount"
            :label="($t('AmountBCH') || 'Amount (BCH)') + ' *'"
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

          <q-select
            v-model="form.interval_type"
            :options="intervalOptions"
            :label="($t('Interval') || 'Interval') + ' *'"
            outlined
            dense
            emit-value
            map-options
            lazy-rules
            :rules="[val => !!val || $t('Required')]"
            hide-bottom-space
          />
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

const intervalOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' }
]

const form = reactive({
  name: '',
  description: '',
  amount: null,
  interval_type: 'MONTHLY'
})

async function onOKClick() {
  const isValid = await formRef.value.validate()
  if (!isValid) return

  const periodMap = {
    'DAILY': 1,
    'WEEKLY': 7,
    'MONTHLY': 30,
    'YEARLY': 365
  }

  onDialogOK({
    name: form.name,
    description: form.description,
    amount: form.amount,
    currency: 'BCH',
    period_days: periodMap[form.interval_type] || 30
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>
