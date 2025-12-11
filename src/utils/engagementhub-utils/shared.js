import { Store } from 'src/store'
import { formatWithLocale } from 'src/utils/denomination-utils'

const LIFT_DECIMALS = 2

// ==============================
// Store functions
// ==============================

export function getWalletHash () {
  return Store.getters['global/getWallet']('bch')?.walletHash
}

export function getBchWallet () {
  return Store.getters['global/getWallet']('bch')
}

// ==============================
// util functions
// ==============================

export function parseLocaleDate (date, isDayIncluded = true) {
  const d = new Date(date || null)
  const options = {}
  const langs = [Store.getters['global/language'], 'en-US']

  if (isDayIncluded) {
    options.dateStyle = "medium"
    options.timeStyle = "short"
  }
  return new Intl.DateTimeFormat(langs, options).format(d)
}

export function parseLiftToken (amount) {
  const newAmount = amount / (10 ** LIFT_DECIMALS)
  const finalAmount = formatWithLocale(newAmount, { max: LIFT_DECIMALS })

  return `${finalAmount} LIFT`
}