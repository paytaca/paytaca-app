<template>
  <q-dialog
    ref="dialogRef"
    v-model="innerVal"
    @hide="onDialogHide"
  >
    <q-card
      class="br-15 text-bow pt-card"
      :class="[getDarkModeClass(darkMode), darkMode ? 'bg-pt-dark' : 'bg-pt-light']"
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
          <!-- Currency Selection -->
          <div class="q-mb-md">
            <div class="text-body2 q-mb-sm text-weight-medium">{{ $t('SelectCurrency', {}, 'Select Currency') }}</div>
            <div class="row q-gutter-sm">
              <q-btn
                v-for="currency in availableCurrencies"
                :key="currency"
                :label="currency"
                :color="selectedCurrency === currency ? 'primary' : 'grey-7'"
                :outline="selectedCurrency !== currency"
                :flat="selectedCurrency !== currency"
                unelevated
                no-caps
                rounded
                class="col"
                :class="selectedCurrency === currency ? 'text-white' : ''"
                @click="selectCurrency(currency)"
                :loading="loadingContract && selectedCurrency === currency"
              />
            </div>
          </div>
          
          <div v-if="pricePerDenomination" class="row items-center text-grey q-mb-lg">
            <div class="q-space">{{ $t('CurrentPrice') }}:</div>
            <div>{{ formatWithLocale(pricePerDenomination, { max: 8 }) }} {{ tokenCurrency}} / {{ denomination }}</div>
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
          <CustomInput
            v-model="tokenAmount"
            :inputSymbol="tokenCurrency"
            :decimalObj="{ min: 0, max: decimals }"
            :inputRules="[ validateAmount ]"
          />
          <div v-if="denominatedBchAmountText" class="text-grey q-px-xs">
            {{ denominatedBchAmountText }}
          </div>
          <div
            v-if="Number.isFinite(maxAmount)"
            class="q-mb-md q-pl-xs row items-center text-grey"
          >
            <div class="text-body2 q-space">{{ formattedMaxAmount }} {{ tokenCurrency }}</div>
            <q-btn
              flat
              :label="$t('MAX')"
              class="q-r-mr-md text-body2"
              @click="() => tokenAmount = String(maxAmount)"
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
              color="pt-primary1"
              rounded
              class="col-5 col-sm-3"
              type="submit"
              :disable="!isFormValid || loadingContract"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { formatWithLocale, getDenomDecimals, parseFiatCurrency } from 'src/utils/denomination-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker'
import { satoshisToToken, tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useStore } from 'vuex';
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import CustomInput from '../CustomInput.vue';
import { useI18n } from 'vue-i18n';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';


