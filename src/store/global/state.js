export default function () {
  return {
    wallets: {
      bch: {
        walletHash: '',
        xPubKey: '',
        lastAddress: '',
        lastWalletIndex: 0
      },
      slp: {
        walletHash: '',
        xPubKey: '',
        lastAddress: '',
        lastWalletIndex: 0
      }
    },
    user: {
      onboardingStep: 0,
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: ''
    }
  }
}
