export function merchantInfo(state) {
  const formattedLocation = [
    state.merchantInfo?.location?.location || state.merchantInfo?.location?.landmark,
    state.merchantInfo?.location?.street,
    state.merchantInfo?.location?.city,
    state.merchantInfo?.location?.country,
  ].filter(Boolean).join(', ')
  const data = Object.assign({
    formattedLocation: formattedLocation,
  }, state.merchantInfo)
  return data
}

export function merchantBranches(state) {
  if (!Array.isArray(state.branches)) return []
  const merchantWalletHash = state?.merchantInfo?.walletHash

  if (!merchantWalletHash) return state.branches
  return state.branches
    .filter(branchInfo => branchInfo?.merchantWalletHash === merchantWalletHash)
    .map(branchInfo => {
      const formattedLocation = [
          branchInfo?.location?.location || branchInfo?.location?.landmark,
          branchInfo?.location?.street,
          branchInfo?.location?.city,
          branchInfo?.location?.country,
        ].filter(Boolean).join(', ')

      return Object.assign({ formattedLocation }, branchInfo)
    })
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
