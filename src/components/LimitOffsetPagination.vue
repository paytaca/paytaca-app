<template>
  <q-pagination
    v-if="hideBelowPages <= 0 || hideBelowPages <= pageNumbers.pages"
    :modelValue="pageNumbers.currentPage"
    :max="pageNumbers.pages"
    @update:modelValue="val => emitNewValue({limit: pageNumbers.pageSize, offset: pageNumbers.pageSize * (val - 1) })"
    v-bind="paginationProps"
  />
</template>
<script setup>
import { computed } from 'vue';

const $emit = defineEmits(['update:modelValue'])
const props = defineProps({
  paginationProps: Object,
  modelValue: Object,
  hideBelowPages: Number,
})

const pageNumbers = computed(() => {
  const data = { pages: 0, currentPage: 0, pageSize: 0 }
  if (props?.modelValue?.limit) data.pages = Math.ceil(props?.modelValue?.count / props?.modelValue?.limit)
  data.pageSize = props?.modelValue?.limit
  if (props?.modelValue?.offset) data.currentPage = Math.floor(props?.modelValue?.offset / props?.modelValue?.limit) + 1
  else data.currentPage = 1
  return data
})

function emitNewValue(newValue) {
  $emit(
    'update:modelValue',
    {
      limit: newValue?.limit || 0,
      offset: newValue?.offset || 0,
      count: props.modelValue?.count || 0,
    }
  )
}
</script>
