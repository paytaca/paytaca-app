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
            balance: 0
          },
          {
            blockchain: 'BCH',
            id: 'php',
            balance: 0
          },
          {
            blockchain: 'BCH',
            id: '4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf', // spice
            balance: 0
          }
        ],
        transactions: {
          '': [],
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
