function getFormattedLocation(location) {
  return [
    location?.location || location?.landmark,
    location?.street,
    location?.city,
    location?.country,
  ].filter(Boolean).join(', ')
}


export function merchantInfo(state) {
  const formattedLocation = getFormattedLocation(state.merchantInfo?.location)
  return Object.assign({ formattedLocation }, state.merchantInfo)
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
  const merchantWalletHash = state?.merchantInfo?.walletHash

  if (!merchantWalletHash) return state.branches
  return state.branches
    .filter(branchInfo => branchInfo?.merchantWalletHash === merchantWalletHash)
    .map(branchInfo => {
      const formattedLocation = getFormattedLocation(branchInfo?.location)
      return Object.assign({ formattedLocation }, branchInfo)
    })
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
