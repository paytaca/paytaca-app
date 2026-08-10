<template>
  <div class="json-form-renderer">
    <q-form @submit="onSubmit" ref="formRef">
      <JSONFormPreview
        v-model="innerFormData"
        :schema-data="schemaData"
        :form-data-errors="formErrors"
        @update:formDataErrors="formErrors = $event"
      />
      <div v-if="!readOnly" class="row q-mt-md q-gutter-sm justify-end">
        <q-btn
          v-if="showReset"
          outline
          no-caps
          color="grey"
          :label="$t('Reset', {}, 'Reset')"
          @click="resetForm"
        />
        <q-btn
          no-caps
          class="button"
          :loading="loading"
          :label="submitLabel || $t('Submit', {}, 'Submit')"
          type="submit"
        />
      </div>
    </q-form>
    <div v-if="debug" class="q-mt-md">
      <q-expansion-item
        dense
        :label="$t('DebugData', {}, 'Debug Data')"
        header-class="text-caption text-grey"
      >
        <pre class="debug-output">{{ JSON.stringify({ data: innerFormData, errors: formErrors }, null, 2) }}</pre>
      </q-expansion-item>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch, computed } from 'vue'
import JSONFormPreview from 'src/components/marketplace/JSONFormPreview.vue'

export default defineComponent({
  name: 'JSONFormRenderer',
  components: {
    JSONFormPreview,
  },
  emits: [
    'update:modelValue',
    'submit',
    'change',
  ],
  props: {
    modelValue: {
      type: Object,
      default: () => ({}),
    },
    schemaData: {
      type: [Array, Object],
      required: true,
    },
    readOnly: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    showReset: {
      type: Boolean,
      default: true,
    },
    submitLabel: {
      type: String,
      default: '',
    },
    debug: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { emit: $emit }) {
    const formRef = ref(null)
    const innerFormData = ref({ ...props.modelValue })
    const formErrors = ref([])

    watch(() => props.modelValue, () => {
      innerFormData.value = { ...props.modelValue }
    }, { deep: true })

    watch(innerFormData, () => {
      $emit('update:modelValue', innerFormData.value)
      $emit('change', { data: innerFormData.value, errors: formErrors.value })
    }, { deep: true })

    const hasErrors = computed(() => {
      return Array.isArray(formErrors.value) && formErrors.value.length > 0
    })

    function onSubmit() {
      if (hasErrors.value) {
        return
      }
      $emit('submit', { data: innerFormData.value })
    }

    function resetForm() {
      innerFormData.value = {}
      formErrors.value = []
      formRef.value?.resetValidation()
    }

    return {
      formRef,
      innerFormData,
      formErrors,
      hasErrors,
      onSubmit,
      resetForm,
    }
  },
})
</script>

<style scoped>
.json-form-renderer :deep(.json-form-input) {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid rgba(128, 128, 128, 0.3);
  border-radius: 4px;
  background: transparent;
  transition: border-color 0.2s;
}
.json-form-renderer :deep(.json-form-input:focus) {
  outline: none;
  border-color: var(--q-primary);
}
.json-form-renderer :deep(.mylabel) {
  font-weight: 500;
  margin-bottom: 4px;
  display: block;
}
.debug-output {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
}
</style>
