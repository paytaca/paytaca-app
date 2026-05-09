import { i18n } from 'src/boot/i18n'
import { Store } from 'src/store'
import { convertToTokenAmountWithDecimals } from 'src/wallet/chipnet'

const denomDecimalPlaces = {
  BCH: { convert: 1, decimal: 8 },
  mBCH: { convert: 10 ** 3, decimal: 5 },
  sats: { convert: 10 ** 8, decimal: 0 },
  DEEM: { convert: 10 ** 5, decimal: 0 }
}

export function normalizeDenomination (denomination) {
  if (!denomination) return denomination
  if (denomination === 'Satoshis') return 'sats'
  // Be forgiving in case old values are stored with different casing
  if (typeof denomination === 'string') {
    const lower = denomination.toLowerCase()
    if (lower === 'satoshis') return 'sats'
    if (lower === 'bch') return 'BCH'
    if (lower === 'mbch') return 'mBCH'
  }
  return denomination
}

export function getDenominationDisplayLabel (denomination) {
  const normalized = normalizeDenomination(denomination)
  if (normalized === 'sats') return 'sats'
  return normalized
}

export function getDenomDecimals(denomination) {
  const normalized = normalizeDenomination(denomination)
  return denomDecimalPlaces[normalized] ?? denomDecimalPlaces.DEEM
}

function getCountryCode () {
  return Store.getters['global/country'].code
}

function getCountry () {
  return Store.getters['global/country']
}

function getLocale () {
  const country = getCountry()
  
  // Defensive check for country code
  if (!country || !country.code) {
    return 'en-US' // Fallback to US English locale
  }
  
  const countryCode = country.code.toLowerCase()
  let currentLocale

  // If the country has a language field defined, use it to construct the locale
  // (e.g., "en" + "CA" = "en-CA"). This ensures proper locale formatting.
  // Otherwise, fall back to using the country code directly.
  if (country.language) {
    // If language contains a hyphen (e.g., "es-ar", "pt-br", "zh-cn"):
    // - Extract the base language code (the part before the hyphen)
    // - Concatenate with the country code to form proper locale (e.g., "es-ar" + "AR" = "es-AR")
    // - This ensures we use the correct i18n translation ("es-ar") but proper locale formatting ("es-AR")
    // Otherwise, construct locale from language + country code (e.g., "en" + "CA" = "en-CA")
    if (country.language.includes('-')) {
      const baseLanguage = country.language.split('-')[0]
      currentLocale = `${baseLanguage}-${countryCode.toUpperCase()}`
    } else {
      currentLocale = `${country.language}-${countryCode.toUpperCase()}`
    }
  } else {
    // use locale from country code
    currentLocale = new Intl.Locale(countryCode)
  }

  // Use Latin numerals for Arabic locales to ensure readability
  // (Eastern Arabic numerals ٠١٢٣٤٥٦٧٨٩ are often hard to read in financial contexts)
  if (typeof currentLocale === 'string' && currentLocale.startsWith('ar')) {
    currentLocale = currentLocale + '-u-nu-latn'
  } else if (currentLocale instanceof Intl.Locale && currentLocale.language === 'ar') {
    currentLocale = new Intl.Locale(currentLocale, { numberingSystem: 'latn' })
  }

  return currentLocale
}

export function getLocaleSeparators () {
  const currentLocale = getLocale()

  try {
    const parts = new Intl.NumberFormat(currentLocale).formatToParts(1000.1)
    const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.'
    const group = parts.find(p => p.type === 'group')?.value ?? (decimal === '.' ? ',' : '.')
    return { group, decimal }
  } catch {
    return { group: ',', decimal: '.' }
  }
}

