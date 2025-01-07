import { getAssetDenomination } from "src/utils/denomination-utils";
import { Store } from "src/store";
import { computed, toValue } from "vue";


/**
 * @param {import("vue").ComputedRef<String>} tokenCategory 
 * @returns 
 */
export function useValueFormatters(tokenCategory) {
  const $store = Store;
  const denomination = computed(() => $store.getters['global/denomination'])

  function denominateSats(satoshis) {
    return denominateBch(satoshis / 10 ** 8)
  }
  function denominateBch(amount) {
    const currentDenomination = denomination.value || 'BCH'
    const parsedBCHBalance = getAssetDenomination(currentDenomination, amount)

    if (currentDenomination === 'DEEM') {
      const commaBalance = parseFloat(parsedBCHBalance).toLocaleString('en-us', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })
      return `${commaBalance} ${currentDenomination}`
    }

    return parsedBCHBalance
  }

  function formatTokenUnits(amount) {
    const _tokenCategory = toValue(tokenCategory)
    const token = $store.getters['stablehedge/token']?.(_tokenCategory)
    const decimals = parseInt(token?.decimals) || 0
    const currency = token?.currency || 'UNIT'

    const tokens = amount / 10 ** decimals
    return `${tokens} ${currency}`
  }

  return {
    denomination,

    denominateSats,
    denominateBch,
    formatTokenUnits,
  }
}
