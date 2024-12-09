<template>
  <q-card
    class="br-15 pt-card text-bow q-mb-md"
    :class="getDarkModeClass(darkMode)"
    style="position:relative;"
    v-ripple
  >
    <q-menu
      touch-position
      class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)"
    >
      <q-item clickable v-close-popup @click="() => showDialog = true">
        <q-item-section>
          <q-item-label>More</q-item-label>
        </q-item-section>
      </q-item>  
      <q-item clickable v-close-popup @click="() => showTreasuryContractDialog = true">
        <q-item-section>
          <q-item-label>Treasury contract</q-item-label>
        </q-item-section>
      </q-item>  
    </q-menu>
    <q-card-section>
      <div class="row items-center">
        <div class="text-h5">{{ redemptionContract?.fiat_token?.currency || 'UNIT' }}</div>
        <q-space/>
        <div v-if="pricePerDenomination">
          {{ pricePerDenomination }} {{ currency }}/{{ denomination }}
        </div>
      </div>
      <div class="row items-center no-wrap" style="position: relative;" v-ripple @click.stop="copyToClipboard(redemptionContract?.address)">
        <div class="ellipsis text-subtitle q-space">
          {{ redemptionContract?.address }}
        </div>
        <q-icon name="content_copy" right/>
      </div>
      <div
        class="row items-center no-wrap"
        style="position: relative;" v-ripple
        @click="copyToClipboard(toTokenAddress(redemptionContract?.address))"
      >
        <div class="ellipsis text-subtitle q-space">
          {{ toTokenAddress(redemptionContract?.address) }}
        </div>
        <q-icon name="content_copy" right/>
      </div>
      <div class="row items-start no-wrap">
        <div>
          <div class="text-grey">Redemption contract</div>
          <div>{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
          <div>{{ formatTokenUnits(redemptionContract?.reserve_supply || 0) }}</div>
        </div>
        <q-space/>
        <div v-if="redemptionContract?.treasury_contract_address" class="text-right">
          <div class="text-grey">Treasury contract</div>
          <div>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
          <div>{{ formatTokenUnits(parsedTreasuryContractBalance?.shortUnitValue) }}</div>
        </div>
      </div>
      <q-separator spaced/>
      <div class="row items-center">
        <div class="text-grey q-space">Volume (24 hr): </div>
        <div>{{ denominateBch(summaryData?.volume24hrBch) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Total Value:</div>
        <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Tokens in circulation:</div>
        <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
      </div>
      <div class="row items-center">
        <div class="text-grey q-space">Ideal Value:</div>
        <div>
          <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
          {{ denominateBch(summaryData?.expectedBchValue) }}
        </div>
      </div>
    </q-card-section>
    <q-dialog v-model="showDialog" position="bottom">
      <q-card class="br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <div class="row no-wrap items-center justify-center q-pl-md q-pr-sm q-pt-sm">
          <div class="text-h6 q-space q-mt-sm">Redemption contract</div>
          <q-btn flat padding="sm" icon="close" class="close-button" v-close-popup/>
        </div>
        <q-card-section>
          <div class="chart-container row items-center justify-center q-mb-sm">
            <canvas ref="chartRef"></canvas>
          </div>
          <div class="row items-center justify-around no-wrap q-mb-sm">
            <q-btn flat padding="sm lg" icon="keyboard_arrow_left" @click="() => moveSummaryPanel(-1)"/>
            <div class="text-h6 text-center">{{ summaryPanelLabel }}</div>
            <q-btn flat padding="sm lg" icon="keyboard_arrow_right" @click="() => moveSummaryPanel(1)"/>
          </div>
          <q-tab-panels v-model="summaryPanel" animated class="pt-card-2" :class="getDarkModeClass(darkMode)">
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
                  <div class="text-grey q-space">Total:</div>
                  <div>{{ denominateBch(summaryData?.volume24hrBch) }}</div>
                </div>
              </template>
            </q-tab-panel>
            <q-tab-panel name="bchValueComparison" class="q-pa-none">
              <div class="row items-center">
                <div class="text-grey q-space">Current Total Value:</div>
                <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
              </div>
              <div class="row items-center">
                <div class="text-grey q-space">Ideal Value:</div>
                <div>
                  <q-icon v-bind="summaryData?.expectedDiffPctgIcon" class="q-mr-xs"/>
                  {{ denominateBch(summaryData?.expectedBchValue) }}
                </div>
              </div>
              <q-banner class="q-my-sm rounded-borders pt-card text-bow" :class="getDarkModeClass(darkMode)">
                <div class="row items-start no-wrap q-space">
                  <div class="text-subtitle1 q-pr-sm">
                    Total value in contract is
                    <span :class="`text-${summaryData?.expectedDiffPctgIcon?.color}`">
                      {{ denominateBch(Math.abs(summaryData?.expectedBchValueDiff)) }}
                    </span>
                    {{ summaryData?.expectedDiffPctg < 0 ? 'below' : 'above' }}
                    ideal value
                  </div>
                  <div>
                    <q-icon name="info" size="1.2rem" class="q-my-sm">
                      <q-menu class="pt-card-2 text-bow q-pa-sm" :class="getDarkModeClass(darkMode)">
                        Comparison between total value in the contract/s and the ideal value to
                        peg the asset value in circulation
                      </q-menu>
                    </q-icon>
                  </div>
                </div>
              </q-banner>
            </q-tab-panel>
            <q-tab-panel name="bchValueBreakdown" class="q-pa-none">
              <div class="row items-center">
                <div class="text-grey q-space">Redeemable:</div>
                <div>{{ denominateSats(redemptionContract?.redeemable || 0) }}</div>
              </div>
              <template v-if="parsedTreasuryContractBalance">
                <div class="row items-center">
                  <div class="text-grey q-space">Treasury contract:</div>
                  <div>{{ denominateBch(parsedTreasuryContractBalance?.spendableBch) }}</div>
                </div>
                <div class="row items-center">
                  <div class="text-grey q-space">Short value:</div>
                  <div>{{ denominateBch(parsedTreasuryContractBalance?.totalShortedBchValue) }}</div>
                </div>
              </template>
              <q-separator spaced/>
              <div class="row items-center text-subtitle1">
                <div class="text-grey q-space">Total Value:</div>
                <div>{{ denominateBch(summaryData?.totalBchValue) }}</div>
              </div>
            </q-tab-panel>
            <q-tab-panel name="token" class="q-pa-none">    
              <div class="row items-center">
                <div class="text-grey q-space">Tokens in circulation:</div>
                <div>{{ formatTokenUnits(summaryData?.tokensInCirculation) }}</div>
              </div>
              <div class="row items-center">
                <div class="text-grey q-space">Redeemable tokens:</div>
                <div>
                  {{ formatTokenUnits(summaryData?.redeemableTokens) }}
                  <span v-if="summaryData?.redeemableTokensPctg">
                    ({{ summaryData?.redeemableTokensPctg }}%)
                  </span>
                </div>
              </div>
              <q-banner
                v-if="summaryData?.redeemableDiffBchValue < 0"
                class="q-my-sm rounded-borders pt-card text-bow" :class="getDarkModeClass(darkMode)"
              >
                <div class="text-subtitlw`">
                  Redemption contract needs
                  <span class="text-weight-medium">
                    {{ denominateBch(Math.abs(summaryData?.redeemableDiffBchValue)) }}
                  </span>
                  to redeem all tokens in circulation
                </div>
              </q-banner>
            </q-tab-panel>
          </q-tab-panels>
        </q-card-section>
      </q-card>
    </q-dialog>
    <TreasuryContractDialog
      v-model="showTreasuryContractDialog"
      :treasury-contract="treasuryContract"
      :redemption-contract-data="redemptionContract"
    />
  </q-card>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import { getAssetDenomination } from 'src/utils/denomination-utils';
import { toTokenAddress } from 'src/utils/crypto';
import { tokenToSatoshis } from 'src/wallet/stablehedge/token-utils';
import { getStablehedgeBackend } from 'src/wallet/stablehedge/api';
import { stablehedgePriceTracker } from 'src/wallet/stablehedge/price-tracker'
import { Chart } from 'chart.js/auto';
import { debounce, useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { getCurrentInstance, computed, defineComponent, onMounted, ref, watch, inject, onUnmounted, capitalize } from 'vue';
import TreasuryContractDialog from './TreasuryContractDialog.vue';

export default defineComponent({
  name: 'RedemptionContractCard',
  components: {
    TreasuryContractDialog,
  },
  props: {
    redemptionContract: {
      /** @returns {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} */
      default: () => {}
    },
  },
  setup(props) {
    const instance = getCurrentInstance()

    const $q = useQuasar()
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

    const showTreasuryContractDialog = ref(false)
    const treasuryContract = ref()
    onMounted(() => fetchTreasuryContract())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContract(),
    )
    function fetchTreasuryContract() {
      const address = props.redemptionContract?.treasury_contract_address
      const chipnet = address?.startsWith?.('bchtest:')
      if (!address) return

      const backend = getStablehedgeBackend(chipnet)
      const addressParam = encodeURIComponent(address)
      return backend.get(`stablehedge/treasury-contracts/${addressParam}/`) 
        .then(response => {
          treasuryContract.value = response?.data
          return response
        })
    }

    onMounted(() => fetchTreasuryContractBalance())
    watch(
      () => props.redemptionContract?.treasury_contract_address,
      () => fetchTreasuryContractBalance(),
    )
    const treasuryContractBalance = ref()
    function fetchTreasuryContractBalance() {
      const address = props.redemptionContract?.treasury_contract_address
      if (!address) return

      const backend = getStablehedgeBackend(isChipnet.value)
      return backend.get(`stablehedge/treasury-contracts/${address}/balance/`)
        .then(response => {
          treasuryContractBalance.value = { address, ...response.data}
          return response
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

      let redeemableTokens, redeemableTokensPctg, tokensInCirculationBchValue, redeemableDiffBchValue
      if (Number.isSafeInteger(priceUnitPerBch.value)) {
        redeemableTokens = Math.floor(redeemableBch * priceUnitPerBch.value)
        redeemableTokensPctg = tokensInCirculation
          ? Math.round(redeemableTokens * 100 / tokensInCirculation) : 0

        tokensInCirculationBchValue = tokensInCirculation / priceUnitPerBch.value
        redeemableDiffBchValue = redeemableBch - tokensInCirculationBchValue
      }


      let expectedBchValue, expectedBchValueDiff, expectedDiffPctg
      if (Number.isSafeInteger(tokensInCirculation) && Number.isSafeInteger(priceUnitPerBch.value)) {
        expectedBchValue = Number(
          tokenToSatoshis(tokensInCirculation, priceUnitPerBch.value)
        ) / 10 ** 8
        expectedBchValueDiff = totalBchValue - expectedBchValue
        expectedDiffPctg = Math.round((expectedBchValueDiff / expectedBchValue) * 100) || 0
      }

      const expectedDiffPctgIcon = {
        name: expectedDiffPctg < 0 ? 'trending_down' : 'trending_up',
        color: expectedDiffPctg < 0 ? 'red' : 'green',
      }

      const totalVolumeSats = (props.redemptionContract?.volume_24_hr?.inject || 0) +
                              (props.redemptionContract?.volume_24_hr?.deposit || 0) +
                              (props.redemptionContract?.volume_24_hr?.redeem || 0)

      return {
        volume24hrBch: totalVolumeSats / 10 ** 8,
        totalBchValue,
        tokensInCirculation,
        redeemableTokens,
        redeemableTokensPctg,
        redeemableBch,
        tokensInCirculationBchValue,
        redeemableDiffBchValue,
        expectedBchValue,
        expectedBchValueDiff,
        expectedDiffPctg,
        expectedDiffPctgIcon,
      }
    })

    const showDialog = ref(false)
    const summaryPanels = ['volume24hr', 'bchValueComparison', 'bchValueBreakdown', 'token']
    /** @type {import("vue").Ref<'volume24hr' | 'bchValueComparison' | 'bchValueBreakdown' | 'token'>} */
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
        case 'volume24hr':
          return `Volume (24 hours)`
        case 'bchValueComparison':
          return `Contract value`
        case 'bchValueBreakdown':
          return `Contract assets`
        case 'token':
          return `Token circulation`
      }
    })
    
    const chartRef = ref()

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

    /** @type {Chart} */
    let chartObj
    watch(showDialog, () => loadBchValueChart())
    watch(summaryPanel, () => loadBchValueChart())
    onUnmounted(() => chartObj?.destroy?.())
    const loadBchValueChart = debounce(() => {
      if (!showDialog.value) return
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
      const data = props.redemptionContract?.volume_24_hr
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
          labels: [`${denomination.value} value`, `Ideal ${denomination.value} value`],
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
      const redeemableBch = (props.redemptionContract.redeemable || 0) / 10 ** 8
      const data = [
        { label: 'Redeemable', value: redeemableBch },
      ]
      if (parsedTreasuryContractBalance.value) {
        data.push(
          { label: 'Treasury contract', value: parsedTreasuryContractBalance.value.spendableBch },
          { label: 'Short value', value: parsedTreasuryContractBalance.value.totalShortedBchValue },
        )
      }

      return {
        labels: data.map(_data => _data?.label),
        datasets: [{
          label: `${denomination.value} value`,
          data: data.map(_data => _data.value),
          backgroundColor: getChartColors(data?.length),
        }]
      }
    })

    function createTokenChart(ref) {
      return new Chart(ref, {
        type: 'bar',
        data: {
          labels: [`Tokens in circulation`, `Redeemable tokens`, `Reserve supply`],
          datasets: [{
            data: [
              summaryData.value.tokensInCirculation,
              summaryData.value.redeemableTokens,
              props.redemptionContract.reserve_supply,
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

    /** ------- <Formatters -------  */
    function denominateSats(satoshis) {
      return denominateBch(satoshis / 10 ** 8)
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
      pricePerDenomination,

      showTreasuryContractDialog,
      treasuryContract,
      fetchTreasuryContractBalance,
      parsedTreasuryContractBalance,
      treasuryContractBalance,
      summaryData,

      showDialog,
      summaryPanel,
      summaryPanelLabel,
      moveSummaryPanel,
      chartRef,

      parsed24HrVolumeChartData,

      denominateSats,
      denominateBch,
      formatTokenUnits,
      copyToClipboard,
      toTokenAddress,
    }
  },
})
</script>
<style lang="scss" scoped>
.chart-container {
  height: 150px;
}
</style>
