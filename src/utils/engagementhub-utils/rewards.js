import { Store } from 'src/store'
import { convertToBCH } from 'src/utils/denomination-utils'

function denomination () {
  return Store.getters['global/denomination']
}

function fiatCurrency () {
  const currency = Store.getters['market/selectedCurrency']
  return currency?.symbol
}

function bchMarketPrice () {
  if (!fiatCurrency()) return 0
  return Store.getters['market/getAssetPrice']('bch', fiatCurrency())
}

export function convertPoints (points, pointsDivisor) {
  const fiat = points / pointsDivisor
  const bch = convertToBCH(denomination(), (fiat / bchMarketPrice()))

  const finalFiat = `${fiat} ${fiatCurrency()}`
  const finalBch = `${Number(bch) === 0 ? '0' : bch.toFixed(8)} ${denomination()}`

  return `(${finalFiat} or ${finalBch})`
}
