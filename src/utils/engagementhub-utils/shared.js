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
  const d = new Date(date)
  const options = {
    year: 'numeric',
    month: 'long'
  }

  if (isDayIncluded) 
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  else return d.toLocaleDateString(undefined, options);
}

export function parseLiftToken (amount) {
  const newAmount = amount / (10 ** LIFT_DECIMALS)
  const finalAmount = formatWithLocale(newAmount, { max: LIFT_DECIMALS })

  return `${finalAmount} LIFT`
}