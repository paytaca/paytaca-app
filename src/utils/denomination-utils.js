import { i18n } from 'src/boot/i18n'
import { Store } from 'src/store'
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'

const denomDecimalPlaces = {
  BCH: { convert: 1, decimal: 8 },
  mBCH: { convert: 10 ** 3, decimal: 5 },
  Satoshis: { convert: 10 ** 8, decimal: 0 },
  DEEM: { convert: 10 ** 5, decimal: 0 }
}

function getCountryCode () {
  return Store.getters['global/country'].code
}

// function getLocale () {

// }

function getLocaleSeparators () {
  // let currentLocale = 'en-us'
  // const localeCandidate = i18n?.global?.locale
  // if (typeof localeCandidate === 'string') {
  //   currentLocale = localeCandidate
  // } else if (localeCandidate && typeof localeCandidate === 'object' && 'value' in localeCandidate) {
  //   currentLocale = localeCandidate.value || 'en-us'
  // }
  const countryCode = getCountryCode().toLowerCase()
  const countryLocale = new Intl.Locale(countryCode)

  try {
    const parts = new Intl.NumberFormat(countryLocale).formatToParts(1000.1)
    const group = parts.find(p => p.type === 'group')?.value || ','
    const decimal = parts.find(p => p.type === 'decimal')?.value || '.'
    return { group, decimal }
  } catch (e) {
    return { group: ',', decimal: '.' }
  }
}

function escapeRegExp (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function formatWithLocale (value, { min, max } = {}) {
  const countryCode = getCountryCode().toLowerCase()
  const countryLocale = new Intl.Locale(countryCode)
  // console.log(localeCandidate?.value)
  // console.log(countryCode)
  // let currentLocale = 'en-us'
  // const localeCandidate = i18n?.global?.locale
  // if (typeof localeCandidate === 'string') {
  //   currentLocale = localeCandidate
  // } else if (localeCandidate && typeof localeCandidate === 'object' && 'value' in localeCandidate) {
  //   currentLocale = localeCandidate.value || 'en-us'
  // }
  const options = {}
  if (typeof min === 'number') options.minimumFractionDigits = min
  if (typeof max === 'number') options.maximumFractionDigits = max
  return Number(value).toLocaleString(countryLocale, options)
}

export function parseLocaleNumber (value) {
  if (typeof value === 'number') return value
  const str = String(value)
  const { group, decimal } = getLocaleSeparators()

  let normalized = str
    .replace(new RegExp(escapeRegExp(group), 'g'), '')
    .replace(/[^0-9eE+\-.,]/g, '')

  if (decimal !== '.') {
    normalized = normalized.replace(new RegExp(escapeRegExp(decimal), 'g'), '.')
  }

  const match = RegExp(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i).exec(normalized)
  const numericString = match ? match[0] : normalized
  const parsed = parseFloat(numericString)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseAssetDenomination (denomination, asset, isInput = false, subStringMax = 0) {
  const balanceCheck = asset.balance ?? 0
  const isBCH = asset.symbol === 'BCH' || asset.symbol === 'sBCH'
  let newBalance = ''
  let symbol = ''

  if (isBCH) {
    // fallback condition for translated 'DEEM'
    const { convert, decimal } = denomDecimalPlaces[denomination] ?? denomDecimalPlaces.DEEM
    let calculatedBalance = ''

    if (isInput) {
      calculatedBalance = (balanceCheck * convert).toString()
    } else {
      calculatedBalance = (balanceCheck * convert).toFixed(decimal)
    }
    newBalance = formatWithLocale(calculatedBalance, { max: decimal })
    if (subStringMax > 0) newBalance = newBalance.substring(0, subStringMax)
    symbol = denomination
  } else {
    const isSLP = asset.id?.startsWith('slp/')
    const rawConverted = parseFloat(
      convertToTokenAmountWithDecimals(asset.balance, asset.decimals, isBCH, isSLP)
    )
    newBalance = formatWithLocale(rawConverted, { max: asset.decimals })
    if (subStringMax > 0) newBalance = String(newBalance).substring(0, subStringMax)
    symbol = asset.symbol
  }

  if (asset.excludeSymbol) return `${newBalance}`
  else return `${newBalance} ${symbol}`
}

/**
 * Used for when values does not come from a single object **(`asset`)**
 */
export function getAssetDenomination (
  denomination, assetBalance, isInput = false, excludeSymbol = false
) {
  return parseAssetDenomination(denomination, {
    id: 'BCH',
    balance: assetBalance,
    symbol: 'BCH',
    decimals: 0,
    excludeSymbol
  }, isInput)
}

export function parseFiatCurrency (amount, currency) {
  const newAmount = formatWithLocale(amount, { min: 2, max: 2 })
  return `${newAmount} ${currency.toUpperCase()}`
}

export function convertToBCH (denomination, amount) {
  const { convert } = denomDecimalPlaces[denomination] ?? denomDecimalPlaces.DEEM
  return denomination === 'BCH' ? amount : (amount / convert).toFixed(8)
}

/**
 * For very small numbers, use `toFixed()`. For large numbers, use `parseFloat()`
 * @param {String} number
 */
export function customNumberFormatting (number) {
  // parse value from possibly localized string with denomination
  const numericValue = parseLocaleNumber(number)
  const num = numericValue.toString()

  // check if number is already on exponential notation
  if (num.includes('e')) {
    const fixedDecimals = parseInt(num.split('').pop()) + 1
    return formatWithLocale(num, { min: fixedDecimals, max: fixedDecimals })
  }

  // fallback for non-exponential notation
  const decimals = num.toString().split('.')[1]
  if (!decimals) return formatWithLocale(num)
  return decimals.length > 6
    ? formatWithLocale(num, { min: decimals.length, max: decimals.length })
    : formatWithLocale(num, { max: decimals.length })
}
