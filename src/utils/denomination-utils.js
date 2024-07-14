import { convertTokenAmount } from 'src/wallet/chipnet'

const denomDecimalPlaces = {
  BCH: { convert: 1, decimal: 8 },
  mBCH: { convert: 10 ** 3, decimal: 5 },
  Satoshis: { convert: 10 ** 8, decimal: 0 },
  DEEM: { convert: 10 ** 5, decimal: 0 }
}

export function parseAssetDenomination (denomination, asset, isInput = false, subStringMax = 0) {
  const balanceCheck = asset.balance ?? 0
  const isBCH = asset.symbol === 'BCH' || asset.symbol === 'sBCH'
  const setSubStringMaxLength = subStringMax > 0 ? subStringMax : balanceCheck.length
  let completeAsset = ''
  let newBalance 

  if (isBCH) {
    // fallback condition for translated 'DEEM'
    const { convert, decimal } = denomDecimalPlaces[denomination] ?? denomDecimalPlaces.DEEM
    let calculatedBalance = ''

    if (isInput) {
      calculatedBalance = (balanceCheck * convert).toString()
    } else {
      calculatedBalance = (balanceCheck * convert).toFixed(decimal)
    }
    newBalance = String(customNumberFormatting(calculatedBalance)).substring(0, setSubStringMaxLength)
    newBalance = parseFloat(newBalance).toLocaleString('en-US')
    completeAsset = `${newBalance} ${denomination}`
  } else {
    const isSLP = asset.id?.startsWith('slp/')
    let newBalance = String(
      parseFloat(convertTokenAmount(asset.balance, asset.decimals, isBCH, isSLP))
    ).substring(0, setSubStringMaxLength)
    newBalance = parseFloat(newBalance).toLocaleString('en-US')
    completeAsset = `${newBalance} ${asset.symbol}`
  }
  return completeAsset
}

/**
 * Used for when values does not come from a single object **(`asset`)**
 */
export function getAssetDenomination (denomination, assetBalance, isInput = false) {
  return parseAssetDenomination(denomination, {
    id: 'BCH',
    balance: assetBalance,
    symbol: 'BCH',
    decimals: 0
  }, isInput)
}

export function parseFiatCurrency (amount, currency) {
  const newAmount = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
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
  // remove dangling denomination then convert back to string
  const num = parseFloat(number).toString()

  // check if number is already on exponential notation
  if (num.includes('e')) {
    const fixedDecimals = parseInt(num.split('').pop()) + 1
    return parseFloat(num).toFixed(fixedDecimals)
  }

  // fallback for non-exponential notation
  const decimals = num.toString().split('.')[1]
  if (!decimals) return parseFloat(num).toString()
  return decimals.length > 6
    ? parseFloat(num).toFixed(decimals.length)
    : parseFloat(num).toString()
}
