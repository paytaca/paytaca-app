<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
    full-width
    position="bottom"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          {{ title }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section>
        <q-form @submit="() => onSubmit()">
          <div>{{ $t('Recipient')}} </div>
          <q-input
            dense
            outlined
            v-model="formData.recipient"
            :rules="[
              val => Boolean(val) || $t('Required'),
            ]"
          />
          <div>{{ $t('Amount')}} </div>
          <q-input
            dense
            outlined
            v-model="formData.amount"
            :suffix="denomination"
            :rules="[
              val => Boolean(val) || $t('Required'),
            ]"
          />
          <div
            v-if="Number.isFinite(denominatedMaxAmount)"
            class="q-mb-md q-pl-xs row items-center text-grey"
          >
            <div class="text-body2 q-space">{{ denominatedMaxAmount }} {{ denomination }}</div>
            <q-btn
              flat
              :label="$t('MAX')"
              class="q-r-mr-md text-body2"
              @click="() => formData.amount = denominatedMaxAmount"
            />
          </div>

          <div class="row justify-around q-my-sm">
            <q-btn
              no-caps :label="$t('Cancel')"
              outline
              color="grey"
              rounded
              class="col-5 col-sm-3"
              @click="onDialogCancel"
            />
            <q-btn
              no-caps :label="$t('OK')"
              color="brandblue"
              rounded
              class="col-5 col-sm-3"
              type="submit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'CustomPaytacaDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    title: String,
    maxSatoshis: Number,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const denomination = computed(() => $store.getters['global/denomination'] || 'BCH')
    const denominationPerBchRate = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      return parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
    })

    const denominatedMaxAmount = computed(() => {
      const bch = props.maxSatoshis / 10 ** 8
      if (!Number.isFinite(bch)) return Infinity
      return bch * denominationPerBchRate.value
    })

    const formData = ref({
      address: '',
      amount: 0,
    })
    function resetFormData() {
      formData.value = { address: '', amount: 0 }
    }

    const bchAmount = computed(() => {
      const amount = parseFloat(formData.value.amount)
      if (!Number.isFinite(amount)) return NaN
      return amount / denominationPerBchRate.value
    })

    function onSubmit() {
      onDialogOK({
        satoshis: Math.floor(bchAmount.value * 10 ** 8),
        recipient: formData.value.recipient
      })
      resetFormData()
    }

    return {
      darkMode, getDarkModeClass,
      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      denomination,
      denominatedMaxAmount,
      formData,
      onSubmit,
    }
  }
})
</script>
