<template>
  <JsonForms
    v-if="Object.getOwnPropertyNames(schema?.properties)?.length"
    :data="formData"
    :schema="schema"
    :uischema="uischema"
    :renderers="renderers"
    @change="onChange"
  />
  <div v-else class="text-grey text-center text-subtitle1 q-py-lg">
    {{ $t('NoFields') }}
  </div>
</template>
<script>
import '@jsonforms/vue-vanilla/vanilla.css';
import { schemaToUISchema, serializeSchemaFields } from 'src/marketplace/formschema'
import { computed, defineComponent, ref, watch } from 'vue'

import { JsonForms } from '@jsonforms/vue'
import { defaultStyles, mergeStyles, vanillaRenderers } from '@jsonforms/vue-vanilla'

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
  },
  provide() {
    return {
      styles: myStyles,
    }
  },
  setup(props, { emit: $emit }) {
    const schema = computed(() => serializeSchemaFields(props.schemaData))
    const uischema = computed(() => schemaToUISchema(schema.value))

    watch(schema, () => formData.value = props?.modelValue, { deep: true })
    watch(() => props?.modelValue, () => formData.value = props.modelValue, { deep: true })

    const formData = ref(props?.modelValue)
    watch(formData, () => $emit('update:modelValue', formData.value), { deep: true })

    const innerFormDataErrors = ref(props?.formDataErrors)
    watch(() => props.formDataErrors, () => innerFormDataErrors.value = props?.formDataErrors, { deep: true })
    watch(innerFormDataErrors, () => $emit('update:formDataErrors', innerFormDataErrors.value), { deep: true })

    function onChange(event) {
      // console.log('JSON form change', event)
      innerFormDataErrors.value = event?.errors
      formData.value = event.data
    }
    return {
      schema,
      uischema,
      renderers: Object.freeze(renderers),

      formData,
      onChange,
    }
  },
})
</script>
