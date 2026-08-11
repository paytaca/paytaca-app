<template>
  <JsonForms
    v-if="Object.getOwnPropertyNames(schema?.properties)?.length"
    :data="formData"
    :schema="schema"
    :uischema="uischema"
    :renderers="renderers"
    :validation-mode="validationMode"
    :readonly="readonly"
    @change="onChange"
  />
  <div v-else class="text-grey text-center text-subtitle1 q-py-lg">
    {{ $t('NoFields') }}
  </div>
</template>
<script>
import '@jsonforms/vue-vanilla/vanilla.css';
import { computed, defineComponent, ref, watch } from 'vue'

import { JsonForms } from '@jsonforms/vue'
import { defaultStyles, mergeStyles, vanillaRenderers } from '@jsonforms/vue-vanilla'
import { createAjv, validate } from '@jsonforms/core'
import { schemaToUISchema } from './jsonform-utils'

const renderers = [
  ...vanillaRenderers,
]
const myStyles = mergeStyles(defaultStyles, { control: { label: "mylabel", input: "json-form-input" } });

export default defineComponent({
  name: 'JSONFormPreview',
  components: {
    JsonForms,
  },
  emits: [
    'update:modelValue',
    'update:formDataErrors',
  ],
  props: {
    modelValue: { type: Object, required: false },
    formDataErrors: { type: Array, required: false },
    schemaData: Object,
    readonly: { type: Boolean, default: false },
  },
  provide() {
    return {
      styles: myStyles,
    }
  },
  setup(props, { emit: $emit, expose }) {
    const schema = computed(() => {
      if (props.schemaData && typeof props.schemaData === 'object' && !Array.isArray(props.schemaData)) {
        return props.schemaData
      }
      return { type: 'object', properties: {} }
    })
    const uischema = computed(() => schemaToUISchema(schema.value))
    const validationMode = ref('ValidateAndHide')

    watch(schema, () => {
      formData.value = props?.modelValue
      validationMode.value = 'ValidateAndHide'
    }, { deep: true })
    watch(() => props?.modelValue, () => formData.value = props.modelValue, { deep: true })

    const formData = ref(props?.modelValue)
    watch(formData, () => $emit('update:modelValue', formData.value), { deep: true })

    const innerFormDataErrors = ref(props?.formDataErrors)
    watch(() => props.formDataErrors, () => innerFormDataErrors.value = props?.formDataErrors, { deep: true })
    watch(innerFormDataErrors, () => $emit('update:formDataErrors', innerFormDataErrors.value), { deep: true })

    const ajv = createAjv()

    function validateForm() {
      if (!schema.value || !Object.getOwnPropertyNames(schema.value?.properties).length) {
        return true
      }

      try {
        const validator = ajv.compile(schema.value)
        const errors = validate(validator, formData.value)
        innerFormDataErrors.value = errors || []
      } catch (err) {
        console.error('JSON form validation error:', err)
        innerFormDataErrors.value = []
      }

      validationMode.value = 'ValidateAndShow'
      return !innerFormDataErrors.value.length
    }

    function onChange(event) {
      // console.log('JSON form change', event)
      const dataChanged = JSON.stringify(event?.data) !== JSON.stringify(formData.value)
      innerFormDataErrors.value = event?.errors
      formData.value = event.data
      if (dataChanged) {
        validationMode.value = 'ValidateAndShow'
      }
    }

    expose({
      validate: validateForm,
    })

    return {
      schema,
      uischema,
      renderers: Object.freeze(renderers),
      validationMode,

      formData,
      onChange,
    }
  },
})
</script>
