<template>
<div>
  <div class="row items-center q-px-xs q-mb-sm">
    <div class="text-h5">{{ redemptionContract?.fiat_token?.currency || 'UNIT' }}</div>
    <q-space/>
    <div v-if="pricePerDenomination" class="text-h6 text-weight-light">
      {{ pricePerDenomination }} {{ currency }}/{{ denomination }}
    </div>
  </div>
  <q-card 
    class="br-15 pt-card text-bow q-mb-md q-pa-md"
    :class="getDarkModeClass(darkMode)"
  >
    <div class="chart-container row items-center justify-center q-mb-sm" style="height:200px;">
      <canvas ref="chartRef"></canvas>
    </div>
    <div class="row items-center justify-around no-wrap q-mb-sm">
      <q-btn flat padding="sm lg" icon="keyboard_arrow_left" @click="() => moveSummaryPanel(-1)"/>
      <div class="text-h6 text-center">{{ summaryPanelLabel }}</div>
      <q-btn flat padding="sm lg" icon="keyboard_arrow_right" @click="() => moveSummaryPanel(1)"/>
    </div>

    <q-tab-panels v-model="summaryPanel" animated style="background:unset;">
      <q-tab-panel name="summary" class="q-pa-none">
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('Volume24hr') }}: </div>
          <div>{{ denominateBch(summaryData?.volume24hrBch) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('TotalValue') }}:</div>
          <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('TokensInCirculation') }}:</div>
          <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('IdealValue') }}:</div>
          <div>
            <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
            {{ denominateBch(summaryData?.expectedBchValue) }}
          </div>
        </div>
      </q-tab-panel>
      <q-tab-panel name="volume24hr" class="q-pa-none">
        <div
          v-for="(data, index) in parsed24HrVolumeChartData" :key="index"
          class="row items-center"
        >
          <div class="text-grey q-space">{{ data?.label }}</div>
          <div>{{ denominateBch(data?.value) }}</div>
        </div>
        <template v-if="parsed24HrVolumeChartData?.length > 1">
          <q-separator spaced/>
          <div class="text-subtitle1 row items-center">
            <div class="text-grey q-space">{{ $t('Total') }}:</div>
            <div>{{ denominateBch(summaryData?.volume24hrBch) }}</div>
          </div>
        </template>
      </q-tab-panel>
      <q-tab-panel name="bchValueComparison" class="q-pa-none">
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('CurrentTotalValue') }}:</div>
          <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('IdealValue') }}:</div>
          <div>
            <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
            {{ denominateBch(summaryData?.expectedBchValue) }}
          </div>
        </div>
        <q-banner class="q-my-sm rounded-borders pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
          <div class="row items-start no-wrap q-space">
            <div class="text-subtitle1 q-pr-sm">
              {{ $t('TotalValueInContractIs') }}
              <span :class="`text-${summaryData?.expectedDiffPctgIcon?.color}`">
                {{ denominateBch(Math.abs(summaryData?.expectedBchValueDiff)) }}
              </span>
              {{ $t(summaryData?.expectedDiffPctg < 0 ? 'below' : 'above') }}
              {{ $t('idealValue') }}
            </div>
            <div>
              <q-icon name="info" size="1.2rem" class="q-my-sm">
                <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                  {{ $t('IdealValueComparisonText') }}
                </q-menu>
              </q-icon>
            </div>
          </div>
        </q-banner>
      </q-tab-panel>
      <q-tab-panel name="bchValueBreakdown" class="q-pa-none">
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('Redeemable') }}:</div>
          <div>{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
        </div>
        <template v-if="parsedTreasuryContractBalance">
          <div class="row items-center">
            <div class="text-grey q-space">{{ $t('TreasuryContract') }}:</div>
            <div>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
          </div>
          <div class="row items-center">
            <div class="text-grey q-space">{{ $t('ShortValue') }}:</div>
            <div>{{ denominateBch(parsedTreasuryContractBalance?.totalShortedBchValue) }}</div>
          </div>
        </template>
        <q-separator spaced/>
        <div class="row items-center text-subtitle1">
          <div class="text-grey q-space">{{ $t('TotalValue') }}:</div>
          <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
        </div>
      </q-tab-panel>
      <q-tab-panel name="token" class="q-pa-none">    
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('TokensInCirculation' )}}:</div>
          <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('RedeemableTokens' )}}:</div>
          <div>
            {{ formatTokenUnits(summaryData?.redeemableTokens) }}
            <span v-if="summaryData?.redeemableTokensPctg">
              ({{ summaryData?.redeemableTokensPctg }}%)
            </span>
          </div>
        </div>
        <q-banner
          v-if="summaryData?.redeemableDiffBchValue < 0"
          class="q-my-sm rounded-borders pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
        >
          <div class="text-subtitlw`">
            {{ $t('RedemptionContractNeeds') }}
            <span class="text-weight-medium">
              {{ denominateBch(Math.abs(summaryData?.redeemableDiffBchValue)) }}
            </span>
            {{ $t('toRedeemAllTokensInCirculation') }}
          </div>
        </q-banner>
      </q-tab-panel>
    </q-tab-panels>
  </q-card>
  <q-card
    class="br-15 pt-card text-bow q-mb-md q-pa-md"
    :class="getDarkModeClass(darkMode)"
    style="position:relative;"
    v-ripple
  >
    <div class="text-body1 text-grey q-mb-xs">{{ $t('RedemptionContract') }}</div>
    <div class="row items-center no-wrap" style="position: relative;" v-ripple @click.stop="copyToClipboard(redemptionContract?.address)">
      <div class="ellipsis text-weight-light q-space">
        {{ redemptionContract?.address }}
      </div>
      <q-icon name="content_copy" right/>
    </div>
    <div
      class="row items-center no-wrap"
      style="position: relative;" v-ripple
      @click.stop="copyToClipboard(toTokenAddress(redemptionContract?.address))"
    >
      <div class="ellipsis text-weight-light q-space">
        {{ toTokenAddress(redemptionContract?.address) }}
      </div>
      <q-icon name="content_copy" right/>
    </div>

    <div class="row items-center justify-between no-wrap q-mt-sm">
      <div>
        <div>{{ $t('Redeemable') }}</div>
        <div class="text-weight-medium">{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
      </div>
      <div class="text-right">
        <div>{{ $t('TokenReserve') }}</div>
        <div class="text-weight-medium">{{ formatTokenUnits(redemptionContract?.reserve_supply || 0) }}</div>
      </div>
    </div>
  </q-card>

  <q-card
    v-if="treasuryContract?.address"
    class="br-15 pt-card text-bow q-mb-md q-pa-md"
    :class="getDarkModeClass(darkMode)"
    style="position:relative;"
    v-ripple
  >
    <div class="text-body1 text-grey q-mb-xs">{{ $t('TreasuryContract') }}</div>
    <div class="row items-center no-wrap" style="position: relative;" v-ripple @click.stop="copyToClipboard(redemptionContract?.address)">
      <div class="ellipsis text-weight-light q-space">
        {{ treasuryContract?.address }}
      </div>
      <q-icon name="content_copy" right/>
    </div>
    <div
      class="row items-center no-wrap"
      style="position: relative;" v-ripple
      @click.stop="copyToClipboard(toTokenAddress(treasuryContract?.address))"
    >
      <div class="ellipsis text-weight-light q-space">
        {{ toTokenAddress(treasuryContract?.address) }}
      </div>
      <q-icon name="content_copy" right/>
    </div>
    <div class="row items-center justify-between no-wrap q-mt-sm">
      <div>
        <div>{{ $t('Spendable') }}</div>
        <div class="text-weight-medium">{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
      </div>
      <div class="text-right">
        <div>{{ $t('InShortPositions') }}</div>
        <div class="text-weight-medium">{{ formatTokenUnits(parsedTreasuryContractBalance?.shortUnitValue) }}</div>
      </div>
    </div>

    <q-separator spaced />
    <div>
      <div class="row items-center">
        <div class="q-space text-body2 text-grey">{{ $t('ShortPositions') }}</div>
        <q-btn flat padding="xs" icon="refresh" @click.stop="() => fetchShortPositions()"/>
      </div>
      <div v-if="fetchingShortPositions" class="text-center">
        <q-spinner color="brandblue" size="2rem"/>
      </div>
      <div v-if="!shortPositions?.length" class="text-grey text-center">
        {{ $t('NoShortPositions') }}
      </div>
      <div
        v-for="shortPosition in shortPositions" :key="shortPosition?.address"
        class="row items-center no-wrap"
      >
        <div class="col-8 ellipsis">
          {{ shortPosition?.address }}
        </div>
        <div class="q-pl-sm q-space text-right">
          <q-btn flat padding="sm" icon="content_copy" @click.stop="() => copyToClipboard(shortPosition?.address)"/>
          <q-btn flat padding="sm" icon="open_in_new" @click.stop="() => openHedgePositionDialog(shortPosition)"/>
        </div>
      </div>
    </div>
  </q-card>
  <HedgeContractDetailDialog
    v-model="hedgePositionDetailDialog.show"
    :contract="hedgePositionDetailDialog.hedgePosition"
  />
</div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { toTokenAddress } from 'src/utils/crypto';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
import { useStablehedgeDashboardWithCharts } from 'src/composables/stablehedge/chart';
import { Chart } from 'chart.js';
import { debounce, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { defineComponent, getCurrentInstance, inject, toRef } from 'vue';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue';


export default defineComponent({
  name: 'RedemptionContractMarketPanel',
  components: {
    HedgeContractDetailDialog,
  },
  props: {
    redemptionContract: {
      /** @returns {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} */
      default: () => {}
    },
  },
  setup(props) {
    const instance = getCurrentInstance()

    const { t: $t } = useI18n()

    const $q = useQuasar()
    const $store = useStore()
    const darkMode = computed(() => $store.getters['darkmode/getStatus'])
    const {
      // isChipnet,
      denomination,
      token,
      tokenCategory,
      priceMessage,
      currency,
      decimals,
      priceUnitPerBch,
      // pricePerBch,
      pricePerDenomination,
      
      treasuryContract,
      fetchTreasuryContract,
      treasuryContractBalance,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,

      summaryData,

      create24hrVolumeChart,
      parsed24HrVolumeChartData,
      createBchValueComparisonChart,
      createBchValueChart,
      createTokenChart,

      shortPositions,
      fetchingShortPositions,
      fetchShortPositions,
    } = useStablehedgeDashboardWithCharts(toRef(props, 'redemptionContract'))

    const priceTrackerKeyId = `redemption-contract-market-panel-${instance.uid}`
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

    onMounted(() => fetchTreasuryContract())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContract(),
    )
    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContractBalance(),
    )

    const summaryPanels = ['summary', 'volume24hr', 'bchValueComparison', 'bchValueBreakdown', 'token']
    /** @type {import("vue").Ref<'summary' | 'volume24hr' | 'bchValueComparison' | 'bchValueBreakdown' | 'token'>} */
    const summaryPanel = ref(summaryPanels[0])

    function moveSummaryPanel(delta=1) {
      const index = summaryPanels.indexOf(summaryPanel.value)
      let newIndex = index + delta
      const panelsCount = summaryPanels.length
      // this modulo ensures a positive number [0, panelsCount)
      newIndex = ((newIndex % panelsCount) + panelsCount) % panelsCount
      summaryPanel.value = summaryPanels[newIndex]
    }

    const summaryPanelLabel = computed(() => {
      switch(summaryPanel.value) {
        case 'summary':
          return $t('Summary')
        case 'volume24hr':
          return $t('Volume24hr')
        case 'bchValueComparison':
          return $t('ContractValue')
        case 'bchValueBreakdown':
          return $t('ContractAssets')
        case 'token':
          return $t('TokensInCirculation')
      }
    })

    /** @type {Chart} */
    let chartObj
    onMounted(() => loadBchValueChart())
    watch(summaryPanel, () => loadBchValueChart())
    onUnmounted(() => chartObj?.destroy?.())

    const chartRef = ref()
    const loadBchValueChart = debounce(() => {
      chartObj?.destroy?.()
      switch(summaryPanel.value) {
        case 'volume24hr':
          chartObj = create24hrVolumeChart(chartRef.value)
          break;
        case 'bchValueComparison':
          chartObj = createBchValueComparisonChart(chartRef.value)
          break;
        case 'bchValueBreakdown':
          chartObj = createBchValueChart(chartRef.value)
          break;
        case 'token':
          chartObj = createTokenChart(chartRef.value)
          break;
      }
    }, 500)

    onMounted(() => fetchShortPositions())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchShortPositions(),
    )
    const hedgePositionDetailDialog = ref({ show: false, hedgePosition: {} })
    function openHedgePositionDialog(hedgePosition) {
      hedgePositionDetailDialog.value = {
        show: true, hedgePosition: hedgePosition,
      }
    }

    /** ------- <Formatters -------  */
    const {
      denominateSats,
      denominateBch,
      formatTokenUnits,
    } = useValueFormatters(tokenCategory)
    /** ------- Formatters> -------  */

    const $copyText = inject('$copyText')
    function copyToClipboard(value) {
      if (!value) return
      $copyText(value)
      $q.notify({
        color: 'blue-9',
        message: $t('CopiedToClipboard'),
        icon: 'mdi-clipboard-check',
        timeout: 200
      })
    }

    return {
      darkMode, getDarkModeClass,

      denomination,
      currency,
      priceMessage,
      pricePerDenomination,

      treasuryContract,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,
      treasuryContractBalance,
      summaryData,

      summaryPanel,
      summaryPanelLabel,
      moveSummaryPanel,
      chartRef,
      parsed24HrVolumeChartData,

      shortPositions,
      fetchingShortPositions,
      fetchShortPositions,
      hedgePositionDetailDialog,
      openHedgePositionDialog,

      denominateSats,
      denominateBch,
      formatTokenUnits,
      copyToClipboard,
      toTokenAddress,
    }
  },
})
</script>
