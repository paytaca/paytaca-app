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
        <div v-if="previewUrl" class="row justify-center items-start q-mb-sm">
          <img
            :src="previewUrl"
            style="max-height: 120px; max-width: 200px; object-fit: contain;"
            class="rounded-borders"
          />
          <q-btn
            flat
            dense
            color="negative"
            icon="close"
            class="float-right"
            @click="clearLogo"
          />
        </div>
        <div v-if="form.logo" class="text-caption text-grey ellipsis">{{ form.logo.name }}</div>
        <q-input
          v-model="form.logo_url"
          :label="$t('LogoURL')"
          outlined
          dense
          type="url"
          placeholder="https://..."
          :disable="!!form.logo"
          @update:model-value="form.logo = null"
        >
          <template v-slot:append>
            <q-btn type="button" flat dense round icon="attach_file" @click="openFilePicker" />
          </template>
        </q-input>
        <input
          ref="fileInput"
          type="file"
          style="display: none"
          accept=".jpg, .jpeg, .png, .webp"
          @change="onFileChange"
        >
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
import { ref, reactive, onMounted, computed, watch, onUnmounted } from 'vue'
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
const fileInput = ref(null)
const previewUrl = ref('')
let objectUrl = null

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
        if (typeof props.storeData[key] === 'string' && props.storeData[key]) {
          form['logo_url'] = props.storeData[key];
        }
        return
      }

      if (props.storeData[key] !== undefined) {
        form[key] = props.storeData[key]
      }
    })
  }
})

function updatePreview() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
  if (form.logo instanceof File) {
    objectUrl = URL.createObjectURL(form.logo)
    previewUrl.value = objectUrl
  } else if (form.logo_url) {
    previewUrl.value = form.logo_url
  } else {
    previewUrl.value = ''
  }
}

watch([() => form.logo, () => form.logo_url], updatePreview, { immediate: true })

onUnmounted(() => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
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
  clearLogo()
  form.support_email = ''
  form.invoice_expiration_minutes = 15
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0] || null
  if (file) {
    form.logo = file
    form.logo_url = ''
  }
}

function clearLogo() {
  form.logo = null
  form.logo_url = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

defineExpose({
  resetForm,
  validate: () => formRef.value.validate()
})
</script>
