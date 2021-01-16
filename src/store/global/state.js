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
            balanceString: '1250',
            slpAddress: '<slp-address>',
            tokenId: 'test-token-id-1',
            balance: 120,
            decimalCount: 8
          },
          {
            balanceString: '120',
            slpAddress: '<slp-address>',
            tokenId: 'test-token-id-2',
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
            tokenId: 'test-token-id-1',
            balance: 130,
            decimalCount: 8
          },
          {
            balanceString: '120',
            slpAddress: '<slp-address>',
            tokenId: 'test-token-id-2',
            balance: 120000,
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
