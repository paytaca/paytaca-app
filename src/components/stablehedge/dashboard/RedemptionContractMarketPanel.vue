<template>
<div class="text-bow" :class="getDarkModeClass(darkMode)">
  <div class="row items-center q-px-xs q-mb-sm">
    <div class="text-h5">{{ redemptionContract?.fiat_token?.currency || 'UNIT' }}</div>
    <q-space/>
    <div v-if="pricePerDenomination" class="text-h6 text-weight-light">
      {{ formatWithLocale(pricePerDenomination, { max: 8}) }} {{ currency }}/{{ denomination }}
    </div>
  </div>
  <q-card 
    class="br-15 pt-card text-bow q-mb-md q-pa-md"
    :class="getDarkModeClass(darkMode)"
  >
    <div class="row items-center justify-around no-wrap q-mb-sm">
      <q-btn flat padding="sm lg" icon="keyboard_arrow_left" @click="() => moveSummaryPanel(-1)"/>
      <div class="text-h6 text-center">{{ summaryPanelLabel }}</div>
      <q-btn flat padding="sm lg" icon="keyboard_arrow_right" @click="() => moveSummaryPanel(1)"/>
    </div>
    <q-slide-transition :duration="750">
      <div v-if="summaryPanel != 'summary'">
        <div class="chart-container row items-center justify-center q-mb-sm" style="height:200px;">
          <canvas ref="chartRef"></canvas>
        </div>
      </div>
    </q-slide-transition>

    <q-tab-panels v-model="summaryPanel" animated :transition-duration="750" style="background:unset;" class="q-r-mx-sm">
      <q-tab-panel name="summary" class="q-pa-xs">
        <div class="row items-start no-wrap">
          <div class="q-space q-pa-xs">
            <div class="text-subtitle1 text-grey">{{ $t('Volume24hr') }}</div>
            <div class="text-body1">{{ denominateBch(volumeSummaryData?.volume24hrBch) }}</div>
            <div class="text-body">{{ formatTransactionsCount(volumeSummaryData?.volume24hrCount) }}</div>
          </div>
          <q-separator vertical spaced/>
          <div class="q-space q-pa-xs">
            <div class="text-subtitle1 text-grey">{{ $t('VolumeAllTime') }}</div>
            <div class="text-body1">{{ denominateBch(volumeSummaryData?.volumeLifetimeBch) }}</div>
            <div class="text-body">{{ formatTransactionsCount(volumeSummaryData?.volumeLifetimeCount) }}</div>
          </div>
        </div>

        <q-separator spaced />

        <div class="text-subtitle1 text-grey">
          {{ $t('TotalValueLocked') }}
          <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-lr-xs"/>
        </div>
        <div class="row items-center text-body1">
          <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
          <template v-if="summaryData?.totalValueInTokens">
            <q-space/>
            <div>{{ formatTokenUnits(summaryData?.totalValueInTokens) }}</div>
          </template>
        </div>

        <q-separator spaced/>

        <div class="text-subtitle1 text-grey">{{ $t('TokensInCirculation') }}</div>
        <div class="row items-center text-body1">
          <template v-if="summaryData?.expectedBchValue">
            <div>{{ denominateBch(summaryData?.expectedBchValue) }}</div>
            <q-space/>
          </template>
          <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
        </div>
      </q-tab-panel>
      <q-tab-panel name="volume24hr" class="q-pa-xs">
        <div
          v-for="(data, index) in parsed24HrVolumeChartData" :key="index"
          class="row items-center"
        >
          <div class="text-grey">{{ data?.label }}</div>
          <span v-if="data?.count" class="text-grey q-mx-xs">({{ data?.count }})</span>
          <q-space/>
          <div>{{ denominateBch(data?.value) }}</div>
        </div>
        <template v-if="parsed24HrVolumeChartData?.length > 1">
          <q-separator spaced/>
          <div class="text-subtitle1 row items-center">
            <div class="text-grey q-space">{{ $t('Total') }}:</div>
            <div>{{ denominateBch(volumeSummaryData?.volume24hrBch) }}</div>
          </div>
        </template>
      </q-tab-panel>
      <q-tab-panel name="volumeLifetime" class="q-pa-xs">
        <div
          v-for="(data, index) in parsedLifetimeVolumeChartData" :key="index"
          class="row items-center"
        >
          <div class="text-grey">{{ data?.label }}</div>
          <span v-if="data?.count" class="text-grey q-mx-xs">({{ data?.count }})</span>
          <q-space/>
          <div>{{ denominateBch(data?.value) }}</div>
        </div>
        <template v-if="parsed24HrVolumeChartData?.length > 1">
          <q-separator spaced/>
          <div class="text-subtitle1 row items-center">
            <div class="text-grey q-space">{{ $t('Total') }}:</div>
            <div>{{ denominateBch(volumeSummaryData?.volumeLifetimeBch) }}</div>
          </div>
        </template>
      </q-tab-panel>
      <q-tab-panel name="bchValueComparison" class="q-pa-xs">
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('TotalValueLocked') }}:</div>
          <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
        </div>
        <div class="row items-center">
          <div class="text-grey q-space">{{ $t('IdealValue') }}:</div>
          <div>
            <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
            {{ denominateBch(summaryData?.expectedBchValue) }}
          </div>
        </div>
        <q-banner class="q-my-sm rounded-borders pt-card-2 text-bow" :class="getDarkModeClass(darkMode, '', 'shadow-3')">
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
      <q-tab-panel name="bchValueBreakdown" class="q-pa-xs">
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
      <q-tab-panel name="token" class="q-pa-xs">    
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
          class="q-my-sm rounded-borders pt-card-2 text-bow" :class="getDarkModeClass(darkMode, '', 'shadow-3')"
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
    v-ripple="Boolean(redemptionContractAuth?.hasAuthToken)"
  >
    <q-menu
      v-if="redemptionContractAuth?.hasAuthToken"
      touch-position
      class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
    >
      <q-list separator>
        <q-item clickable v-close-popup @click="() => consolidateReserveUtxo()">
          <q-item-section>
            <q-item-label>{{ $t('ConsolidateReserveUtxo') }}</q-item-label>
          </q-item-section>
        </q-item>  
        <q-item clickable v-close-popup @click="() => sweepRedemptionContract()">
          <q-item-section>
            <q-item-label>{{ $t('Sweep') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
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
        <div>{{ $t('TokenReserves') }}</div>
        <div class="text-weight-medium">{{ formatTokenUnits(redemptionContract?.reserve_supply || 0) }}</div>
      </div>
    </div>
  </q-card>

  <q-card
    v-if="treasuryContract?.address"
    class="br-15 pt-card text-bow q-mb-md q-pa-md"
    :class="getDarkModeClass(darkMode)"
    style="position:relative;"
    v-ripple="Boolean(treasuryContractAuth?.hasAuthToken)"
  >
    <q-menu
      v-if="treasuryContractAuth?.hasAuthToken"
      touch-position
      class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
    >
      <q-list separator>
        <q-item clickable v-close-popup @click="() => showTreasuryContractSendForm = true">
          <q-item-section>
            <q-item-label>{{ $t('TransferBCH') }}</q-item-label>
          </q-item-section>
        </q-item>  
        <q-item clickable v-close-popup @click="() => sweepTreasuryContract()">
          <q-item-section>
            <q-item-label>{{ $t('Sweep') }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
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
  <SendBCHFormDialog
    v-model="showTreasuryContractSendForm"
    :title="$t('EnterAmount')"
    :maxSatoshis="parseInt(maxTreasuryContractSpendable)"
    @ok="sendTreasuryContractBCH"
  />
</div>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { toTokenAddress } from 'src/utils/crypto';
import { formatWithLocale } from 'src/utils/denomination-utils';
import { consolidateToReserveUtxo, createTreasuryContractTransaction, sweepContractWithAuthToken } from 'src/wallet/stablehedge/transaction';
import stablehedgePriceTracker from 'src/wallet/stablehedge/price-tracker';
import { useValueFormatters } from 'src/composables/stablehedge/formatters';
import { useStablehedgeDashboardWithCharts } from 'src/composables/stablehedge/chart';
import { useAuthguardTokenFetcher } from 'src/composables/stablehedge/manage';
import { debounce, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { defineComponent, getCurrentInstance, inject, toRef } from 'vue';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

import HedgeContractDetailDialog from 'src/components/anyhedge/HedgeContractDetailDialog.vue';
import SendBCHFormDialog from './SendBCHFormDialog.vue';
import TransactionConfirmDialog from './TransactionConfirmDialog.vue';


export default defineComponent({
  name: 'RedemptionContractMarketPanel',
  components: {
    SendBCHFormDialog,
    HedgeContractDetailDialog,
  },
  emits: [
    'refetch',
  ],
  props: {
    redemptionContract: {
      /** @returns {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} */
      default: () => {}
    },
  },
  setup(props, { emit: $emit }) {
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

      fetchRedemptionContractMarketInfo,
      
      treasuryContract,
      fetchTreasuryContract,
      treasuryContractBalance,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,

      volumeSummaryData,
      summaryData,

      create24hrVolumeChart,
      parsed24HrVolumeChartData,
      createLifetimeVolumeChart,
      parsedLifetimeVolumeChartData,
      createBchValueComparisonChart,
      bchValueComparisonChartData,
      createBchValueChart,
      bchValuePieChartData,
      createTokenChart,
      tokenChartData,

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

    onMounted(() => fetchRedemptionContractMarketInfo())
    watch(
      () => props.redemptionContract?.address,
      () => fetchRedemptionContractMarketInfo(),
    )

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

    const summaryPanels = ['summary', 'volume24hr', 'volumeLifetime', 'bchValueComparison', 'bchValueBreakdown', 'token']
    /** @type {import("vue").Ref<'summary' | 'volume24hr' | 'volumeLifetime' | 'bchValueComparison' | 'bchValueBreakdown' | 'token'>} */
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
        case 'volumeLifetime':
          return $t('VolumeAllTime')
        case 'bchValueComparison':
          return $t('ContractValue')
        case 'bchValueBreakdown':
          return $t('ContractAssets')
        case 'token':
          return $t('TokensInCirculation')
      }
    })

    const chartData = computed(() => {
      switch(summaryPanel.value) {
        case 'volume24hr':
          return parsed24HrVolumeChartData
        case 'volumeLifetime':
          return parsedLifetimeVolumeChartData
        case 'bchValueComparison':
          return bchValueComparisonChartData
        case 'bchValueBreakdown':
          return bchValuePieChartData
        case 'token':
          return tokenChartData
      }
    })

    /** @type {import("chart.js").Chart} */
    let chartObj
    onMounted(() => loadBchValueChart())
    watch(summaryPanel, () => loadBchValueChart())
    watch(chartData, () => loadBchValueChart(), { deep: true })
    onUnmounted(() => chartObj?.destroy?.())

    const chartRef = ref()
    const loadBchValueChart = debounce(() => {
      chartObj?.destroy?.()
      switch(summaryPanel.value) {
        case 'volume24hr':
          chartObj = create24hrVolumeChart(chartRef.value)
          break;
        case 'volumeLifetime':
          chartObj = createLifetimeVolumeChart(chartRef.value)
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

    const redemptionContractAuthTokenId = computed(() => props.redemptionContract?.auth_token_id)
    const redemptionContractAuth = useAuthguardTokenFetcher(redemptionContractAuthTokenId)
    onMounted(() => redemptionContractAuth.getAuthTokenUtxo())
    watch(
      redemptionContractAuthTokenId,
      () => redemptionContractAuth.getAuthTokenUtxo(),
    )

    const treasuryContractAuthTokenId = computed(() => treasuryContract.value?.auth_token_id)
    const treasuryContractAuth = useAuthguardTokenFetcher(treasuryContractAuthTokenId)
    watch(
      treasuryContractAuthTokenId,
      () => treasuryContractAuth.getAuthTokenUtxo(),
    )

    async function consolidateReserveUtxo() {
      const loadingKey = 'consolidate-redemption-contract-reserve-utxo'
      try {
        const wallet = await redemptionContractAuth.getStablehedgeWallet()
        const redemptionContractData = props.redemptionContract

        let updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const transaction = await consolidateToReserveUtxo({
          locktime: 0,
          wallet: wallet,
          redemptionContract: redemptionContractData,
          updateLoading: updateLoading,
        })

        const txHex = await transaction.build()
        $q.loading.hide(loadingKey)
        const proceed = await new Promise(resolve => {
          $q.dialog({
            component: TransactionConfirmDialog,
            componentProps: {
              transaction: { inputs: transaction.inputs, outputs: transaction.outputs },
            },
          }).onOk(() => resolve(true))
            .onCancel(() => resolve(false))
            .onDismiss(() => resolve(false))
        })
        if (!proceed) return

        updateLoading = $q.loading.show({ group: loadingKey })
        updateLoading({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await wallet.broadcast(txHex)
        if (broadcastResult.data?.error) {
          throw broadcastResult?.data?.error
        }

        $q.notify({
          type: 'positive',
          message: $t('Success'),
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
        $emit('refetch')
      } catch(error) {
        console.error(error)
        let errorMessage = $t('UnknownError')
        if (typeof error === 'string') errorMessage = error
        if (typeof error?.message === 'string') errorMessage = error?.message

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }


    async function getSweepRecipient() {
      return new Promise(resolve => {
        $q.dialog({
          class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`,
          color: 'brandblue',
          title: $t('Sweep'),
          position: 'bottom',
          prompt: {
            label: $t('Recipient') + ' ' + $t('Address'),
            autogrow: true,
            model: '',
          },
        }).onOk(resolve).onDismiss(() => resolve())
      })
    }

    async function sweepRedemptionContract() {
      const loadingKey = 'sweep-redemption-contract'
      try {
        const recipientAddress = await getSweepRecipient()
        if (!recipientAddress) return

        const wallet = await redemptionContractAuth.getStablehedgeWallet()
        const redemptionContractData = props.redemptionContract

        let updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const transaction = await sweepContractWithAuthToken({
          locktime: 0,
          wallet: wallet,
          redemptionContract: redemptionContractData,
          recipientAddress: recipientAddress,
          updateLoading: updateLoading,
        })

        const txHex = await transaction.build()
        console.log(txHex)

        $q.loading.hide(loadingKey)
        const proceed = await new Promise(resolve => {
          $q.dialog({
            component: TransactionConfirmDialog,
            componentProps: {
              transaction: { inputs: transaction.inputs, outputs: transaction.outputs },
            },
          }).onOk(() => resolve(true))
            .onCancel(() => resolve(false))
            .onDismiss(() => resolve(false))
        })
        if (!proceed) return

        updateLoading = $q.loading.show({ group: loadingKey })
        updateLoading({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await wallet.broadcast(txHex)
        if (broadcastResult.data?.error) {
          throw broadcastResult?.data?.error
        }

        $q.notify({
          type: 'positive',
          message: $t('Success'),
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
        $emit('refetch')
      } catch(error) {
        console.error(error)
        let errorMessage = $t('UnknownError')
        if (typeof error === 'string') errorMessage = error
        if (typeof error?.message === 'string') errorMessage = error?.message

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    const showTreasuryContractSendForm = ref(false)
    const maxTreasuryContractSpendable = computed(() => {
      const P2PKH_INPUT_SIZE = 32 + 4 + 1 + 1 + 65 + 1 + 33 + 4;
      const P2PKH_OUTPUT_SIZE = 109;
      return treasuryContractBalance.value?.spendable - P2PKH_INPUT_SIZE - P2PKH_OUTPUT_SIZE
    })

        /**
     * @param {{ recipient:String, satoshis:Number }} opts 
     */
     async function sendTreasuryContractBCH(opts) {
      const loadingKey = 'send-treasury-contract-bch'
      try {
        const wallet = await treasuryContractAuth.getStablehedgeWallet()
        const treasuryContractData = treasuryContract.value

        const amountSats = opts?.satoshis
        const recipient = opts?.recipient

        let updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const transaction = await createTreasuryContractTransaction({
          locktime: 0,
          wallet: wallet,
          treasuryContract: treasuryContractData,
          recipients: [{ to: recipient, amount: BigInt(amountSats) }],
          updateLoading: updateLoading,
        })

        const txHex = await transaction.build()
        console.log(txHex)

        $q.loading.hide(loadingKey)
        const proceed = await new Promise(resolve => {
          $q.dialog({
            component: TransactionConfirmDialog,
            componentProps: {
              transaction: { inputs: transaction.inputs, outputs: transaction.outputs },
            },
          }).onOk(() => resolve(true))
            .onCancel(() => resolve(false))
            .onDismiss(() => resolve(false))
        })
        if (!proceed) return

        updateLoading = $q.loading.show({ group: loadingKey })
        updateLoading({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await wallet.broadcast(txHex)
        if (broadcastResult.data?.error) {
          throw broadcastResult?.data?.error
        }

        $q.notify({
          type: 'positive',
          message: $t('Success'),
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })

        fetchTreasuryContractBalance()
      } catch(error) {
        console.error(error)
        let errorMessage = $t('UnknownError')
        if (typeof error === 'string') errorMessage = error
        if (typeof error?.message === 'string') errorMessage = error?.message

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    async function sweepTreasuryContract() {
      const loadingKey = 'sweep-treasury-contract'
      try {
        const recipientAddress = await getSweepRecipient()
        if (!recipientAddress) return

        const wallet = await treasuryContractAuth.getStablehedgeWallet()
        const treasuryContractData = treasuryContract.value

        let updateLoading = $q.loading.show({ group: loadingKey, delay: 500 })
        const transaction = await sweepContractWithAuthToken({
          locktime: 0,
          wallet: wallet,
          treasuryContract: treasuryContractData,
          recipientAddress: recipientAddress,
          updateLoading: updateLoading,
        })

        const txHex = await transaction.build()
        console.log(txHex)

        $q.loading.hide(loadingKey)
        const proceed = await new Promise(resolve => {
          $q.dialog({
            component: TransactionConfirmDialog,
            componentProps: {
              transaction: { inputs: transaction.inputs, outputs: transaction.outputs },
            },
          }).onOk(() => resolve(true))
            .onCancel(() => resolve(false))
            .onDismiss(() => resolve(false))
        })
        if (!proceed) return

        updateLoading = $q.loading.show({ group: loadingKey })
        updateLoading({ message: $t('BroadcastingTransaction') })
        const broadcastResult = await wallet.broadcast(txHex)
        if (broadcastResult.data?.error) {
          throw broadcastResult?.data?.error
        }

        $q.notify({
          type: 'positive',
          message: $t('Success'),
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
        fetchTreasuryContractBalance()
      } catch(error) {
        console.error(error)
        let errorMessage = $t('UnknownError')
        if (typeof error === 'string') errorMessage = error
        if (typeof error?.message === 'string') errorMessage = error?.message

        $q.notify({
          type: 'negative',
          message: $t('Error'),
          caption: errorMessage,
          timeout: 5 * 1000,
          actions: [
            { icon: 'close', color: 'white', round: true, handler: () => { /* ... */ } }
          ]
        })
      } finally {
        $q.loading.hide(loadingKey)
      }
    }

    /** ------- <Formatters -------  */
    const {
      denominateSats,
      denominateBch,
      formatTokenUnits,
      formatTransactionsCount,
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

      fetchRedemptionContractMarketInfo,

      treasuryContract,
      fetchTreasuryContract,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,
      treasuryContractBalance,
      volumeSummaryData,
      summaryData,

      summaryPanel,
      summaryPanelLabel,
      moveSummaryPanel,
      chartRef,
      parsed24HrVolumeChartData,
      parsedLifetimeVolumeChartData,

      shortPositions,
      fetchingShortPositions,
      fetchShortPositions,
      hedgePositionDetailDialog,
      openHedgePositionDialog,

      redemptionContractAuth,
      treasuryContractAuth,

      consolidateReserveUtxo,
      sweepRedemptionContract,

      showTreasuryContractSendForm,
      maxTreasuryContractSpendable,
      sendTreasuryContractBCH,
      sweepTreasuryContract,

      formatWithLocale,
      denominateSats,
      denominateBch,
      formatTokenUnits,
      formatTransactionsCount,
      copyToClipboard,
      toTokenAddress,
    }
  },
})
</script>
