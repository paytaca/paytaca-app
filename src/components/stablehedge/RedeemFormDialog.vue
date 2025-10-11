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
          {{ $t('Unfreeze') }} {{ denomination }}
        </div>
        <q-btn
          flat
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </div>
      <q-card-section style="max-height:75vh;overflow-y:auto;">
        <q-form @submit="() => onSubmit()">
          <div class="row items-center q-my-sm">
            <div class="text-body1 q-space">{{ $t('InputAmountToUnfreeze') }}</div>
            <q-btn
              v-if="tokenBalanceContractPairs?.length > 1"
              flat
              padding="sm"
              :icon="expandAmounts ? 'expand_less' : 'expand_more'"
              @click="() => expandAmounts = !expandAmounts"
            />
          </div>
          <div v-if="expandAmounts || tokenBalanceContractPairs?.length === 1">
            <div
              v-for="(pair, index) in tokenBalanceContractPairs" :key="index"
              class="q-my-md token-pair-form"
            >
              <div v-if="pricePerPairText[index]" class="row items-center text-grey q-mb-md">
                <div class="q-space">{{ $t('CurrentPrice') }}:</div>
                <div>
                  {{ formatWithLocale(pricePerPairText[index], { max: 8 }) }}
                  {{ tokenDataPerPair[index]?.currency }} / {{ denomination }}
                </div>
                <q-menu
                  v-if="priceTimestampPerPair[index]"
                  anchor="bottom right" self="top end"
                  class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)"
                >
                  <div>{{ formatTimestampToText(priceTimestampPerPair[index]) }}</div>
                  <div class="text-caption text-grey">{{ formatDateRelative(priceTimestampPerPair[index]) }}</div>
                </q-menu>
              </div>
              <CustomKeyboardInput
                v-model="amounts[index]"
                :fieldProps="{
                  outlined: true,
                  suffix: denomination,
                  reactiveRules: true,
                  rules: [
                    () => amount > 0 || $t('InvalidAmount'),
                    val => parseFloat(val || 0) <= maxDenominatedRedeemableBchPerPair[index] ||
                      $t('MustBeLessThan', { amount: maxDenominatedRedeemableBchPerPair[index] + ' ' + denomination }),
                  ],
                }"
              />
              <div v-if="tokenAmounts[index]" class="q-px-xs text-grey">
                {{ formatWithLocale(tokenAmounts[index], { max: tokenDataPerPair[index]?.decimals }) }}
                {{ tokenDataPerPair[index]?.currency }}
              </div>

              <div
                v-if="Number.isFinite(maxDenominatedRedeemableBchPerPair[index])"
                class="q-pl-xs row items-center text-grey"
              >
                <div class="text-body2 q-space">
                  {{ formatWithLocale(maxDenominatedRedeemableBchPerPair[index], { max: 8 }) }}
                  {{ denomination }}
                </div>
                <q-btn
                  flat
                  :label="$t('MAX')"
                  class="q-r-mr-md text-body2"
                  @click="() => amounts[index] = String(maxDenominatedRedeemableBchPerPair[index])"
                />
              </div> 
            </div>
          </div>
          <div v-else>
            <CustomKeyboardInput
              v-model="denominatedAmount"
              :fieldProps="{
                outlined: true,
                suffix: denomination,
                rules: [
                  val => parseFloat(val) > 0 || $t('InvalidAmount'),
                  val => parseFloat(val) <= totalDenominatedRedeemableBch ||
                    $t('MustBeLessThan', { amount: totalDenominatedRedeemableBch + ' ' + denomination }),
                ]
              }"
            />
            <div
              v-if="Number.isFinite(totalDenominatedRedeemableBch)"
              class="q-mb-md q-pl-xs row items-center text-grey"
            >
              <div class="text-body2 q-space">
                {{ formatWithLocale(totalDenominatedRedeemableBch, { max: 8 }) }}
                {{ denomination }}
              </div>
              <q-btn
                flat
                :label="$t('MAX')"
                class="q-r-mr-md text-body2"
                @click="() => denominatedAmount = totalDenominatedRedeemableBch"
              />
            </div>
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
import { formatWithLocale, getDenomDecimals } from 'src/utils/denomination-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import CustomKeyboardInput from '../CustomKeyboardInput.vue';

