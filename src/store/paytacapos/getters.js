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
