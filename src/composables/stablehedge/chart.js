import { Chart } from 'chart.js/auto';

import { useI18n } from 'vue-i18n';
import { capitalize, computed, toValue } from "vue";


import { Store } from "src/store";
import { useStablehedgeDashboard } from "./dashboard";

/**
 * @typedef {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} RedemptionContractApiData
 * @typedef {import("vue").Ref<RedemptionContractApiData>} RedemptionContractApiRef
 */


/**
 * @param {RedemptionContractApiData | RedemptionContractApiRef} redemptionContractDataOrRef
 */
export function useStablehedgeDashboardWithCharts(redemptionContractDataOrRef) {
  const $store = Store
  const { t: $t } = useI18n()

  const dashboardComposables = useStablehedgeDashboard(redemptionContractDataOrRef)
  const {
    denomination,
    decimals,

    redemptionContractMarketInfo,
    parsedTreasuryContractBalance,

    volumeSummaryData,
    summaryData,
  } = dashboardComposables


  const isNotDefaultTheme = computed(() => $store.getters['global/theme'] === 'payhero')
  const chartColors = computed(() => {
    // From https://coolors.co/image-picker - screnshot of main page
    if (isNotDefaultTheme.value) {
      return [
        { name: 'Bone', hex: '#DCD8CC' },
        { name: 'Marian blue', hex: '#2B4570' },
        { name: 'Gold (metallic)', hex: '#CFB362' },
        { name: 'Glaucous', hex: '#768BB4' },
        { name: 'Prussian blue', hex: '#1A2838' },
      ]
    }

    return [
      { name: 'Sapphire', hex: '#2C5AB6' },
      { name: 'Chinese Violet', hex: '#675672' },
      { name: 'Marian blue', hex: '#29427B' },
      { name: 'Blush', hex: '#EA5484' },
      { name: 'Prussian blue', hex: '#27384D' },
    ]
  })

  function getChartColors(count=0) {
    return new Array(count).fill()
      .map((_, index) => {
        const _index = index % chartColors.value.length
        return chartColors.value[_index]?.hex
      })
  }

  function create24hrVolumeChart(ref) {
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: parsed24HrVolumeChartData.value.map(data => data.label),
        datasets: [{
          data: parsed24HrVolumeChartData.value.map(data => data.value),
          backgroundColor: getChartColors(parsed24HrVolumeChartData.value.length),
        }]
      },
      options: {
        indexAxis: 'y',
        devicePixelRatio: 4,
        responsive: true,
        plugins: {
          legend: { display: false },
        }
      }
    })
  }
  const parsed24HrVolumeChartData = computed(() => {
    return volumeSummaryData.value.volume24hrData.map(volumeData => {
      const txType = volumeData.transaction_type
      const label = capitalize(txType).replaceAll('_', ' ')
      const satoshis = parseInt(volumeData.satoshis) || 0
      const value = satoshis / 10 ** 8
      return { label, value, count: volumeData.count }
    })
  })

  function createLifetimeVolumeChart(ref) {
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: parsedLifetimeVolumeChartData.value.map(data => data.label),
        datasets: [{
          data: parsedLifetimeVolumeChartData.value.map(data => data.value),
          backgroundColor: getChartColors(parsedLifetimeVolumeChartData.value.length),
        }]
      },
      options: {
        indexAxis: 'y',
        devicePixelRatio: 4,
        responsive: true,
        plugins: {
          legend: { display: false },
        }
      }
    })
  }
  const parsedLifetimeVolumeChartData = computed(() => {
    return volumeSummaryData.value.volumeLifetimeData.map(volumeData => {
      const txType = volumeData.transaction_type
      const label = capitalize(txType).replaceAll('_', ' ')
      const satoshis = parseInt(volumeData.satoshis) || 0
      const value = satoshis / 10 ** 8
      return { label, value, count: volumeData.count }
    })
  })

  function createBchValueComparisonChart(ref) {
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: [`${denomination.value} ${$t('Value')}`, $t('IdealValue')],
        datasets: [{
          data: bchValueComparisonChartData.value,
          backgroundColor: getChartColors(2),
        }]
      },
      options: {
        indexAxis: 'y',
        devicePixelRatio: 4,
        responsive: true,
        plugins: {
          legend: { display: false },
        }
      }
    })
  }
  const bchValueComparisonChartData = computed(() => {
    return [summaryData.value.totalBchValue, summaryData.value.expectedBchValue]
  })

  function createBchValueChart(ref) {
    return new Chart(ref, {
      type: 'pie',
      data: bchValuePieChartData.value,
      options: {
        devicePixelRatio: 4,
        responsive: true,
        plugins: {
          legend: { display: false },
        }
      }
    })
  }
  const bchValuePieChartData = computed(() => {
    const redemptionContract = toValue(redemptionContractDataOrRef)
    const redeemableBch = (redemptionContract?.redeemable || 0) / 10 ** 8
    const data = [
      { label: $t('Redeemable'), value: redeemableBch },
    ]
    if (parsedTreasuryContractBalance.value) {
      data.push(
        { label: $t('TreasuryContract'), value: parsedTreasuryContractBalance.value.spendableBch },
        { label: $t('ShortValue'), value: parsedTreasuryContractBalance.value.totalShortedBchValue },
      )
    }

    return {
      labels: data.map(_data => _data?.label),
      datasets: [{
        label: `${denomination.value} ${$t('Value')}`,
        data: data.map(_data => _data.value),
        backgroundColor: getChartColors(data?.length),
      }]
    }
  })

  function createTokenChart(ref) {
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: tokenChartData.value.map(data => data?.label),
        datasets: [{
          data: tokenChartData.value.map(data => data?.value),
          backgroundColor: getChartColors(2),
        }]
      },
      options: {
        indexAxis: 'y',
        devicePixelRatio: 4,
        responsive: true,
        plugins: {
          legend: { display: false },
        }
      }
    })
  }

  const tokenChartData = computed(() => {
    const redemptionContract = toValue(redemptionContractDataOrRef)
    const tokenDecimals = parseInt(decimals.value) || 0

    return [
      {
        label: $t('TokensInCirculation'),
        value: summaryData.value.tokensInCirculation / 10 ** tokenDecimals,
      },
      {
        label: $t('RedeemableTokens'),
        value: summaryData.value.redeemableTokens / 10 ** tokenDecimals,
      },
      {
        label: $t('ReserveSupply'),
        value: redemptionContract?.reserve_supply / 10 ** tokenDecimals,
      }
    ]
  })

  return {
    ...dashboardComposables,
    chartColors,
    getChartColors,

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
  }
}
