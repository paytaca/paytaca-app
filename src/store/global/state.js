export default function () {
  return {
    vault: {
      mnemonic: '',
      wallets: {
        bch: {
          walletHash: '',
          lastAddress: '',
          lastWalletIndex: 0
        },
        slp: {
          walletHash: '',
          lastAddress: '',
          lastWalletIndex: 0
        }
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
