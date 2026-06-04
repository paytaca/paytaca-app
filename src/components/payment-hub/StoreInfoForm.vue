<template>
  <q-form ref="formRef" @submit="onSubmit">
    <div class="q-gutter-y-sm">
      <q-input
        v-model="form.name"
        :label="$t('StoreName', {}, 'Store Name') + ' *'"
        outlined
        dense
        autofocus
        lazy-rules
        :rules="[val => !!val || $t('Required', {}, 'Required')]"
        hide-bottom-space
      />
      
      <div class="q-gutter-y-sm q-mt-md">
        <q-input
          v-model="form.logo_url"
          :label="$t('LogoURL', {}, 'Logo URL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
        />

        <q-input
          v-model="form.website_url"
          :label="$t('WebsiteURL', {}, 'Website URL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
        />

        <q-input
          v-model="form.support_email"
          :label="$t('SupportEmail', {}, 'Support Email')"
          outlined
          dense
          type="email"
        />

        <q-select
          v-model="form.default_currency"
          :options="currencyOptions"
          :label="$t('DefaultCurrency', {}, 'Default Currency')"
          outlined
          dense
          emit-value
          map-options
        />

        <q-separator class="q-my-sm" />
        <div class="text-subtitle2 text-grey-7">{{ $t('WebhookSettings', {}, 'Webhook Settings') }}</div>

        <q-input
          v-model="form.webhook_url"
          :label="$t('WebhookURL', {}, 'Webhook URL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
        />

        <q-input
          v-model="form.webhook_secret"
          :label="$t('WebhookSecret', {}, 'Webhook Secret')"
          outlined
          dense
          type="password"
        />

        <q-separator class="q-my-sm" />
        <div class="text-subtitle2 text-grey-7">{{ $t('AdvancedSettings', {}, 'Advanced Settings') }}</div>

        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-input
              v-model.number="form.invoice_expiration_minutes"
              :label="$t('ExpiryMinutes', {}, 'Invoice Expiry (min)')"
              outlined
              dense
              type="number"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="form.underpayment_tolerance_percent"
              :label="$t('TolerancePercent', {}, 'Tolerance (%)')"
              outlined
              dense
              type="number"
              step="0.01"
              suffix="%"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row q-mt-md q-gutter-sm">
      <q-btn
        flat
        color="grey"
        :label="$t('Cancel', {}, 'Cancel')"
        class="col"
        @click="$emit('cancel')"
      />
      <q-btn
        unelevated
        rounded
        color="pt-primary1"
        :label="storeData?.id ? $t('Update', {}, 'Update') : $t('Set', {}, 'Set')"
        class="col"
        type="submit"
      />
    </div>
  </q-form>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps({
  storeData: {
    type: Object,
    default: () => ({})
  }
})

const $emit = defineEmits(['cancel', 'saved'])

const formRef = ref(null)

const currencyOptions = [
  { label: 'USD', value: 'USD' },
  { label: 'PHP', value: 'PHP' },
  { label: 'BCH', value: 'BCH' },
  { label: 'EUR', value: 'EUR' }
]

const form = reactive({
  name: '',
  webhook_url: '',
  webhook_secret: '',
  default_currency: 'USD',
  website_url: '',
  logo_url: '',
  support_email: '',
  invoice_expiration_minutes: 15,
  underpayment_tolerance_percent: 0.05
})

onMounted(() => {
  if (props.storeData) {
    Object.keys(form).forEach(key => {
      if (props.storeData[key] !== undefined) {
        form[key] = props.storeData[key]
      }
    })
  }
})

async function onSubmit() {
  const isValid = await formRef.value.validate()
  if (isValid) {
    $emit('saved', { ...props.storeData, ...form })
  }
}

/**
 * Public method to reset the form, similar to MerchantInfoForm pattern
 */
function resetForm() {
  form.name = ''
  form.webhook_url = ''
  form.webhook_secret = ''
  form.default_currency = 'USD'
  form.website_url = ''
  form.logo_url = ''
  form.support_email = ''
  form.invoice_expiration_minutes = 15
  form.underpayment_tolerance_percent = 0.05
}

defineExpose({
  resetForm,
  validate: () => formRef.value.validate()
})
</script>
