<template>
  <q-form ref="formRef" @submit="onSubmit">
    <div class="q-gutter-y-sm">
      <q-input
        v-model="form.name"
        :label="$t('StoreName') + ' *'"
        outlined
        dense
        autofocus
        lazy-rules
        :rules="[val => !!val || $t('Required')]"
        hide-bottom-space
      />
      
      <div class="q-mt-md">
        <div class="text-subtitle2 text-grey-7 q-mb-xs">{{ $t('StoreLogo') }}</div>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-file
              v-model="form.logo"
              :label="$t('UploadLogo')"
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
              :label="$t('LogoURL')"
              outlined
              dense
              type="url"
              placeholder="https://..."
              @update:model-value="form.logo = null"
            />
          </div>
        </div>
        <div class="text-caption text-grey q-mt-xs">
          {{ $t('LogoDescription') }}
        </div>
      </div>

      <div class="q-gutter-y-sm q-mt-md">
        <q-input
          v-model="form.website_url"
          :label="$t('WebsiteURL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
        />

        <q-input
          v-model="form.support_email"
          :label="$t('SupportEmail')"
          outlined
          dense
          type="email"
        />

        <q-select
          v-model="form.default_currency"
          :options="currencyOptions"
          :label="$t('DefaultCurrency')"
          outlined
          dense
          emit-value
          map-options
        />

        <q-separator class="q-my-sm" />
        <div class="text-subtitle2 text-grey-7">{{ $t('WebhookSettings') }}</div>

        <q-input
          v-model="form.webhook_url"
          :label="$t('WebhookURL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
        />

        <q-separator class="q-my-sm" />
        <div class="text-subtitle2 text-grey-7">{{ $t('AdvancedSettings') }}</div>

        <div class="row q-col-gutter-sm">
          <div class="col-12">
            <q-input
              v-model.number="form.invoice_expiration_minutes"
              :label="$t('ExpiryMinutes')"
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
        :label="$t('Cancel')"
        class="col"
        @click="$emit('cancel')"
      />
      <q-btn
        unelevated
        rounded
        color="pt-primary1"
        :label="storeData?.id ? $t('Update') : $t('Set')"
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
      if (key === 'logo' || key === 'logo_url') {
        // logo: never populate the file picker with a string URL (must be File or null)
        // logo_url: always leave empty on edit to avoid sending back server URLs
        return
      }

      if (props.storeData[key] !== undefined) {
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
