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
      
      <div class="q-mt-md">
        <div class="text-subtitle2 text-grey-7 q-mb-xs">{{ $t('StoreLogo', {}, 'Store Logo') }}</div>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-file
              v-model="form.logo"
              :label="$t('UploadLogo', {}, 'Upload Image')"
              outlined
              dense
              accept=".jpg, .jpeg, .png, .webp"
              max-file-size="2048000"
              @update:model-value="form.logo_url = ''"
            >
              <template v-slot:prepend>
                <q-icon name="attach_file" />
              </template>
            </q-file>
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model="form.logo_url"
              :label="$t('LogoURL', {}, 'External Logo URL')"
              outlined
              dense
              type="url"
              placeholder="https://..."
              @update:model-value="form.logo = null"
            />
          </div>
        </div>
        <div class="text-caption text-grey q-mt-xs">
          {{ $t('LogoDescription', {}, 'Upload a file or provide a URL to an image.') }}
        </div>
      </div>

      <div class="q-gutter-y-sm q-mt-md">
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

        <q-separator class="q-my-sm" />
        <div class="text-subtitle2 text-grey-7">{{ $t('AdvancedSettings', {}, 'Advanced Settings') }}</div>

        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input
              v-model.number="form.invoice_expiration_minutes"
              :label="$t('ExpiryMinutes', {}, 'Invoice Expiry (min)')"
              outlined
              dense
              type="number"
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useStore } from 'vuex'

const props = defineProps({
  storeData: {
    type: Object,
    default: () => ({})
  }
})

const $emit = defineEmits(['cancel', 'saved'])

const $store = useStore()
const formRef = ref(null)

const currencyOptions = computed(() => {
  return $store.getters['market/currencyOptions'].map(c => ({
    label: `${String(c.symbol).toUpperCase()} - ${c.name}`,
    value: String(c.symbol).toUpperCase()
  }))
})

const form = reactive({
  name: '',
  webhook_url: '',
  default_currency: 'USD',
  website_url: '',
  logo: null,
  logo_url: '',
  support_email: '',
  invoice_expiration_minutes: 15
})

onMounted(() => {
  // Ensure currency options are loaded
  $store.dispatch('market/updateSupportedCurrencies', { force: false })

  if (props.storeData) {
    Object.keys(form).forEach(key => {
      if (key === 'logo') {
        // Never populate the file picker (form.logo) with a string URL
        // form.logo should only ever be a File or null
        return
      }

      if (key === 'logo_url') {
        // 'logo_url' is write-only. We populate our input from the 
        // returned 'logo' field if it looks like an external URL.
        if (typeof props.storeData.logo === 'string' && props.storeData.logo.startsWith('http')) {
          form.logo_url = props.storeData.logo
        }
      } else if (props.storeData[key] !== undefined) {
        form[key] = props.storeData[key]
      }
    })
  }
})

async function onSubmit() {
  const isValid = await formRef.value.validate()
  if (isValid) {
    const result = { ...props.storeData, ...form }
    
    // Strict separation: 
    // 1. 'logo' must be a File object if present
    if (!(form.logo instanceof File)) {
      delete result.logo
    }

    // 2. 'logo_url' must be a non-empty string if present
    if (!form.logo_url) {
      delete result.logo_url
    }
    
    $emit('saved', result)
  }
}

/**
 * Public method to reset the form
 */
function resetForm() {
  form.name = ''
  form.webhook_url = ''
  form.default_currency = 'USD'
  form.website_url = ''
  form.logo = null
  form.logo_url = ''
  form.support_email = ''
  form.invoice_expiration_minutes = 15
}

defineExpose({
  resetForm,
  validate: () => formRef.value.validate()
})
</script>
