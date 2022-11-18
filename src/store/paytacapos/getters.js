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
