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
          Freeze BCH
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
          <div v-if="pricePerBchText" class="row items-center text-grey q-mb-lg">
            <div class="q-space">Current price:</div>
            <div>{{ pricePerBchText }} {{ tokenCurrency}} / BCH</div>
          </div>
          <div class="text-body1 q-my-sm">Input amount to freeze</div>
          <q-input
            outlined
            v-model="tokenAmount"
            :suffix="tokenCurrency"
            bottom-slots
          >
            <template v-slot:hint>
              <div v-if="bchAmount" class="text-grey">
                {{ bchAmount }} BCH
              </div>
            </template>
          </q-input>
          <div
            v-if="Number.isFinite(maxAmount)"
            class="q-mb-md q-pl-xs row items-center text-grey"
          >
            <div class="text-body2 q-space">{{ maxAmount }} {{ tokenCurrency }}</div>
            <q-btn
              flat
              :label="$t('MAX')"
              class="q-r-mr-md text-body2"
              @click="() => tokenAmount = maxAmount"
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
import { customNumberFormatting, parseFiatCurrency } from 'src/utils/denomination-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'

export default defineComponent({
  name: 'DepositDialog',
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    redemptionContract: Object,
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
      tokenAmount.value = 0
    })

    const subscribeKey = 'deposit-form-dialog'
    onMounted(() => {
      if (!innerVal.value) return
      console.log('Subscribing')
      stablehedgePriceTracker.subscribe(subscribeKey, [category.value])
    })
    onUnmounted(() => stablehedgePriceTracker.unsubscribe(subscribeKey))
    watch(innerVal, () => {
      innerVal.value
        ? stablehedgePriceTracker.subscribe(subscribeKey, [category.value])
        : stablehedgePriceTracker.unsubscribe(subscribeKey)
    })

    const fiatToken = computed(() => props.redemptionContract?.fiat_token)
    const tokenCurrency = computed(() => fiatToken.value?.currency || '')
    const decimals = computed(() => fiatToken.value?.decimals)
    const category = computed(() => fiatToken.value?.category)
    const priceMessage = computed(() => {
      const token = $store.getters['stablehedge/token']?.(category.value)
      return token?.priceMessage
    })
    const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
    // const priceUnitPerBch = computed(() => parseFloat(41740))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerBchText = computed(() => customNumberFormatting(pricePerBch.value))

    const maxAmountSats = computed(() => {
      const asset = $store.getters['assets/getAssets'][0]
      const sats = Math.floor(asset?.balance * 10 ** 8) - 2000
      return sats
    })

    const maxAmount = computed(() => {
      let maxAmountFromBalance = Infinity
      if (Number.isFinite(priceUnitPerBch.value)) {
        maxAmountFromBalance = parseInt(satoshisToToken(maxAmountSats.value, priceUnitPerBch.value))
      }
      let maxAmountFromContract = Infinity
      if (Number.isFinite(props?.redemtionContract?.reserve_supply)) {
        maxAmountFromContract = parseInt(props?.redemtionContract?.reserve_supply) || Infinity
      }
      const maxTokenUnits = Math.min(maxAmountFromBalance, maxAmountFromContract)
      return maxTokenUnits / 10 ** decimals.value
    })

    const tokenAmount = ref(0)
    const tokenUnits = computed(() => parseInt(tokenAmount.value * 10 ** decimals.value))
    const bchAmount = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      if (!parseInt(tokenUnits.value)) return NaN

      const sats = parseInt(tokenToSatoshis(tokenUnits.value, priceUnitPerBch.value))
      return sats / 10 ** 8
    })

    function onSubmit() {
      onDialogOK({
        tokenUnits: tokenUnits.value,
        redemptionContract: props.redemptionContract,
        priceMessage: priceMessage.value,
      })
    }

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      tokenCurrency,
      pricePerBchText,
      maxAmount,
      tokenAmount,
      bchAmount,

      onSubmit,

      parseFiatCurrency,
    }
  }
})
</script>
