export function paymentMethod (state) {
  return state.paymentMethod
}

export function lastPaymentMethod (state) {
  return state.lastPaymentMethod
}

function getFormattedLocation(location) {
  return [
    location?.location || location?.landmark,
    location?.street,
    location?.city,
    location?.country,
  ].filter(Boolean).join(', ')
}


export function merchants(state) {
  if (!Array.isArray(state.merchants)) return []

  return state.merchants?.map(merchantData => {
    const formattedLocation = getFormattedLocation(merchantData?.location)
    return Object.assign({ formattedLocation }, merchantData)
  })
}

export function merchantBranches(state) {
  if (!Array.isArray(state.branches)) return []
  return state.branches
}

export function linkCodes(state) {
  if (!Array.isArray(state.linkCodes)) return []
  return state.linkCodes
}

export function devicesLastActive(state) {
  if (!Array.isArray(state.devicesLastActive)) return []
  return state.devicesLastActive
}

export function paymentOTPCache(state) {
  return (txid) => {
    return {
      txid: txid,
      otp: state?.paymentOTPCache?.[txid]?.otp,
      timestamp: state?.paymentOTPCache?.[txid]?.timestamp,
      rawPaymentUri: state?.paymentOTPCache?.[txid]?.rawPaymentUri,
    }
  }
}

export function cashoutMerchant (state) {
  return state.cashoutMerchant
}
