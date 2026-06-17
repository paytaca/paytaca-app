<template>
  <q-input
    outlined
    dense
    :loading="loading"
    clearable
    v-model="inputVal"
    autocomplete="off"
    :placeholder="placeholder"
    color="pt-primary1"
    debounce="500"
    :class="getDarkModeClass(darkMode)"
  >
    <template v-slot:append>
      <q-icon name="search"/>
    </template>
  </q-input>
</template>

<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { useStore } from "vuex";
import { computed, defineEmits, defineProps, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search auctions'
  }
})

const emit = defineEmits(['update:model-value'])
const $store = useStore()
const loading = ref(false)
const inputVal = ref(props.modelValue)

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

watch(
  () => props.modelValue,
  (value) => {
    if (value !== inputVal.value) {
      inputVal.value = value || ''
    }
  }
)

watch(inputVal, (value) => {
  emit('update:model-value', value || '')
})
</script>