export default function () {
  return {
    privateMode: false,
    vault: {
      mnemonic: '',
      privateKeys: {
        '': ''
      }
    },
    user: {
      onboardingStep: 0,
      firstName: '',
      lastName: '',
      mobileNumber: ''
    },
    accounts: {
      escrow: {
        address: 'bitcoincash:qrkf6p4f9wwagxjfhdzj2p0p8v5f90pvuylefkna04',
        balances: [
          {
            blockchain: 'BCH',
            id: '',
            balance: 0.561
          },
          {
            blockchain: 'BCH',
            id: 'php',
            balance: 1250
          },
          {
            blockchain: 'BCH',
            id: '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // spice
            balance: 310000
          }
        ],
        transactions: {
          '': [
            { type: 'sent', amount: 0.003, txid: '437f0c6664b9bb3e9044f2d4f98e0f105d48b1c34a77a65bb193f4d517a69840' },
            { type: 'received', amount: 0.01, txid: '93d84b157cf5902bfe83ca88ccce0fb4c28ad064b4a830373f99856b0c7eb0f5' },
            { type: 'sent', amount: 1.056, txid: '493a369cd688080fb6f60f752d28329b5a3baa900719b87961deaf66ed8f4ad6' },
            { type: 'received', amount: 0.982, txid: 'bf0132773a63d96a97dc662a52c934b3571e78b7a7540104aacada4d08347306' }
          ],
          php: [],
          spice: []
        }
      },
      private: {
        address: '',
        balances: [
          {
            id: '',
            balance: 1.34
          },
          {
            id: 'php',
            balance: 178000
          },
          {
            id: '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // spice
            balance: 10000000
          }
        ],
        transactions: {
          '': [],
          php: [],
          spice: []
        }
      }
    },
    assets: [
      {
        blockchain: 'BCH',
        id: '',
      },
      {
        blockchain: 'BCH',
        id: 'php',
      },
      {
        blockchain: 'BCH',
        id: '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // spice
      },
    ]
  }
}
