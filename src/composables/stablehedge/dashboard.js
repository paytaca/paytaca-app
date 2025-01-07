import { computed, ref, toValue } from "vue";
import { Store } from "src/store";
import { parseHedgePositionData } from "src/wallet/anyhedge/formatters";
import { getStablehedgeBackend } from "src/wallet/stablehedge/api";
import { tokenToSatoshis } from "src/wallet/stablehedge/token-utils";
import { getAssetDenomination } from "src/utils/denomination-utils";

/**
 * @typedef {import("src/wallet/stablehedge/interfaces").RedemptionContractApiData} RedemptionContractApiData
 * @typedef {import("vue").Ref<RedemptionContractApiData>} RedemptionContractApiRef
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
    const conversionRate = parseFloat(getAssetDenomination(currentDenomination, 1)) || 1
    return pricePerBch.value / conversionRate
  })

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

  const treasuryContractBalance = ref({
    address: '',
    total: 0, spendable: 0, utxo_count: 0,
    in_short: { count: 0, satoshis: 0, unit_value: 0 },
  })

  function fetchTreasuryContractBalance() {
    const address = redemptionContract.value?.treasury_contract_address
    const chipnet = address?.startsWith?.('bchtest:')
    if (!address) return

    const backend = getStablehedgeBackend(chipnet)
    const addressParam = encodeURIComponent(address)
    return backend.get(`stablehedge/treasury-contracts/${addressParam}/balance/`) 
      .then(response => {
        treasuryContractBalance.value = { address, ...response.data}
        return response
      })
  }

  const parsedTreasuryContractBalance = computed(() => {
    if (redemptionContract.value?.treasury_contract_address != treasuryContractBalance.value?.address) return
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
    const redeemableBch = (parseInt(redemptionContract.value?.redeemable) || 0) / 10 ** 8

    const treasuryContractBchValue = parsedTreasuryContractBalance.value
      ? parsedTreasuryContractBalance.value?.totalBchValue : 0
    const totalBchValue = redeemableBch + treasuryContractBchValue

    const genesisSupply = parseInt(redemptionContract.value?.fiat_token?.genesis_supply)
    const tokensInCirculation = genesisSupply - redemptionContract.value?.reserve_supply

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

    const totalVolumeSats = (redemptionContract.value?.volume_24_hr?.inject || 0) +
                            (redemptionContract.value?.volume_24_hr?.deposit || 0) +
                            (redemptionContract.value?.volume_24_hr?.redeem || 0)

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

    treasuryContract,
    fetchTreasuryContract,

    treasuryContractBalance,
    fetchTreasuryContractBalance,

    parsedTreasuryContractBalance,
    summaryData,

    shortPositions,
    fetchingShortPositions,
    fetchShortPositions,
  }
}
