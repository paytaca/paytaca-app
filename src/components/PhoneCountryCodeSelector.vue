<template>
  <q-menu
    v-if="phoneCodes?.length"
    v-model="innerModel" @show="filterPhoneCodeOpts(needle)" :dark="dark" no-focus fit
  >
    <q-list :dark="dark" dense separator>
      <q-virtual-scroll :items="filteredPhoneCodeOpts">
        <template v-slot="{ item: phoneCode, index }">
          <q-item
            clickable
            v-ripple
            v-close-popup
            @click="() => {
              $emit('selectedCode', phoneCode.phone)
            }"
          >
            <q-item-section>
              <q-item-label :class="dark ? '' : 'text-black'">{{ phoneCode.phone }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label>{{ phoneCode.name }}</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-virtual-scroll>
    </q-list>
  </q-menu>
</template>
<script setup>
import { debounce } from 'quasar';
import countriesJson from 'src/assets/countries.json'
import { ref, computed, watch } from 'vue'

const $emit = defineEmits([
  'update:modelValue',
  'selectedCode',
])
const props = defineProps({
  modelValue: Boolean,
  needle: String,
  dark: Boolean,
})
const innerModel = ref(props.modelValue)
watch(() => [props.modelValue], () => innerModel.value = props.modelValue)
watch(innerModel, () => $emit('update:modelValue', innerModel.value))
watch(() => [props.needle], debounce(() => filterPhoneCodeOpts(props.needle), 500))

const phoneCodes = computed(() => {
  if (!Array.isArray(countriesJson)) return []
  return countriesJson
    .map(countryJson => ({
      name: countryJson?.name,
      phone: countryJson?.phone,
    }))
    .filter(data => data?.name && data?.phone)
    .map(data => {
      data.phone = data.phone.split(',')[0]
      return data
    })
})
const filteredPhoneCodeOpts = ref([])
function filterPhoneCodeOpts(val, update=() => {}) {
  if (!val) {
    filteredPhoneCodeOpts.value = phoneCodes.value
  } else {
    const needle = String(val).toLowerCase()
    filteredPhoneCodeOpts.value = phoneCodes.value
      .filter(data => 
        String(data?.phone).toLowerCase().indexOf(needle) >= 0 ||
        String(data?.name).toLowerCase().indexOf(needle) >= 0
      )
    if (!filteredPhoneCodeOpts.value.length) {
      filteredPhoneCodeOpts.value = phoneCodes.value
        .filter(data => needle.indexOf(String(data?.phone).toLowerCase()) >= 0)
    }
  }
  update?.()
}
</script>