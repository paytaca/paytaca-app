import ago from 's-ago';
import { formatWithLocale, getAssetDenomination } from "src/utils/denomination-utils";
import { Store } from "src/store";
import { useI18n } from "vue-i18n";
import { computed, toValue } from "vue";


/**
 * @param {import("vue").ComputedRef<String>} tokenCategory 
 * @returns 
 */
export function useValueFormatters(tokenCategory) {
  const $store = Store;
  const { t: $t } = useI18n()
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

  function formatTokenUnits(amount, category=undefined) {
    const _tokenCategory = category ?? toValue(tokenCategory)
    const token = $store.getters['stablehedge/token']?.(_tokenCategory)
    const decimals = parseInt(token?.decimals) || 0
    const currency = token?.currency || 'UNIT'

    const tokens = amount / 10 ** decimals
    const formattedTokens = formatWithLocale(tokens, { max: decimals });
    return `${formattedTokens} ${currency}`
  }

  function formatTransactionsCount(count) {
    if (!Number.isInteger(count)) return ''
    const transactionText = $t('Transaction')?.toLowerCase?.()
    const transactionsText = $t('Transactions')?.toLowerCase?.()
    if (count < 1_000) {
      return count === 1 
          ? `${count} ${transactionText}` 
          : `${count} ${transactionsText}`;
    } else if (count < 100_000) {
      return `${Math.floor(count / 1_000)}${count % 1_000 !== 0 ? '+ K' : 'K'} ${transactionsText}`;
    } else if (count < 1_000_000) {
      return `${(count / 1_000_000).toFixed(2).replace(/\.0+$/, '')}M ${transactionsText}`;
    } else {
      return `${(count / 1_000_000_000).toFixed(2).replace(/\.0+$/, '')}B ${transactionsText}`;
    }
  }


  /**
   * @param {Date} value 
   */
  function formatDateRelative(value) {
    if (!value?.getDate?.()) value = new Date(value)
    return ago(value)
  }

  /**
   * @param {Date | String | Number} timestamp 
   */
  function formatTimestampToText(timestamp) {
    const dateObj = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(dateObj)
  }

  return {
    denomination,

    denominateSats,
    denominateBch,
    formatTokenUnits,
    formatTransactionsCount,

    formatDateRelative,
    formatTimestampToText,
  }
}
