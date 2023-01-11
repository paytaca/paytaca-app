<template>
  <div>
    <div v-if="!hideLabel" class="row">
      <div class="q-space">{{ label }}</div>
      <div v-if="!totalBottom">
        <div v-if="data?.total">
          {{ data?.total / 10 ** 8 }} BCH
        </div>
        <div v-else class="text-grey">---</div>
      </div>
    </div>
    <div v-if="data?.sats" class="row">
      <div class="q-space">Amount:</div>
      <div>
        {{ data?.total / 10 ** 8 }} BCH
      </div>
    </div>
    <div :class="darkMode ? 'text-grey' : 'text-grey-7'">
      <div v-if="data?.fees?.network" class="row q-pl-md">
        <div class="q-space">Network fee:</div>
        <div>{{ data?.fees?.network / 10 ** 8 }} BCH</div>
      </div>
      <div v-if="data?.fees?.premium" class="row q-pl-md">
        <div class="q-space">Premium:</div>
        <div>{{ data?.fees?.premium / 10 ** 8 }} BCH</div>
      </div>
      <div v-if="data?.fees?.settlementService" class="row q-pl-md">
        <div class="q-space">Service fee:</div>
        <div>{{ data?.fees?.settlementService / 10 ** 8 }} BCH</div>
      </div>
    </div>
    <div v-if="totalBottom" class="row">
      <div class="q-space">Total:</div>
      <div v-if="data?.total">
        {{ data?.total / 10 ** 8 }} BCH
      </div>
      <div v-else class="text-grey">---</div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({
  darkMode: Boolean,
  label: String,
  hideLabel: Boolean,
  totalBottom: Boolean,
  data: Object,
})
</script>
