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
        <div class="text-grey q-space">{{ $t('Volume24hr')}}</div>
        <q-skeleton
          v-if="fetchingRedemptionContractMarketInfo && !redemptionContractMarketInfoLoaded" type="text"
          style="min-width:4rem"
        />
        <div v-else>
          <div>{{ denominateBch(volumeSummaryData?.volume24hrBch) }}</div>
        </div>
      </div>
      <div class="row items-center" style="position:relative;" v-ripple @click.stop="() => expandBchValue = !expandBchValue">
        <div class="text-grey q-space">
          {{ denomination }} {{ $t('Value') }}:
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
            <div class="text-grey q-space">{{ $t('IdealValue' )}}:</div>
            <q-skeleton
              v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
              style="min-width:4rem"
            />
            <div v-else>{{ denominateBch(summaryData?.expectedBchValue) }}</div>
          </div>
          <div class="row items-center">
            <div class="text-grey q-space">{{ $t('Redeemable') }}:</div>
            <div>{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
          </div>
          <template v-if="parsedTreasuryContractBalance">
            <div class="row items-center">
              <div class="text-grey q-space">{{ $t('TreasuryContract') }}:</div>

              <q-skeleton
                v-if="fetchingTreasuryContractBalance && !treasuryContractBalanceLoaded" type="text"
                style="min-width:4rem"
              />
              <div v-else>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
            </div>
            <div class="row items-center">
              <div class="text-grey q-space">{{ $t('ShortValue') }}:</div>
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
        <div class="text-grey q-space">{{ $t('TokensInCirculation') }}:</div>
        <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">{{ $t('RedeemableTokens') }}:</div>
        <div>
          {{ formatTokenUnits(summaryData?.redeemableTokens) }}
          <span v-if="summaryData?.redeemableTokensPctg">
            ({{ summaryData?.redeemableTokensPctg }}%)
          </span>
        </div>
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
import { useStablehedgeDashboard } from 'src/composables/stablehedge/dashboard';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
import { toRef } from 'vue';

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
    const isNotDefaultTheme = computed(() => $store.getters['global/theme'] === 'payhero')
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])

    const {
      isChipnet,
      denomination,
      tokenCategory,
      token,
      priceMessage,
      currency,
      decimals,

      pricePerBch,
      priceUnitPerBch,
      pricePerDenomination,

      fetchingRedemptionContractMarketInfo,
      fetchRedemptionContractMarketInfo,

      fetchingTreasuryContractBalance,
      treasuryContractBalance,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,

      volumeSummaryData,
      summaryData,
    } = useStablehedgeDashboard(toRef(props, 'redemptionContract'))

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

    onMounted(() => fetchRedemptionContractMarketInfo())
    watch(
      () => props.redemptionContract?.address,
      () => {
        redemptionContractMarketInfoLoaded.value = false
        fetchRedemptionContractMarketInfo()
          ?.finally(() => redemptionContractMarketInfoLoaded.value = true)
      },
    )
    const redemptionContractMarketInfoLoaded = ref(false)
      
    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => {
        treasuryContractBalanceLoaded.value = false
        fetchTreasuryContractBalance()
          ?.finally(() => treasuryContractBalanceLoaded.value = true)
      },
    )
    const treasuryContractBalanceLoaded = ref(false)

    /** <Formatters */
    const { 
      denominateSats,
      denominateBch,
      formatTokenUnits,
    } = useValueFormatters(tokenCategory)
    /** Formatters> */

    return {
      darkMode, getDarkModeClass,
      currency,
      denomination,

      pricePerDenomination,

      expandBchValue,
      
      redemptionContractMarketInfoLoaded,
      fetchingRedemptionContractMarketInfo,

      treasuryContractBalanceLoaded,
      fetchingTreasuryContractBalance,
      parsedTreasuryContractBalance,

      volumeSummaryData,
      summaryData,

      denominateSats,
      denominateBch,
      formatTokenUnits,
    }
  }
})

</script>
<style lang="scss" scoped>
.chart-container {
  height: 150px;
}
</style>
