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
  if (date) {
    const d = new Date(date)
    const options = {}
    const langs = [Store.getters['global/language'], 'en-US']
  
    if (isDayIncluded) {
      options.dateStyle = "medium"
      options.timeStyle = "short"
    }
    return new Intl.DateTimeFormat(langs, options).format(d)
  }
  return '---'
}

export function parseLiftToken (amount) {
  const newAmount = amount / (10 ** LIFT_DECIMALS)
  const finalAmount = formatWithLocale(newAmount, { max: LIFT_DECIMALS })

  return `${finalAmount} LIFT`
}

// ==============================
// Promise functions
// ==============================

/**
 * Broadcast given transaction hex to network using the Watchtower API.
 * This is done because the `send()` function of CashScript sometimes has
 * a delay when broadcasting transaction to nodes.
 * @param {String} txHex The built transaction in hex string
 * @returns {Promise<string>} A string containing the successfully broadcasted transaction ID
 * @throws A generic error when broadcasting fails
 */
export async function broadcastTxUsingWatchtower(txHex) {
  const resp = await axios.post("https://watchtower.cash/api/broadcast/", {
    transaction: txHex,
  });

  if (resp?.status === 200 && resp?.data?.success) {
    return resp?.data?.txid;
  } else {
    throw new Error("Failed to broadcast transaction.");
  }
}