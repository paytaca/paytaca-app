import { convertTokenAmount } from 'src/wallet/chipnet'

const denomDecimalPlaces = {
  BCH: 8,
  mBCH: 5,
  Satoshis: 0,
  DEEM: 0
}

/**
 * `BCH` - 8 decimal places;
 * `mBCH` - 5 decimal places;
 * `Satoshis`, `DEEM` - 0 decimal places
 */
export function parseAssetDenomination (denomination, asset, subStringMax = 0) {
  const isBCH = asset.symbol === 'BCH'
  const setSubStringMaxLength = subStringMax > 0 ? subStringMax : asset.balance.length
  let completeAsset = ''
  if (isBCH) {
    const newBalance = String(asset.balance.toFixed(denomDecimalPlaces[denomination])).substring(0, setSubStringMaxLength)
    completeAsset = `${newBalance} ${denomination}`
  } else {
    const isSLP = asset.id?.startsWith('slp/')
    const newBalance = String(convertTokenAmount(asset.balance, asset.decimals, isBCH, isSLP)).substring(0, setSubStringMaxLength)
    completeAsset = `${newBalance} ${asset.symbol}`
  }
  return completeAsset
}
