export default function () {
  return {
    merchants: [].map(() => {
      return {
        id: 0,
        index: null,
        walletHash: '',
        name: '',
        primaryContactNumber: '',
        branchCount: 0,
        posDeviceCount: 0,
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
    }),
    branches: [
      {
        id: 0,
        merchantId: 0,
        merchantWalletHash: '',
        name: '',
        isMain: false,
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
    linkCodes: [
      { walletHash: '', posid: 0, code: '', expiresAt: 0, decryptKey: '', nonce: 0 },
    ],
    devicesLastActive: [
      { walletHash:'', posid: 0, lastActive: 0 },
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
    },
    paymentMethod: {},
    lastPaymentMethod: null,
    cashoutMerchant: {},
    nfcPaymentsEnabled: false
  }
}
