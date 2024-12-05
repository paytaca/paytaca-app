<template>
  <q-card class="br-15 pt-card text-bow" :class="getDarkModeClass(darkMode)">
    <q-card-section>
      <div class="row items-center">
        <div class="text-h5">{{ redemptionContract?.fiat_token?.currency || 'UNIT' }}</div>
        <q-space/>
        <div v-if="pricePerDenomination">
          {{ pricePerDenomination }} {{ currency }}/{{ denomination }}
        </div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Volume (24 hr): </div>
        <div>{{ denominateBch(summaryData?.volume24hrBch) }}</div>
      </div>
      <div class="row items-center" style="position:relative;" v-ripple @click.stop="() => expandBchValue = !expandBchValue">
        <div class="text-grey q-space">
          {{ denomination }} value:
          <q-icon :name="expandBchValue ? 'expand_less' : 'expand_more'"/>
        </div>
        <q-skeleton
          v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
          style="min-width:4rem"
        />
        <div v-else>
          <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
          {{ denominateBch(summaryData?.totalBchValue) }}
        </div>
      </div>
      <q-slide-transition>
        <div v-if="expandBchValue" class="q-pl-md">
          <div class="row items-center">
            <div class="text-grey q-space">Ideal Value:</div>
            <q-skeleton
              v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
              style="min-width:4rem"
            />
            <div v-else>{{ denominateBch(summaryData?.expectedBchValue) }}</div>
          </div>
          <div class="row items-center">
            <div class="text-grey q-space">Redeemable:</div>
            <div>{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
          </div>
          <template v-if="parsedTreasuryContractBalance">
            <div class="row items-center">
              <div class="text-grey q-space">Treasury contract:</div>

              <q-skeleton
                v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
                style="min-width:4rem"
              />
              <div v-else>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
            </div>
            <div class="row items-center">
              <div class="text-grey q-space">Short value:</div>
              <q-skeleton
                v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
                style="min-width:4rem"
              />
              <div v-else>{{ denominateBch(parsedTreasuryContractBalance?.totalShortedBchValue) }}</div>
            </div>
          </template>
        </div>
      </q-slide-transition>
      <div class="row items-center">
        <div class="text-grey q-space">Tokens in circulation:</div>
        <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
      </div>
    </q-card-section>
  </q-card>
</template>
<script>
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { computed, defineComponent, watch, onMounted, onUnmounted, ref, getCurrentInstance } from 'vue';

export default defineComponent({
  name: 'RedemptionContractMarketInfo',
  props: {
    redemptionContract: {
      /** @returns {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} */
      default: () => {}
    },
  },
  setup(props) {
    const instance = getCurrentInstance()

    const { t: $t } = useI18n()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const isChipnet = computed(() => $store.getters['global/isChipnet'])
    const denomination = computed(() => $store.getters['global/denomination'])

    const tokenCategory = computed(() => props.redemptionContract?.fiat_token?.category)
    const token = computed(() => $store.getters['stablehedge/token'](tokenCategory.value))
    const priceMessage = computed(() => token.value?.priceMessage)
    const currency = computed(() => token.value?.currency)
    const decimals = computed(() => token.value?.decimals)

    const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
    const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
    const pricePerDenomination = computed(() => {
      const currentDenomination = denomination.value || 'BCH'
      const conversionRate = parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
      return pricePerBch.value / conversionRate
    })

    const priceTrackerKeyId = `redemption-contract-card-${instance.uid}`
    onMounted(() => updatePriceTrackerSub())
    onUnmounted(() => () => stablehedgePriceTracker.unsubscribe(priceTrackerKeyId))
    watch(() => props.redemptionContract?.fiat_token?.category, () => updatePriceTrackerSub())
    function updatePriceTrackerSub() {
      if (tokenCategory.value) {
        stablehedgePriceTracker.subscribe(priceTrackerKeyId, [tokenCategory.value])
        if (!priceUnitPerBch.value) {
          $store.dispatch(
            'stablehedge/updateTokenPrices',
            { includeCategories: [tokenCategory.value] },
          )
        }
      } else {
        stablehedgePriceTracker.unsubscribe(priceTrackerKeyId)
      }
    }

    const expandBchValue = ref(false)

    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => {
        treasuryContractBalanceLoaded.value = false
        fetchTreasuryContractBalance()
      },
    )

    const treasuryContractBalanceLoaded = ref(false)
    const fetchingTreasuryContractBalance = ref(false)
    const treasuryContractBalance = ref()
    function fetchTreasuryContractBalance() {
      const address = props.redemptionContract?.treasury_contract_address
      if (!address) return

      const backend = getStablehedgeBackend(isChipnet.value)
      fetchingTreasuryContractBalance.value = true
      return backend.get(`stablehedge/treasury-contracts/${address}/balance/`)
        .then(response => {
          treasuryContractBalance.value = { address, ...response.data}
          return response
        })
        .finally(() => {
          fetchingTreasuryContractBalance.value = false
          treasuryContractBalanceLoaded.value = true
        })
    }

    const parsedTreasuryContractBalance = computed(() => {
      if (props.redemptionContract?.treasury_contract_address != treasuryContractBalance.value?.address) return
      const balanceData = treasuryContractBalance.value
      if (!balanceData) return

      const spendableBch = balanceData?.spendable / 10 ** 8
      const shortUnitValue = balanceData?.in_short?.unit_value
      let shortSatoshisValue
      if (priceUnitPerBch.value) {
        shortSatoshisValue = Number(tokenToSatoshis(shortUnitValue, priceUnitPerBch.value))
      }

      const totalShortedBchValue = shortSatoshisValue / 10 ** 8
      const totalBchValue = spendableBch + totalShortedBchValue
      return {
        spendableBch,
        totalShortedBchValue,
        shortUnitValue,
        totalBchValue,
      }
    })

    const summaryData = computed(() => {
      const redeemableBch = (parseInt(props.redemptionContract?.redeemable) || 0) / 10 ** 8

      const treasuryContractBchValue = parsedTreasuryContractBalance.value
        ? parsedTreasuryContractBalance.value?.totalBchValue : 0
      const totalBchValue = redeemableBch + treasuryContractBchValue

      const genesisSupply = parseInt(props.redemptionContract?.fiat_token?.genesis_supply)
      const tokensInCirculation = genesisSupply - props.redemptionContract?.reserve_supply
      let expectedBchValue, expectedDiffPctg

      if (Number.isSafeInteger(tokensInCirculation) && Number.isSafeInteger(priceUnitPerBch.value)) {
        expectedBchValue = Number(
          tokenToSatoshis(tokensInCirculation, priceUnitPerBch.value)
        )
        expectedDiffPctg = Math.round((totalBchValue / expectedBchValue) * 100) || 0
      }

      const expectedDiffPctgIcon = {
        name: expectedDiffPctg < 0 ? 'trending_down' : 'trending_up',
        color: expectedDiffPctg < 0 ? 'red' : 'green',
      }

      return {
        volume24hrBch: props.redemptionContract?.volume_24_hr / 10 ** 8,
        totalBchValue,
        tokensInCirculation,
        expectedBchValue,
        expectedDiffPctg,
        expectedDiffPctgIcon,
      }
    })

    /** <Formatters */
    function denominateSats(amount) {
      return denominateBch(amount / 10 ** 8)
    }

    function denominateBch(amount) {
      const currentDenomination = denomination.value || 'BCH'
      const parsedBCHBalance = getAssetDenomination(currentDenomination, amount)

      if (currentDenomination === $t('DEEM')) {
        const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
        return `${commaBalance} ${currentDenomination}`
      }

      return parsedBCHBalance
    }

    function formatTokenUnits(amount) {
      const decimals = parseInt(token.value?.decimals) || 0
      const currency = token.value?.currency || 'UNIT'

      const tokens = amount / 10 ** decimals
      return `${tokens} ${currency}`
    }
    /** Formatters> */

    return {
      darkMode, getDarkModeClass,
      currency,
      denomination,

      pricePerDenomination,

      expandBchValue,

      treasuryContractBalanceLoaded,
      fetchingTreasuryContractBalance,
      parsedTreasuryContractBalance,
      summaryData,

      denominateSats,
      denominateBch,
      formatTokenUnits,
    }
  }
})

</script>