export default defineComponent({
  name: 'DepositDialog',
  components: {
    CustomInput,
  },
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
    const { t: $t } = useI18n();
    const $store = useStore();
    const $q = useQuasar();
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const { dialogRef, onDialogCancel, onDialogHide, onDialogOK } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))

    const isChipnet = computed(() => $store.getters['global/isChipnet'])
    const backend = computed(() => getStablehedgeBackend(isChipnet.value))
    const loadingContract = ref(false)
    const currentRedemptionContract = ref(props.redemptionContract)
    const availableContracts = ref({})
    const availableCurrencies = ref([])
    const selectedCurrency = ref('')
    const tokenAmount = ref(0)

    // Define computed properties first (before watchers that use them)
    const denomination = computed(() => {
      return props.selectedDenomination || $store.getters['global/denomination']
    })
    const fiatToken = computed(() => currentRedemptionContract.value?.fiat_token)
    const tokenCurrency = computed(() => fiatToken.value?.currency || '')
    const decimals = computed(() => fiatToken.value?.decimals)
    const category = computed(() => fiatToken.value?.category)
    const priceMessage = computed(() => {
      const token = $store.getters['stablehedge/token']?.(category.value)
      return token?.priceMessage
    })
    const priceTimestamp = computed(() => priceMessage.value?.messageTimestamp * 1000)
    const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerDenomination = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      const { convert: conversionRate } = getDenomDecimals(currentDenomination)
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
      if (Number.isFinite(currentRedemptionContract.value?.reserve_supply)) {
        maxAmountFromContract = parseInt(currentRedemptionContract.value?.reserve_supply) || Infinity
      }
      const maxTokenUnits = Math.min(maxAmountFromBalance, maxAmountFromContract)
      return maxTokenUnits / 10 ** decimals.value
    })
    const minAmount = computed(() => {
      return 1 / 10 ** decimals.value
    })
    const formattedMaxAmount = computed(() => {
      if (!Number.isFinite(maxAmount.value)) return ''
      return formatWithLocale(maxAmount.value);
    })
    const formattedMinAmount = computed(() => {
      if (!Number.isFinite(minAmount.value)) return ''
      return formatWithLocale(minAmount.value);
    })

    const tokenUnits = computed(() => {
      if (!Number.isFinite(decimals.value)) return NaN
      return parseInt(tokenAmount.value * 10 ** decimals.value)
    })
    const bchAmount = computed(() => {
      if (!Number.isFinite(priceUnitPerBch.value)) return NaN
      if (!parseInt(tokenUnits.value)) return NaN

      const sats = parseInt(tokenToSatoshis(tokenUnits.value, priceUnitPerBch.value, true))
      return sats / 10 ** 8
    })

    // Check if form is valid for submission
    const isFormValid = computed(() => {
      return Number.isFinite(decimals.value) &&
             Number.isFinite(minAmount.value) &&
             Number.isFinite(maxAmount.value) &&
             Number.isFinite(tokenUnits.value) &&
             tokenUnits.value > 0 &&
             currentRedemptionContract.value &&
             priceMessage.value
    })

    const {
      denominateBch,
      formatDateRelative,
      formatTimestampToText,
    } = useValueFormatters(category)

    const denominatedBchAmountText = computed(() => {
      return bchAmount.value ? denominateBch(bchAmount.value) : ''
    })

    watch(innerVal, () => {
      if (!innerVal.value) return
      tokenAmount.value = 0
      // Initialize currency from current contract
      if (props.redemptionContract?.fiat_token?.currency) {
        selectedCurrency.value = props.redemptionContract.fiat_token.currency
        currentRedemptionContract.value = props.redemptionContract
      }
      // Fetch available contracts
      fetchAvailableContracts()
    })

    watch(() => props.redemptionContract, (newContract) => {
      if (newContract?.fiat_token?.currency) {
        selectedCurrency.value = newContract.fiat_token.currency
        currentRedemptionContract.value = newContract
      }
    }, { immediate: true })

    async function fetchAvailableContracts() {
      if (loadingContract.value) return
      loadingContract.value = true
      try {
        const params = {
          has_treasury_contract: true,
          currencies: 'PHP,USD',
          verified: true,
        }
        const response = await backend.value.get('stablehedge/redemption-contracts/', { params })
        const redemptionContracts = Array.isArray(response.data)
          ? response.data
          : response.data?.results || []

        // Group contracts by currency
        const contractsByCurrency = {}
        redemptionContracts.forEach(contract => {
          const currency = contract?.fiat_token?.currency
          if (currency && (currency === 'PHP' || currency === 'USD')) {
            if (!contractsByCurrency[currency]) {
              contractsByCurrency[currency] = []
            }
            contractsByCurrency[currency].push(contract)
          }
        })

        availableContracts.value = contractsByCurrency
        availableCurrencies.value = Object.keys(contractsByCurrency).sort()

        // If no currency selected yet, use first available
        if (!selectedCurrency.value && availableCurrencies.value.length > 0) {
          selectedCurrency.value = availableCurrencies.value[0]
        }

        // Load contract for selected currency
        // Pass false to suppress duplicate notification (we'll show one here if needed)
        if (selectedCurrency.value && contractsByCurrency[selectedCurrency.value]) {
          await loadContractForCurrency(selectedCurrency.value, false)
        }
      } catch (error) {
        console.error('Error fetching contracts:', error)
        // Show notification for errors from loadContractForCurrency (since we passed showNotification=false)
        // or for other fetch errors (network errors, etc.)
        $q.notify({
          type: 'negative',
          message: typeof error === 'string' ? error : (error?.message || $t('UnableToGetContractDetails')),
        })
      } finally {
        loadingContract.value = false
      }
    }

    async function loadContractForCurrency(currency, showNotification = true) {
      if (!availableContracts.value[currency] || availableContracts.value[currency].length === 0) {
        return
      }

      loadingContract.value = true
      // Save previous contract to revert on error
      const previousContract = currentRedemptionContract.value
      try {
        // Use first contract for the currency
        const contract = availableContracts.value[currency][0]

        // Update price data BEFORE setting the contract
        const category = contract?.fiat_token?.category
        if (category) {
          await $store.dispatch('stablehedge/updateTokenPrices', { includeCategories: [category] })
          
          const token = $store.getters['stablehedge/token']?.(category)
          const priceValue = token?.priceMessage?.priceValue
          if (!Number.isFinite(priceValue)) {
            throw new Error($t('NoPriceDataFound'))
          }
        }

        // Only set contract after successful price validation
        currentRedemptionContract.value = contract

        // Reset token amount when switching currency
        tokenAmount.value = 0
      } catch (error) {
        console.error('Error loading contract:', error)
        // Revert to previous contract on error
        currentRedemptionContract.value = previousContract
        // Only show notification if requested (default true for selectCurrency, false for fetchAvailableContracts)
        if (showNotification) {
          $q.notify({
            type: 'negative',
            message: typeof error === 'string' ? error : $t('UnableToGetContractDetails'),
          })
        }
        // Re-throw to allow selectCurrency to revert selectedCurrency
        throw error
      } finally {
        loadingContract.value = false
      }
    }

    async function selectCurrency(currency) {
      if (selectedCurrency.value === currency || loadingContract.value) return
      // Save previous currency to revert on error
      const previousCurrency = selectedCurrency.value
      selectedCurrency.value = currency
      try {
        await loadContractForCurrency(currency)
      } catch (error) {
        // Revert selectedCurrency if loadContractForCurrency fails
        selectedCurrency.value = previousCurrency
      }
    }

    const subscribeKey = 'deposit-form-dialog'
    onMounted(() => {
      if (!innerVal.value) return
      console.log('Subscribing')
      if (category.value) {
        stablehedgePriceTracker.subscribe(subscribeKey, [category.value])
      }
    })
    onUnmounted(() => stablehedgePriceTracker.unsubscribe(subscribeKey))
    watch([innerVal, category], () => {
      if (innerVal.value && category.value) {
        stablehedgePriceTracker.subscribe(subscribeKey, [category.value])
      } else {
        stablehedgePriceTracker.unsubscribe(subscribeKey)
      }
    })

    function validateAmount(value) {
      const parsed = parseFloat(value);
      // Check if contract data is valid before validating amount
      if (!Number.isFinite(decimals.value)) {
        return $t('ContractDataNotLoaded', {}, 'Contract data not loaded. Please wait...');
      }
      if (!Number.isFinite(minAmount.value) || !Number.isFinite(maxAmount.value)) {
        return $t('ContractDataNotLoaded', {}, 'Contract data not loaded. Please wait...');
      }
      if (parsed < minAmount.value) return $t('MustBeGreaterThan', { amount: formattedMinAmount.value + ' ' + tokenCurrency.value });
      if (parsed > maxAmount.value) return $t('MustBeLessThan', { amount: formattedMaxAmount.value + ' ' + tokenCurrency.value});
      return true
    }

    function onSubmit() {
      // Prevent submission if form is invalid
      if (!isFormValid.value) {
        $q.notify({
          type: 'negative',
          message: $t('ContractDataNotLoaded', {}, 'Contract data not loaded. Please wait...'),
        })
        return
      }
      // Additional safety check: ensure tokenUnits is valid
      if (!Number.isFinite(tokenUnits.value) || tokenUnits.value <= 0) {
        $q.notify({
          type: 'negative',
          message: $t('InvalidAmount', {}, 'Invalid amount. Please enter a valid amount.'),
        })
        return
      }
      onDialogOK({
        tokenUnits: tokenUnits.value,
        redemptionContract: currentRedemptionContract.value,
        priceMessage: priceMessage.value,
      })
    }

    return {
      darkMode, getDarkModeClass,

      dialogRef, onDialogCancel, onDialogHide, onDialogOK,
      innerVal,

      availableCurrencies,
      selectedCurrency,
      loadingContract,
      selectCurrency,

      denomination,
      tokenCurrency,
      decimals,
      priceTimestamp,
      pricePerDenomination,
      maxAmount,
      minAmount,
      formattedMaxAmount,
      formattedMinAmount,
      tokenAmount,
      bchAmount,
      denominatedBchAmountText,
      validateAmount,
      isFormValid,

      onSubmit,

      formatDateRelative,
      formatTimestampToText,
      parseFiatCurrency,
      formatWithLocale,
    }
  }
})
</script>
