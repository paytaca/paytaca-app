<template>
  <div>
    <div v-for="addon in addons" :key="addon?.id" class="q-mb-md">
      <div v-if="addon?.hasOptions" class="row items-center">
        <div class="text-body1 q-space">
          {{ addon?.label }}
          <template v-if="addon?.isRequired">*</template>
        </div>
        <div class="text-grey">
          <template v-if="addon?.minOpts != addon?.maxOpts">
            {{
              $t(
                'SelectValueAndTo',
                { value: addon?.minOpts, to: addon?.maxOpts },
                `Select ${ addon?.minOpts } to ${ addon?.maxOpts }`
              )
            }}
          </template>
          <template v-else-if="addon?.maxOpts">
            {{
              $t(
                'SelectValue',
                { value: addon?.maxOpts },
                `Select ${ addon?.maxOpts }`
              )
            }}
          </template>
        </div>
      </div>
      <q-slide-transition>
        <div
          v-if="getError({ addonId: addon?.id })"
          class="text-red q-pl-sm q-r-mt-sm"
        >
          {{ getError({ addonId: addon?.id }) }}
        </div>
      </q-slide-transition>
      <div
        v-for="option in addon?.options" :key="`${addon?.id}-${option?.id}`"
        :class="['q-mb-xs', addon?.hasOptions ? 'q-pl-md' : '']"
      >
        <q-checkbox
          :disable="disable"
          dense
          :model-value="Boolean(innerVal?.find?.(data => data?.addonOptionId == option?.id))"
          @update:model-value="val => setAddonOption(val, option)"
          class="full-width"
        >
          <div class="row items-center">
            <div v-if="option?.label" class="q-space text-body2">{{ option?.label }}</div>
            <div v-else-if="!addon?.hasOptions" class="q-space text-body1">
              {{ addon?.singleOptionLabel }}
              <template v-if="addon?.isRequired">*</template>
            </div>
            <div v-else class="q-space text-grey text-body2"> --- </div>
            <div>{{ option?.markupPrice }} {{ currency }}</div>
          </div>
        </q-checkbox>
        <div
          v-if="innerVal?.find?.(data => data?.addonOptionId == option?.id)?.inputValue || option?.requireInput"
          class="q-pl-xl"
        >
          <input
            v-if="innerVal.find(data => data?.addonOptionId == option?.id)"
            dense
            :placeholder="$t('InputDetails')"
            class="option-input full-width q-mb-xs"
            :value="innerVal.find(data => data?.addonOptionId == option?.id).inputValue"
            @input="event => {
              innerVal.find(data => data?.addonOptionId == option?.id).inputValue = event.target.value
            }"
          />
          <!-- {{ innerVal?.find?.(data => data?.addonOptionId == option?.id)?.inputValue }} -->
        </div>
        <q-slide-transition>
          <div
            v-if="getError({ addonOptionId: option?.id })"
            class="text-red q-pl-xl q-r-mt-sm"
          >
            {{ getError({ addonOptionId: option?.id })}}
          </div>
        </q-slide-transition>
      </div>
    </div>
  </div>
</template>
<script>
import { Addon } from "src/marketplace/objects";
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { debounce, useQuasar } from "quasar";
import { useStore } from "vuex";
import { watch, computed, ref, defineComponent } from "vue";

function _parseAddonData(val) {
  return { addonOptionId: parseInt(val?.addonOptionId), inputValue: val?.inputValue }
}

