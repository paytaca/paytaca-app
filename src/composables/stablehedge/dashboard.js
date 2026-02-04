import { computed, ref, toValue } from "vue";
import { Store } from "src/store";
import { parseHedgePositionData } from "src/wallet/anyhedge/formatters";
import { getStablehedgeBackend } from "src/wallet/stablehedge/api";
import { satoshisToToken, tokenToSatoshis } from "src/wallet/stablehedge/token-utils";
import { getDenomDecimals } from "src/utils/denomination-utils";

/**
 * @param {import("src/wallet/stablehedge/interfaces").VolumeApiData[]} data
 */
function parseVolumeData(data) {
  const requiredTxTypes = ['inject', 'deposit', 'redeem']
  const toAdd = new Map()
  requiredTxTypes.map(txType => toAdd.set(txType, true))

  if (!Array.isArray(data)) data = []
  for (const volumeData of data) {
    toAdd.delete(volumeData?.transaction_type)
    if (!toAdd.size) break
  }

  toAdd.forEach((_, txType) => {
    data.push({ transaction_type: txType, satoshis: 0, count: 0 })
  })

  const totalSats = data
    .map(volume => parseInt(volume?.satoshis) || 0)
    .reduce((subtotal, val) => subtotal + val, 0)
  const totalCount = data
    .map(volume => parseInt(volume?.count) || 0)
    .reduce((subtotal, val) => subtotal + val, 0)

  return { data, totalSats, totalCount }
}


/**
 * @typedef {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} RedemptionContractApiData
 * @typedef {import("vue").Ref<RedemptionContractApiData>} RedemptionContractApiRef
 * 
 * @typedef {import("src/wallet/stablehedge/interfaces").RedemptionContractMarketInfoApiData} RedemptionContractMarketInfoApiData
 * 
 * @typedef {import("src/wallet/stablehedge/interfaces").TreasuryContractApiData} TreasuryContractApiData
 * @typedef {import("vue").Ref<TreasuryContractApiData>} TreasuryContractApiRef
 */

/**
 * @param {RedemptionContractApiData | RedemptionContractApiRef} redemptionContractDataOrRef
 */