export default defineComponent({
  name: 'RedeemDialog',
  components: {
    CustomKeyboardInput,
  },
  emits: [
    'update:modelValue',
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    redemptionContracts: Array,
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
      amount.value = 0
    })

    // no need to specify categories when subscribing
    // since token balances are included in price tracker by default
    const subscribeKey = 'redeem-form-dialog'
    onMounted(() => {
      if (!innerVal.value) return
      stablehedgePriceTracker.subscribe(subscribeKey,)
    })
    onUnmounted(() => stablehedgePriceTracker.unsubscribe(subscribeKey))
    watch(innerVal, () => {
      innerVal.value
        ? stablehedgePriceTracker.subscribe(subscribeKey)
        : stablehedgePriceTracker.unsubscribe(subscribeKey)
    })


    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination'] || 'BCH'
    })
    const denominationPerBchRate = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      const { convert } = getDenomDecimals(currentDenomination)
      return convert;
    })

    const redemptionContracts = computed(() => props.redemptionContracts)
    const tokenBalances = computed(() => $store.getters['stablehedge/tokenBalances'])
    const tokenBalanceContractPairs = computed(() => {
      const results = redemptionContracts.value.map(redemptionContract => {
        const tokenBalance = tokenBalances.value
          .find(tokenBalance => redemptionContract?.fiat_token?.category == tokenBalance?.category)

        return { tokenBalance, redemptionContract }
      })
      return [
        ...results,
        // ...results,
      ]
    })
    const tokenDataPerPair = computed(() => {
      return tokenBalanceContractPairs.value.map(pair => {
        return $store.getters['stablehedge/token'](pair?.tokenBalance?.category)
      })
    })
    const priceTimestampPerPair = computed(() => {
      return tokenDataPerPair.value.map(token => token?.priceMessage?.messageTimestamp * 1000)
    })
    const pricePerPairText = computed(() => {
      return tokenDataPerPair.value.map(token => {
        const decimals = token?.decimals
        const price = token?.priceMessage?.priceValue
        if (!Number.isFinite(decimals)) return ''
        if (!Number.isFinite(price)) return ''

        const pricePerBch = price / 10 ** decimals
        return pricePerBch / denominationPerBchRate.value
      })
    })

    const maxRedeemableSatsPerPair = computed(() => {
      return tokenBalanceContractPairs.value.map((pair, index) => {
        const contract = pair?.redemptionContract
        const tokenBalance = pair?.tokenBalance
        const token = tokenDataPerPair.value[index]

        const price = token?.priceMessage?.priceValue
        const tokenUnits = tokenBalance?.amount

        if (!Number.isFinite(price)) return NaN
        if (!Number.isFinite(tokenUnits)) return NaN

        const satoshis = Number(tokenToSatoshis(tokenUnits, price, true))
        const redeemableSatsFromContract = contract?.redeemable || Infinity
        return Math.min(satoshis, redeemableSatsFromContract)
      })
    })
    const maxDenominatedRedeemableBchPerPair = computed(() => {
      return maxRedeemableSatsPerPair.value
        .map(bch => bch * denominationPerBchRate.value)
        .map(sats => sats / 10 ** 8)
    })
    const totalRedeemableSats = computed(() => {
      return maxRedeemableSatsPerPair.value.reduce((subtotal, sats) => {
        return subtotal + sats
      }, 0)
    })
    const totalDenominatedRedeemableBch = computed(() => {
      const bch = totalRedeemableSats.value / 10 ** 8
      return bch * denominationPerBchRate.value
    })

    const expandAmounts = ref(false)
    const amounts = ref([].map(Number))
    const amountsBch = computed(() => {
      return amounts.value.map(amount => {
        return amount / denominationPerBchRate.value
      })
    })
    const tokenUnits = computed(() => {
      return tokenDataPerPair.value.map((token, index) => {
        const price = parseFloat(token?.priceMessage?.priceValue)
        const amount = parseFloat(amountsBch.value[index])
        if (!Number.isFinite(price)) return NaN
        if (!Number.isFinite(amount)) return NaN

        const satoshis = parseInt(amount * 10 ** 8)
        const tokenUnit = satoshisToToken(satoshis, price);
        return Number(tokenUnit);
      })
    })
    const tokenAmounts = computed(() => {
      return tokenDataPerPair.value.map((token, index) => {
        const decimals = token?.decimals
        const tokenUnit = tokenUnits.value[index]
        if (!Number.isSafeInteger(decimals)) return NaN
        if (!Number.isFinite(tokenUnit)) return NaN

        return Number(tokenUnit / 10 ** decimals);
      })
    })

    const amount = computed({
      get() {
        return amountsBch.value.reduce((subtotal, amount) => {
          if (!Number.isFinite(amount)) return subtotal
          return subtotal + amount
        }, 0)
      },
      set(value) {
        let targetSats = parseInt(value * 10 ** 8)
        if (!Number.isFinite(targetSats)) {
          amounts.value = []
          return
        }

        const newDenominatedAmounts = maxRedeemableSatsPerPair.value.map(sats => {
          if (targetSats <= 0) return 0
          if (!Number.isFinite(sats)) return 0
          const newSats = Math.min(sats, targetSats)
          if (!Number.isFinite(newSats)) return 0

          targetSats = targetSats - newSats
          const bchAmount = newSats / 10 ** 8
          return bchAmount * denominationPerBchRate.value
        })

        amounts.value = newDenominatedAmounts
      }
    })
    const denominatedAmount = computed({
      get() {
        return amount.value * denominationPerBchRate.value
      },
      set(value) {
        amount.value = value / denominationPerBchRate.value
      }
    })

    function onSubmit() {
      const data = tokenBalanceContractPairs.value.map((pair, index) => {
        return {
          redemptionContract: pair?.redemptionContract,
          priceMessage: tokenDataPerPair.value[index]?.priceMessage,
          tokenUnits: tokenUnits.value[index],
        }
      }).filter(_data => {
        return Number.isFinite(_data?.tokenUnits) && _data?.tokenUnits > 0
      })

      onDialogOK(data)
    }

    const {
      formatDateRelative,
      formatTimestampToText,
    } = useValueFormatters()

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      denomination,
      tokenBalanceContractPairs,
      tokenDataPerPair,
      priceTimestampPerPair,
      pricePerPairText,
      maxDenominatedRedeemableBchPerPair,

      totalDenominatedRedeemableBch,
      expandAmounts,
      amounts,
      tokenAmounts,
      amount,
      denominatedAmount,

      onSubmit,

      formatDateRelative,
      formatTimestampToText,
      formatWithLocale,
    }
  }
})
</script>
<style lang="scss" scoped>
.token-pair-form {
  border-bottom: 1px solid grey;
}
body.body--dark .token-pair-form {
  border-bottom: 1px solid #DAE0E7;
}
.token-pair-form:last-child {
  border-bottom: none !important;
}
</style>
