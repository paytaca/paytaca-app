import { convertTokenAmount } from 'src/wallet/chipnet'

const denomDecimalPlaces = {
  BCH: { convert: 1, decimal: 8 },
  mBCH: { convert: 1000, decimal: 5 },
  Satoshis: { convert: 10 ** 8, decimal: 0 },
  DEEM: { convert: 10 ** 4, decimal: 0 }
}

export function parseAssetDenomination (denomination, asset, subStringMax = 0) {
  const balanceCheck = asset.balance ?? 0
  const isBCH = asset.symbol === 'BCH'
  const setSubStringMaxLength = subStringMax > 0 ? subStringMax : balanceCheck.length
  let completeAsset = ''

  if (isBCH) {
    // fallback condition for translated 'DEEM'
    const { convert, decimal } = denomDecimalPlaces[denomination] ?? denomDecimalPlaces.DEEM
    const calculatedBalance = (balanceCheck * convert).toFixed(decimal)
    const newBalance = String(calculatedBalance).substring(0, setSubStringMaxLength)

    completeAsset = `${parseFloat(newBalance)} ${denomination}`
  } else {
    const isSLP = asset.id?.startsWith('slp/')
    const newBalance = String(
      convertTokenAmount(asset.balance, asset.decimals, isBCH, isSLP)
    ).substring(0, setSubStringMaxLength)
    completeAsset = `${newBalance} ${asset.symbol}`
  }
  return completeAsset
}

/**
 * Used for when values does not come from a single object **(`asset`)**
 */
export function getAssetDenomination (denomination, assetBalance) {
  return parseAssetDenomination(denomination, {
    id: 'BCH',
    balance: assetBalance,
    symbol: 'BCH',
    decimals: 0
  })
}

export function parseFiatCurrency (amount, currency) {
  const newAmount = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${newAmount} ${currency.toUpperCase()}`
}
