import { Store } from 'src/store'

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

  if (isDayIncluded) options.day = 'numeric'

  return d.toLocaleDateString(undefined, options)
}

export function parseLiftToken (amount) {
  const newAmount = amount / (10 ** LIFT_DECIMALS)
  const finalAmount = Number(newAmount).toLocaleString()

  return `${finalAmount} LIFT`
}