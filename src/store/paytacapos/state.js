export default function () {
  return {
    merchantInfo: {
      id: 0,
      walletHash: '',
      name: '',
      primaryContactNumber: '',
      location: {
        landmark: '',
        location: '',
        street: '',
        city: '',
        country: '',
        longitude: null,
        latitude: null,
      },
    },
    branches: [
      {
        id: 0,
        merchantWalletHash: '',
        name: '',
        location: {
          landmark: '',
          location: '',
          street: '',
          city: '',
          country: '',
          longitude: null,
          latitude: null,
        },
      }
    ],
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

