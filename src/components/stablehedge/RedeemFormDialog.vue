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
          {{ $t('Unfreeze') }} BCH
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
              <div v-if="pricePerPairText[index]" class="row items-center text-grey q-mb-xs">
                <div class="q-space">Current price:</div>
                <div>{{ pricePerPairText[index] }} {{ tokenDataPerPair[index]?.currency }} / BCH</div>
              </div>
              <q-input
                outlined
                v-model="amounts[index]"
                suffix="BCH"
                bottom-slots
              >
                <template v-slot:hint>
                  <div v-if="tokenAmounts[index]" class="text-grey">
                    {{ tokenAmounts[index] }}
                    {{ tokenDataPerPair[index]?.currency }}
                  </div>
                </template>
              </q-input>
  
              <div
                v-if="Number.isFinite(maxRedeemableBchPerPair[index])"
                class="q-pl-xs row items-center text-grey"
              >
                <div class="text-body2 q-space">{{ maxRedeemableBchPerPair[index] }} BCH</div>
                <q-btn
                  flat
                  :label="$t('MAX')"
                  class="q-r-mr-md text-body2"
                  @click="() => amounts[index] = maxRedeemableBchPerPair[index]"
                />
              </div> 
            </div>
          </div>
          <div v-else>
            <q-input
              outlined
              v-model="amount"
              suffix="BCH"
              bottom-slots
            />
            <div
              v-if="Number.isFinite(totalRedeemableBch)"
              class="q-mb-md q-pl-xs row items-center text-grey"
            >
              <div class="text-body2 q-space">{{ totalRedeemableBch }} BCH</div>
              <q-btn
                flat
                :label="$t('MAX')"
                class="q-r-mr-md text-body2"
                @click="() => amount = totalRedeemableBch"
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
import { customNumberFormatting } from 'src/utils/denomination-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { useDialogPluginComponent } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'

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
    const pricePerPairText = computed(() => {
      return tokenDataPerPair.value.map(token => {
        const decimals = token?.decimals
        const price = token?.priceMessage?.priceValue
        if (!Number.isFinite(decimals)) return ''
        if (!Number.isFinite(price)) return ''

        return customNumberFormatting(price / 10 ** decimals)
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

        const satoshis = Number(tokenToSatoshis(tokenUnits, price))
        const redeemableSatsFromContract = contract?.redeemable || Infinity
        return Math.min(satoshis, redeemableSatsFromContract)
      })
    })
    const maxRedeemableBchPerPair = computed(() => {
      return maxRedeemableSatsPerPair.value.map(sats => sats / 10 ** 8)
    })
    const totalRedeemableSats = computed(() => {
      return maxRedeemableSatsPerPair.value.reduce((subtotal, sats) => {
        return subtotal + sats
      }, 0)
    })
    const totalRedeemableBch = computed(() => {
      return totalRedeemableSats.value / 10 ** 8
    })

    const expandAmounts = ref(false)
    const amounts = ref([].map(Number))
    const tokenUnits = computed(() => {
      return tokenDataPerPair.value.map((token, index) => {
        const price = parseFloat(token?.priceMessage?.priceValue)
        const amount = parseFloat(amounts.value[index])
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
        return amounts.value.reduce((subtotal, amount) => {
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

        const newAmounts = maxRedeemableSatsPerPair.value.map(sats => {
          if (targetSats <= 0) return 0
          if (!Number.isFinite(sats)) return 0
          const newSats = Math.min(sats, targetSats)
          if (!Number.isFinite(newSats)) return 0

          targetSats = targetSats - newSats
          return newSats / 10 ** 8
        })

        amounts.value = newAmounts
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
        return Number.isFinite(_data?.tokenUnits)
      })

      onDialogOK(data)
    }

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      tokenBalanceContractPairs,
      tokenDataPerPair,
      pricePerPairText,
      maxRedeemableBchPerPair,

      totalRedeemableBch,
      expandAmounts,
      amounts,
      tokenAmounts,
      amount,

      onSubmit,
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
