export default function () {
  return {
    paymentOTPCache: {
      'txid': { otp: '', otpTimestamp: -1, rawPaymentUri: '' },
      /* 
        // Example:
        '0a3d13aecf...': { 
          otp: '6-digit-otp',
          otpTimestamp: 1665457793, // unix -timestamp
          rawPaymentUri: 'bitcoincash:ead42...?amount=0.01',
        },
       */
    }
  }
}