function escapeRegExp (s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function formatWithLocale (value, { min, max, preserveTrailingDecimals } = {}) {
  const currentLocale = getLocale()

  const options = {}
  if (typeof min === 'number') options.minimumFractionDigits = min
  if (typeof max === 'number') options.maximumFractionDigits = max

  // This preserves trailing zeroes in decimals
  // Without this, "4123.0000" would give "4,123", instead of "4,123.000" or
  // "1234.3200" => Now returns "1,234.3200"
  // "1234." => Now returns "1,234."
  let trailingDecimal = '';
  if (preserveTrailingDecimals && typeof value === 'string') {
    const decimalPart = value.split('.')[1];
    const fractionLength = decimalPart ? decimalPart.length : 0
    if (value.endsWith('.')) {
      trailingDecimal = getLocaleSeparators().decimal;
    }
    if (typeof options.minimumFractionDigits !== 'number' || options.minimumFractionDigits < fractionLength) {
      options.minimumFractionDigits = fractionLength;
      if (options.maximumFractionDigits < options.minimumFractionDigits) {
        options.minimumFractionDigits = options.maximumFractionDigits;
      }
    }
  }

  return Number(value).toLocaleString(currentLocale, options) + trailingDecimal;
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

export function parseAssetDenomination (denomination, asset, isInput = false, subStringMax = 0, maxFractionDigitsOverride = null) {
  const balanceCheck = asset.balance ?? 0
  // Treat BCH symbol as BCH. Legacy network-specific support removed; normalize to BCH.
  const isBCH = asset.symbol === 'BCH'
  let newBalance = ''
  let symbol = ''

  if (isBCH) {
    // fallback condition for translated 'DEEM'
    const { convert, decimal } = getDenomDecimals(denomination)
    const normalizedDenom = normalizeDenomination(denomination)
    let calculatedBalance = ''

    if (isInput) {
      calculatedBalance = (balanceCheck * convert).toString()
    } else {
      calculatedBalance = (balanceCheck * convert).toFixed(decimal)
    }
    
    // For BCH denomination (not mBCH or sats), always show full 8 decimals for easier comparison
    if (normalizedDenom === 'BCH' && !isInput) {
      newBalance = formatWithLocale(calculatedBalance, { min: 8, max: 8 })
    } else {
      newBalance = formatWithLocale(calculatedBalance, { max: decimal })
    }
    
    if (subStringMax > 0) newBalance = newBalance.substring(0, subStringMax)
    symbol = getDenominationDisplayLabel(denomination)
  } else {
    const isSLP = asset.id?.startsWith('slp/')
    const rawConverted = parseFloat(
      convertToTokenAmountWithDecimals(asset.balance, asset.decimals, isBCH, isSLP)
    )
    const maxFractionDigits = Number.isFinite(maxFractionDigitsOverride)
      ? maxFractionDigitsOverride
      : asset.decimals
    newBalance = formatWithLocale(rawConverted, { max: maxFractionDigits })
    if (subStringMax > 0) newBalance = String(newBalance).substring(0, subStringMax)
    symbol = asset.symbol || ''
  }

  if (asset.excludeSymbol) return `${newBalance}`
  else return `${newBalance} ${symbol}`.trim()
}

/**
 * Splits a formatted BCH amount into significant digits and trailing zeros
 * for rendering with different styles (e.g., graying out trailing zeros).
 * 
 * @param {string} formattedAmount - The formatted amount string (e.g., "1,234.56780000")
 * @param {string} denomination - The denomination (BCH, mBCH, sats)
 * @param {string} symbol - Optional symbol to include (default: '')
 * @returns {Object} { main: string, trailingZeros: string, symbol: string }
 * 
 * Example:
 * splitBchAmount("0.91801000 BCH", "BCH", "BCH")
 * => { main: "0.91801", trailingZeros: "000", symbol: "BCH" }
 */
export function splitBchAmount (formattedAmount, denomination, symbol = '') {
  const normalizedDenom = normalizeDenomination(denomination)
  
  // Only split trailing zeros for BCH denomination (not mBCH or sats)
  if (normalizedDenom !== 'BCH') {
    return { main: formattedAmount, trailingZeros: '', symbol }
  }
  
  // Remove symbol from the formatted amount if present
  let numericPart = formattedAmount.replace(/\s*BCH\s*/i, '').trim()
  
  // Find the decimal separator
  const { decimal } = getLocaleSeparators()
  const parts = numericPart.split(decimal)
  
  if (parts.length === 1) {
    // No decimal part
    return { main: numericPart, trailingZeros: '', symbol }
  }
  
  const integerPart = parts[0]
  const decimalPart = parts[1] || ''
  
  // Find trailing zeros in decimal part
  const match = decimalPart.match(/^(\d*?)+(0+)$/)
  if (match && match[2]) {
    const significantDecimals = match[1]
    const trailingZeros = match[2]
    const mainPart = significantDecimals 
      ? `${integerPart}${decimal}${significantDecimals}`
      : integerPart
    return { 
      main: mainPart, 
      trailingZeros: trailingZeros, 
      symbol 
    }
  }
  
  // No trailing zeros
  return { 
    main: numericPart, 
    trailingZeros: '', 
    symbol 
  }
}

/**
 * Formats a BCH amount with trailing zeros grayed out using HTML/CSS.
 * Returns an HTML string suitable for v-html directive.
 * 
 * @param {string} formattedAmount - The formatted amount string
 * @param {string} denomination - The denomination (BCH, mBCH, sats)
 * @param {string} symbol - Optional symbol to include
 * @returns {string} HTML string with styled trailing zeros
 * 
 * Example:
 * formatBchAmountWithGrayZeros("0.91801000", "BCH", "BCH")
 * => '0.91801<span style="opacity: 0.4">000</span> BCH'
 */
export function formatBchAmountWithGrayZeros (formattedAmount, denomination, symbol = '') {
  const { main, trailingZeros, symbol: sym } = splitBchAmount(formattedAmount, denomination, symbol)
  
  let result = main
  if (trailingZeros) {
    result += `<span style="opacity: 0.4">${trailingZeros}</span>`
  }
  if (sym) {
    result += ` ${sym}`
  }
  
  return result
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

/**
 * Returns the standard number of fraction digits for a fiat currency code.
 * Based on ISO 4217 "minor units" (common subset used by the app).
 *
 * Notes:
 * - Most currencies use 2 decimals.
 * - Some use 0 (e.g. JPY, KRW).
 * - Some use 3 (e.g. OMR, BHD, KWD).
 */
export function getFiatCurrencyFractionDigits (currency) {
  const code = String(currency || '').toUpperCase()

  // 0-decimal currencies (minor unit = 0)
  const zeroDecimal = new Set([
    'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
    'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
  ])

  // 3-decimal currencies (minor unit = 3)
  const threeDecimal = new Set([
    'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
  ])

  // A few ISO currencies use 4 decimals; keep for correctness when encountered.
  const fourDecimal = new Set(['CLF', 'UYW'])

  if (zeroDecimal.has(code)) return 0
  if (threeDecimal.has(code)) return 3
  if (fourDecimal.has(code)) return 4
  return 2
}

export function parseFiatCurrency (amount, currency) {
  const code = String(currency || '').toUpperCase()
  const digits = getFiatCurrencyFractionDigits(code)
  const newAmount = formatWithLocale(amount, { min: digits, max: digits })
  return `${newAmount} ${code}`
}

export function convertToBCH (denomination, amount) {
  const normalized = normalizeDenomination(denomination)
  const { convert } = getDenomDecimals(normalized)
  return normalized === 'BCH' ? amount : (amount / convert).toFixed(8)
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
