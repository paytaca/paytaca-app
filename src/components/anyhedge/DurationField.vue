<template>
  <div class="row no-wrap q-gutter-x-sm">
    <q-input
      :dark="dark"
      :outlined="outlined"
      :dense="dense"
      :label="label"
      class="q-space"
      :disable="disable"
      inputmode="numeric"
      v-model="innerModelValue.amount"
      :error="hasErrors"
      :error-message="errors?.[0]"
    />
    <q-select
      :dark="dark"
      :outlined="outlined"
      :dense="dense"
      :disable="disable"
      v-model="innerModelValue.units"
      :options="unitOptions"
      option-label="label"
      class="col-4"
      :popup-content-class="dark ? '': 'text-black'"
    />
  </div>
</template>
<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFormChild } from 'quasar'

const $emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: Number,
  dense: Boolean,
  outlined: Boolean,
  dark: Boolean,
  disable: Boolean,
  label: String,
  rules: Array,
  // rules is an array of functions that accept parameters:
  //   - modelValue - Number
  //   - modelValueUnit - { label:String, value:Number }
  //   - formatValue - Function(Number)
})
watch(
  () => props.modelValue,
  () => syncModelValueToInner(false),
  {}
)

const unitOptions = ref([
  { label: 'minutes', singular: 'minute', value: 60 },
  { label: 'hours', singular: 'hour', value: 3600 },
  { label: 'days', singular: 'day', value: 86400 },
  { label: 'weeks', singular: 'week', value: 86400 * 7 },
  { label: 'months', singular: 'month', value: 86400 * 30 }
])

const innerModelValue = ref({ amount: 0, units: unitOptions.value[1] })
const innerAtomicValue = computed(() => innerModelValue.value.amount * innerModelValue.value.units.value)
watch(
  () => innerAtomicValue.value,
  () => $emit('update:modelValue', innerAtomicValue.value)
)

function __selectBestUnits (value) {
  let defaultUnit = unitOptions.value[1]
  if (value > 0) {
    for (let i = unitOptions.value.length - 1; i >= 0; i--) {
      const unit = unitOptions.value[i]
      if (value % unit.value === 0) return unit
      if (value < unit.value) defaultUnit = unit
    }
  }
  return defaultUnit
}
function selectBestUnits () {
  return __selectBestUnits(props.modelValue)
}
function formatValue (value) {
  const unit = __selectBestUnits(value)
  const formattedValue = value / unit.value
  if (formattedValue === 1) {
    return `${formattedValue} ${unit.singular}`
  } else {
    return `${formattedValue} ${unit.label}`
  }
}

function syncModelValueToInner (updateUnit = true) {
  const unit = updateUnit ? selectBestUnits() : innerModelValue.value.units
  innerModelValue.value.amount = (props.modelValue || 0) / unit.value
  innerModelValue.value.units = unit
}
onMounted(() => syncModelValueToInner())

const errors = ref([])
const hasErrors = computed(() => errors.value?.length > 0)
function validate() {
  if (!Array.isArray(props?.rules)) return true

  const ruleResponses = props.rules.map(rule => {
    if (typeof rule === 'function') return rule(innerAtomicValue.value, innerModelValue.value.units, formatValue)
    return rule
  })
  const hasPromise = ruleResponses.some(ruleResponse => ruleResponse?.constructor === Promise)

  if (hasPromise) {
    return new Promise(async (resolve) => {
      const asyncRuleResponses = await Promise.all(ruleResponses)
      errors.value = asyncRuleResponses.filter(resp => resp !== true)
      return resolve(!hasErrors.value)
    })
  }

  errors.value = ruleResponses.filter(resp => resp !== true)
  return !hasErrors.value
}
function resetValidation () {
  errors.value = []
}
watch(() => innerAtomicValue.value, () => validate())

useFormChild({ validate, resetValidation, requiresQForm: false })
</script>
