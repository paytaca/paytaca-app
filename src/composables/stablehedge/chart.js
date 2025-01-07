import { Chart } from 'chart.js';

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
    parsedTreasuryContractBalance,
    summaryData,
  } = dashboardComposables


  const isNotDefaultTheme = computed(() => $store.getters['global/theme'] !== 'default')
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
    const data = toValue(redemptionContractDataOrRef)?.volume_24_hr
    return Object.getOwnPropertyNames(data)
      .map(txType => {
        const label = capitalize(txType).replaceAll('_', ' ')
        const satoshis = parseInt(data[txType])
        if (!Number.isSafeInteger(satoshis)) return
        const value = satoshis / 10 ** 8
        return { label, value }
      })
      .filter(Boolean)
  })

  function createBchValueComparisonChart(ref) {
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: [`${denomination.value} ${$t('Value')}`, $t('IdealValue')],
        datasets: [{
          data: [summaryData.value.totalBchValue, summaryData.value.expectedBchValue],
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
    const redemptionContract = toValue(redemptionContractDataOrRef)
    const tokenDecimals = parseInt(decimals.value) || 0
    return new Chart(ref, {
      type: 'bar',
      data: {
        labels: [$t('TokensInCirculation'), $t('RedeemableTokens'), $t('ReserveSupply')],
        datasets: [{
          data: [
            summaryData.value.tokensInCirculation / 10 ** tokenDecimals,
            summaryData.value.redeemableTokens / 10 ** tokenDecimals,
            redemptionContract?.reserve_supply / 10 ** tokenDecimals,
          ],
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

  return {
    ...dashboardComposables,
    chartColors,
    getChartColors,

    create24hrVolumeChart,
    parsed24HrVolumeChartData,
    createBchValueComparisonChart,
    createBchValueChart,
    bchValuePieChartData,
    createTokenChart,
  }
}
