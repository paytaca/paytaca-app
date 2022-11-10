export default function () {
  return {
    network: 'BCH', // BCH || sBCH
    wallets: {
      bch: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0
      },
      slp: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0
      },
      sbch: {
        subscribed: false,
        walletHash: '',
        derivationPath: '',
        lastAddress: ''
      }
    },
    user: {
      onboardingStep: 0,
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: ''
    },
    online: null
  }
}
