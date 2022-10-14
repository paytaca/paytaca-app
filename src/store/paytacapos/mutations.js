/**
 * 
 * @param {Object} state 
 * @param {Object} data 
 * @param {String} data.txid
 * @param {String} data.otp
 * @param {Number} data.otpTimestamp
 * @param {String} data.rawPaymentUri
 */
export function saveOTPCache(state, data) {
  if (!data?.txid || !data?.otp || !data?.otpTimestamp || !data?.rawPaymentUri) return

  if (!state.paymentOTPCache) state.paymentOTPCache = {}
  state.paymentOTPCache[data.txid] = {
    _added_at: Math.floor(Date.now()/1000),
    otp: data.otp,
    otpTimestamp: data.otpTimestamp,
    rawPaymentUri: data.rawPaymentUri,
  }
}

/**
 * 
 * @param {Object} state 
 * @param {String} txid 
 */
export function removeTxOTPCache(state, txid) {
  if (!state.paymentOTPCache) return

  delete state.paymentOTPCache?.[txid]
}


/**
 * Remove qr data older than age specified in seconds
 * @param {Number} age seconds
 */
export function removeOldPaymentOTPCache(state, age=86400) {
  const now = Math.floor(Date.now()/1000)
  const cutoffTimestamp = now - age
  for (const txid in state.paymentOTPCache) {
    const timestamp = state.paymentOTPCache?.[txid]?._added_at
    if (cutoffTimestamp > timestamp || !Number.isSafeInteger(timestamp)) delete state.paymentOTPCache?.[txid]
  }
}