export default defineComponent({
  emits: [
    'update:modelValue',
    'error',
  ],
  props: {
    addons: { type: Array, default: () => [].map(Addon.parse) },
    disable: Boolean,
    currency: String,
    debounce: { type: Number, default: 0 },
    modelValue: {
      type: Array,
      default: [].map(_parseAddonData)
    },
  },
  setup(props, { emit: $emit }) {
    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])


    const innerVal = ref([].map(_parseAddonData))
    const normalizedModelValue = computed(() => {
      if(!Array.isArray(props.modelValue)) return []
      return props.modelValue
        .map(_parseAddonData)
        .sort((obj1, obj2) => obj1.addonOptionId - obj2.addonOptionId)
    })
    const normalizedInnerVal = computed(() => {
      if(!Array.isArray(innerVal.value)) return []
      return innerVal.value
        .map(_parseAddonData)
        .sort((obj1, obj2) => obj1.addonOptionId - obj2.addonOptionId)
    })
    watch(normalizedModelValue, () => {
      if (JSON.stringify(normalizedModelValue.value) == JSON.stringify(normalizedInnerVal.value)) return
      innerVal.value = normalizedModelValue.value
    }, { immediate: true })
    watch(normalizedInnerVal, () => debouncedEmitIfChanged.value())
    const emitIfChanged = () => {
      if (JSON.stringify(normalizedModelValue.value) == JSON.stringify(normalizedInnerVal.value)) return
      $emit('update:modelValue', normalizedInnerVal.value)
    }
    const debouncedEmitIfChanged = ref(emitIfChanged)
    watch(() => props.debounce, () => {
      if (!Number.isSafeInteger(props.debounce) || props.debounce <= 0) {
        debouncedEmitIfChanged.value = emitIfChanged
      } else {
        debouncedEmitIfChanged.value = debounce(emitIfChanged, props.debounce)
      }
    }, { immediate: true }) // immediate to trigger onCreate

    /**
     * @param {Boolean} add
     * @param {{ id: Number, requireInput: Boolean }} option
     */
    function setAddonOption(add, option) {
      const exists = innerVal.value.find(data => data?.addonOptionId == option?.id)
      if (!add && exists) {
        innerVal.value = innerVal.value.filter(data => data?.addonOptionId !== option?.id)
      } else if (add && !exists) {
        if (!option?.requireInput) {
          innerVal.value.push({ addonOptionId: parseInt(option?.id), inputValue: '' })
          return
        } else {
          $q.dialog({
            title: option?.label || 'Prompt',
            message: 'Input addon details',
            color: 'pt-primary1',
            position: 'bottom',
            prompt: {
              type: 'text',
              rules: [
                val => Boolean(val) || 'Required',
              ],
            },
            ok: true,
            cancel: true,
            class: `br-15 pt-card text-bow ${getDarkModeClass(darkMode.value)}`
          })
            .onOk(val => {
              const data = { addonOptionId: parseInt(option?.id), inputValue: val }
              const index = innerVal.value.findIndex(_data => _data?.addonOptionId == option?.id)
              if (index >= 0) innerVal.value[index] = data
              else innerVal.value.push(data)
            })
        }
      }
    }

    watch(normalizedInnerVal, () => validate())
    const errors = ref([].map(error => {
      return {
        addonId: error?.addonId ? parseInt(error?.addonId) : undefined,
        addonOptionId: error?.addonOptionId ? parseInt(error?.addonOptionId) : undefined,
        error: '',
      }
    }))

    function getError(opts={ addonId: 0, addonOptionId: 0 }) {
      return errors.value.find(error => {
        if (opts?.addonId && error?.addonId == opts?.addonId) return true 
        if (opts?.addonOptionId && error?.addonOptionId == opts?.addonOptionId) return true 
        return false
      })?.error
    }

    watch(() => props.addons, () => errors.value = [])
    function resetValidation() {
      console.log('Resetting validation')
      errors.value = []
    }
    function validate() {
      const _errors = []
      props.addons.forEach(addon => {
        const addonOptionIds = addon?.options?.map?.(option => option?.id) || []
        const selectedCount = innerVal.value
          .map(val => val?.addonOptionId)
          .filter(id => addonOptionIds.includes(id))
          .filter(Boolean)
          .length

        if (selectedCount < addon?.minOpts || selectedCount > addon?.maxOpts) {
          let errorMsg = selectedCount < addon?.minOpts
            ? `Select atleast ${addon?.minOpts}`
            : `Select only ${addon?.maxOpts}`
          _errors.push({ addonId: addon?.id, error: errorMsg })
        }
        addon.options.forEach(option => {
          if (!option?.requireInput) return
          const val = innerVal.value.find(val => val?.addonOptionId == option?.id)
          if (!val) return
          if (!val.inputValue) _errors.push({
            addonOptionId: option?.id,
            error: 'Input is required',
          })
        })
      })

      errors.value = _errors
      if (_errors.length) $emit('error', _errors)
      return _errors.length > 0
    }

    return {
      innerVal,
      setAddonOption,

      errors,
      getError,
      resetValidation,
      validate,
    }
  },
})
</script>
<style lang="scss" scoped>
:deep(.full-width.q-checkbox .q-checkbox__label) {
  width: 100%;
}

input.option-input {
  background: inherit;
  color: inherit;
  border: none;
  outline: none;
  padding: map-get($space-sm, 'y') map-get($space-xs, 'x');
  border-bottom: 1px solid lightgrey;
  transition: border-bottom 0.25s ease-in-out;
}

input.option-input:focus {
  border-bottom: 1px solid currentColor;
}
</style>