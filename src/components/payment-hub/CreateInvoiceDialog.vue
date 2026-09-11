<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)" style="width: 400px; max-width: 90vw;">
      <q-form ref="formRef" @submit="onOKClick">
        <q-card-section>
          <div class="text-h6">{{ $t('CreateInvoice') }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none q-gutter-y-md">
          <div class="row q-col-gutter-sm">
            <div class="col">
              <q-input
                v-model.number="form.amount"
                :label="($t('Amount')) + ' *'"
                outlined
                dense
                type="number"
                inputmode="decimal"
                step="any"
                min="0.00000001"
                lazy-rules
                :rules="[
                  val => !!val || $t('Required'),
                  val => val > 0 || $t('AmountMustBePositive', 'Amount must be positive'),
                ]"
                hide-bottom-space
              />
            </div>
            <div class="col-4">
              <q-select
                v-model="form.currency"
                :options="currencyOptions"
                :label="$t('Currency')"
                outlined
                dense
                emit-value
                map-options
                hide-bottom-space
              />
            </div>
          </div>
          <q-input
            v-model="form.memo"
            :label="$t('Memo')"
            outlined
            dense
            autogrow
            :placeholder="$t('Memo')"
          />
          <q-input
            v-model.number="form.expiryMinutes"
            :label="$t('ExpiryMinutes')"
            outlined
            dense
            type="number"
          />
          <q-input
            v-model="form.redirectUrl"
            :label="$t('RedirectURL')"
            outlined
            dense
            type="url"
            placeholder="https://..."
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
const props = defineProps({
  storeData: Object,
})

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const formRef = ref(null)

const form = reactive({
  amount: 0,
  currency: props.storeData?.default_currency ?? 'BCH',
  memo: '',
  expiryMinutes: props.storeData?.invoice_expiration_minutes ?? 0,
  redirectUrl: '',
})

const currencyOptions = [
  { label: 'BCH', value: 'BCH' },
  { label: 'USD', value: 'USD' },
  { label: 'PHP', value: 'PHP' },
  { label: 'EUR', value: 'EUR' }
]

async function onOKClick() {
  const isValid = await formRef.value.validate()
  if (!isValid) return
  onDialogOK({
    storeId: props.storeData?.id,
    amount: form.amount,
    currency: form.currency,
    memo: form.memo,
    expiryMinutes: form.expiryMinutes,
    redirectUrl: form.redirectUrl,
  })
}

function onCancelClick() {
  onDialogCancel()
}
</script>
