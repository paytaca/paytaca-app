export default function () {
  return {
    /** per wallet index */
    balances: [].map(() => {
      return {
        walletHash: '',
        mainnet: [].map(() => {
          return { category: '', amount: 0, currency: '' }
        }),
        chipnet: [].map(() => {
          return { category: '', amount: 0, currency: '' }
        })
      }
    }),

    // includes mainnet & chipnet
    // price is from price oracle which represents unit/BCH e.g. for USD is cents/BCH
    fiatTokens: [].map(() => {
      return {
        category: '',
        currency: '',
        decimals: 0,
        priceMessage: {
          pubkey: '',
          message: '',
          signature: '',
          priceValue: 0,
          priceSequence: 0,
          messageSequence: 0,
          messageTimestamp: 0,
        },
      }
    }),
  }
}