export function useStablehedgeDashboard(redemptionContractDataOrRef) {
  const $store = Store
 
  /** @type {RedemptionContractApiRef} */
  const redemptionContract = computed(() => toValue(redemptionContractDataOrRef))

  const isChipnet = computed(() => redemptionContract.value?.address?.startsWith('bchtest:'))
  const denomination = computed(() => $store.getters['global/denomination'])
  const token = computed(() => $store.getters['stablehedge/token'](tokenCategory.value))
  const tokenCategory = computed(() => redemptionContract.value?.fiat_token?.category)
  const priceMessage = computed(() => token.value?.priceMessage)
  const currency = computed(() => token.value?.currency)
  const decimals = computed(() => token.value?.decimals)

  const priceUnitPerBch = computed(() => parseFloat(priceMessage.value?.priceValue))
  const pricePerBch = computed(() =>  priceUnitPerBch.value / 10 ** decimals.value)
  const pricePerDenomination = computed(() => {
    const currentDenomination = denomination.value || 'BCH'
    const { convert: conversionRate } = getDenomDecimals(currentDenomination);
    return pricePerBch.value / conversionRate
  })

  const fetchingRedemptionContractMarketInfo = ref(false)
  /** @type {import("vue").Ref<RedemptionContractMarketInfoApiData>} */
  const redemptionContractMarketInfo = ref()
  function fetchRedemptionContractMarketInfo() {
    const address = toValue(redemptionContractDataOrRef)?.address
    const chipnet = address?.startsWith?.('bchtest:')
    // const addressParam = encodeURIComponent(address)

    const backend = getStablehedgeBackend(chipnet) 
    fetchingRedemptionContractMarketInfo.value = true
    return backend.get(`stablehedge/redemption-contracts/${address}/market_info/`) 
      .then(response => {
        redemptionContractMarketInfo.value = response?.data
        return response
      })
      .finally(() => {
        fetchingRedemptionContractMarketInfo.value = false
      })
  }

  /** @type {TreasuryContractApiRef} */
  const treasuryContract = ref()
  function fetchTreasuryContract() {
    const address = redemptionContract.value?.treasury_contract_address
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

  const fetchingTreasuryContractBalance = ref(false)

  /**
   * @typedef {import("src/wallet/stablehedge/interfaces").TreasuryContractBalanceApiData} TreasuryContractBalanceApiData
   * @type {import("vue").Ref<TreasuryContractBalanceApiData>}
   *  */
  const treasuryContractBalance = ref()

  function fetchTreasuryContractBalance() {
    const address = redemptionContract.value?.treasury_contract_address
    const chipnet = address?.startsWith?.('bchtest:')
    if (!address) return

    const backend = getStablehedgeBackend(chipnet)
    const addressParam = encodeURIComponent(address)
    fetchingTreasuryContractBalance.value = true
    return backend.get(`stablehedge/treasury-contracts/${addressParam}/balance/`) 
      .then(response => {
        treasuryContractBalance.value = { address, ...response.data}
        return response
      })
      .finally(() => {
        fetchingTreasuryContractBalance.value = false
      })
  }

  const treasuryContractShortPosData = computed(() => {
    let totalShortedBchValue
    let shortUnitValue

    const balanceData = treasuryContractBalance.value
    const shortPayoutData = balanceData?.short_payout_data
    const inShortData = balanceData?.in_short

    if (shortPayoutData && priceUnitPerBch.value) {
      /**
       * Formula is based on anyhedge's formula for getting short payout sats
       * https://gitlab.com/GeneralProtocols/anyhedge/library/-/blob/v2.0.1/lib/anyhedge.ts?ref_type=tags#L1557
       * 
       * Base formula:
       * shortPayoutSats = (nominalUnitsXSatsPerBch / currentPrice) - satsForNominalUnitsAtHighLiquidation
       * 
       * Formula:
       * => total_short_payout_sats = Sum(shortPayoutSats)
       * => Sum(shortPayoutSats)
       * => Sum((nominalUnitsXSatsPerBch / currentPrice) - satsForNominalUnitsAtHighLiquidation)
       * => Sum(nominalUnitsXSatsPerBch / currentPrice) - Sum(satsForNominalUnitsAtHighLiquidation)
       * => (1/currentPrice) * Sum(nominalUnitsXSatsPerBch) - Sum(satsForNominalUnitsAtHighLiquidation)
       */

      const nomSats = BigInt(shortPayoutData?.total_nominal_units_x_sats_per_bch)
      const nomHlp = BigInt(shortPayoutData?.total_sats_for_nominal_units_at_high_liquidation)

      const _shortPayoutSats = (nomSats / BigInt(priceUnitPerBch.value)) - nomHlp
      totalShortedBchValue = Number(_shortPayoutSats) / 10 ** 8
      shortUnitValue = Number(satoshisToToken(_shortPayoutSats, priceUnitPerBch.value))
    } else if (inShortData) {
      shortUnitValue = inShortData?.unit_value
      if (priceUnitPerBch.value) {
        const shortSatoshisValue = Number(tokenToSatoshis(shortUnitValue, priceUnitPerBch.value))
        totalShortedBchValue = shortSatoshisValue / 10 ** 8
      }
    }

    return {
      totalShortedBchValue,
      shortUnitValue,
    }
  })

  const parsedTreasuryContractBalance = computed(() => {
    if (redemptionContract.value?.treasury_contract_address != treasuryContractBalance.value?.address) return
    const balanceData = treasuryContractBalance.value
    if (!balanceData) return

    const spendableBch = balanceData?.spendable / 10 ** 8

    const totalShortedBchValue = treasuryContractShortPosData.value?.totalShortedBchValue
    const shortUnitValue = treasuryContractShortPosData.value?.shortUnitValue
    const totalBchValue = spendableBch + totalShortedBchValue

    return {
      spendableBch,
      totalShortedBchValue,
      shortUnitValue,
      totalBchValue,
    }
  })

  const volumeSummaryData = computed(() => {
    const parsed24HrVol = parseVolumeData(redemptionContractMarketInfo.value?.volume_24_hr)
    const parsedLifetimeVol = parseVolumeData(redemptionContractMarketInfo.value?.volume_lifetime)

    return {
      volume24hrBch: parsed24HrVol.totalSats / 10 ** 8,
      volume24hrCount: parsed24HrVol.totalCount,
      volume24hrData: parsed24HrVol.data,

      volumeLifetimeBch: parsedLifetimeVol.totalSats / 10 ** 8,
      volumeLifetimeCount: parsedLifetimeVol.totalCount,
      volumeLifetimeData: parsedLifetimeVol.data,
    }
  })
  
  const summaryData = computed(() => {
    const redeemableBch = (parseInt(redemptionContract.value?.redeemable) || 0) / 10 ** 8

    const treasuryContractBchValue = parsedTreasuryContractBalance.value
      ? parsedTreasuryContractBalance.value?.totalBchValue : 0
    const totalBchValue = redeemableBch + treasuryContractBchValue

    const genesisSupply = parseInt(redemptionContract.value?.fiat_token?.genesis_supply)
    const tokensInCirculation = genesisSupply - redemptionContract.value?.reserve_supply

    let totalValueInTokens
    let redeemableTokens, redeemableTokensPctg, tokensInCirculationBchValue, redeemableDiffBchValue
    if (Number.isSafeInteger(priceUnitPerBch.value)) {
      totalValueInTokens = Math.floor(totalBchValue * priceUnitPerBch.value)
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

    return {
      totalBchValue,
      totalValueInTokens,
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

  /**
   * @typedef {import("@generalprotocols/anyhedge").ContractDataV2} ContractDataV2
   * 
   * @type {import("vue").Ref<ContractDataV2[]>}
   */
  const shortPositions = ref([])
  const fetchingShortPositions = ref(false)
  function fetchShortPositions() {
    const redemptionContract = toValue(redemptionContractDataOrRef)
    const addressParam = redemptionContract?.treasury_contract_address

    if (!addressParam) {
      shortPositions.value = []
      return Promise.resolve()
    }

    const params = {
      limit: 20,
      short_address: addressParam || '',
      funding: 'complete',
      settled: false,
    }
    const backend = getStablehedgeBackend(isChipnet.value)
    fetchingShortPositions.value = true
    return backend.get(`anyhedge/hedge-positions/`, { params })
      .then(response => {
        Promise.all(response.data.results.map(parseHedgePositionData))
          .then(parsedContracts => shortPositions.value = parsedContracts)
        return response
      })
      .finally(() => {
        fetchingShortPositions.value = false
      })
  }

  return {
    isChipnet,
    denomination,
    tokenCategory,
    token,
    priceMessage,
    currency,
    decimals,

    priceUnitPerBch,
    pricePerBch,
    pricePerDenomination,

    fetchingRedemptionContractMarketInfo,
    redemptionContractMarketInfo,
    fetchRedemptionContractMarketInfo,

    treasuryContract,
    fetchTreasuryContract,

    fetchingTreasuryContractBalance,
    treasuryContractBalance,
    fetchTreasuryContractBalance,

    parsedTreasuryContractBalance,
    volumeSummaryData,
    summaryData,

    shortPositions,
    fetchingShortPositions,
    fetchShortPositions,
  }
}
