import { parseFiatCurrency } from 'src/utils/denomination-utils'

function toFiniteNumber (value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function bchToDisplay (bchAmount, rates) {
  const bch = toFiniteNumber(bchAmount)
  const displayPerBch = toFiniteNumber(rates?.display_per_bch)

  if (bch === null || displayPerBch === null) return null
  return bch * displayPerBch
}

export function isRateFallback (requestedCurrency, responseCurrency, rateUnavailable) {
  if (!rateUnavailable) return false

  const requested = String(requestedCurrency || '').toUpperCase()
  const response = String(responseCurrency || '').toUpperCase()

  return requested !== '' && requested !== 'PHP' && response === 'PHP'
}

export function displayAmount (amount, currency) {
  return parseFiatCurrency(amount, currency || 'PHP')
}
