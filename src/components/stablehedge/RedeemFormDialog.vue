<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
  >
    <q-card
      class="br-15 pt-card-2 text-bow"
      :class="getDarkModeClass(darkMode)"
      style="width: 350px; max-width: 90vw;"
    >
      <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
        <div class="text-h6 q-space q-mt-sm">
          Unfreeze BCH
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
        <q-form @submit="() => onDialogOK(amount)">
          <div class="text-body1 q-my-sm">Input amount to unfreeze</div>
          <q-input
            outlined
            v-model="amount"
            suffix="BCH"
            bottom-slots
          />
          <div
            v-if="Number.isFinite(maxAmount)"
            class="q-mb-md q-pl-xs row items-center text-grey"
          >
            <div class="text-body2 q-space">{{ maxAmount }} BCH</div>
            <q-btn
              flat
              :label="$t('MAX')"
              class="q-r-mr-md text-body2"
              @click="() => amount = maxAmount"
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'RedeemDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    redemptionContracts: Array,
  },
  setup(props, { emit: $emit }) {
    const $store = useStore();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    watch(innerVal, () => {
      if (!innerVal.value) return
      amount.value = 0
    })

    const amount = ref(0)
    const maxAmount = computed(() => {
      const sats = $store.getters['stablehedge/totalTokenBalancesInSats']
      return sats / 10 ** 8
    })

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      amount,
      maxAmount,
    }
  }
})
</script>
