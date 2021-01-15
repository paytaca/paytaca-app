export default function () {
  return {
    privateMode: true,
    user: {
      onboardingStep: 0,
      escrowAddress: '',

      escrowBalance: {
        lastUpdate: 0,
        confirmed: 0,
        unconfirmed: 0,
        tokens: [
          {
            balanceString: '120',
            slpAddress: '<slp-address>',
            tokenId: 'test-token-id',
            balance: 120,
            decimalCount: 8
          }
          // ...
        ]
      },

      privateAddress: '',
      privateBalance: {
        lastUpdate: 0,
        confirmed: 0,
        unconfirmed: 0,
        tokens: [
          {
            balanceString: '120',
            slpAddress: '<slp-address>',
            tokenId: 'test-token-id',
            balance: 120,
            decimalCount: 8
          }
          // ...
        ]
      }
    },
    vault: {
      mnemonic: '',
      privateKeys: {
        '': ''
      }
    }
  }
}
