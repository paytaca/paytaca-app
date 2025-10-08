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
          {{ $t('Freeze') }} {{ denomination }}
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
          <div v-if="pricePerDenomination" class="row items-center text-grey q-mb-lg">
            <div class="q-space">{{ $t('CurrentPrice') }}:</div>
            <div>{{ pricePerDenomination }} {{ tokenCurrency}} / {{ denomination }}</div>
            <q-menu
              v-if="priceTimestamp"
              anchor="bottom right" self="top end"
              class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)"
            >
              <div>{{ formatTimestampToText(priceTimestamp) }}</div>
              <div class="text-caption text-grey">{{ formatDateRelative(priceTimestamp) }}</div>
            </q-menu>
          </div>
          <div class="text-body1 q-my-sm">{{ $t('InputAmountToFreeze') }}</div>
          <q-input
            outlined
            v-model="tokenAmount"
            :suffix="tokenCurrency"
            bottom-slots
            :rules="[
              val => parseFloat(val) > minAmount || $t('MustBeGreaterThan', { amount: minAmount + ' ' + tokenCurrency }),
              val => parseFloat(val) <= maxAmount || $t('MustBeLessThan', { amount: maxAmount + ' ' + tokenCurrency}),
            ]"
          >
            <template v-slot:hint>
              <div v-if="denominatedBchAmountText" class="text-grey">
                {{ denominatedBchAmountText }}
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
import { getAssetDenomination, parseFiatCurrency } from 'src/utils/denomination-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
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
    selectedDenomination: String,
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

    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination']
    })
    const fiatToken = computed(() => props.redemptionContract?.fiat_token)
    const tokenCurrency = computed(() => fiatToken.value?.currency || '')
    const decimals = computed(() => fiatToken.value?.decimals)
    const category = computed(() => fiatToken.value?.category)
    const priceMessage = computed(() => {
      const token = $store.getters['stablehedge/token']?.(category.value)
      return token?.priceMessage
    })
    const priceTimestamp = computed(() => priceMessage.value?.messageTimestamp * 1000)
    const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
    // const priceUnitPerBch = computed(() => parseFloat(41740))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerDenomination = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      const conversionRate = parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
      return pricePerBch.value / conversionRate
    })

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
    const minAmount = computed(() => {
      return 1 / 10 ** decimals.value
    })

    const tokenAmount = ref(0)
    const tokenUnits = computed(() => parseInt(tokenAmount.value * 10 ** decimals.value))
    const bchAmount = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      if (!parseInt(tokenUnits.value)) return NaN

      const sats = parseInt(tokenToSatoshis(tokenUnits.value, priceUnitPerBch.value, true))
      return sats / 10 ** 8
    })
    const denominatedBchAmountText = computed(() => {
      return bchAmount.value ? denominateBch(bchAmount.value) : ''
    })

    function onSubmit() {
      onDialogOK({
        tokenUnits: tokenUnits.value,
        redemptionContract: props.redemptionContract,
        priceMessage: priceMessage.value,
      })
    }

    const {
      denominateBch,
      formatDateRelative,
      formatTimestampToText,
    } = useValueFormatters(category)

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      denomination,
      tokenCurrency,
      priceTimestamp,
      pricePerDenomination,
      maxAmount,
      minAmount,
      tokenAmount,
      bchAmount,
      denominatedBchAmountText,

      onSubmit,

      formatDateRelative,
      formatTimestampToText,
      parseFiatCurrency,
    }
  }
})
</script>
