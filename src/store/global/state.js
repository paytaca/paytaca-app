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
        address: '',
        balances: {
          bch: 0.561,
          php: 1250,
          spice: 310000
        },
        transactions: {
          bch: [],
          php: [],
          spice: []
        }
      },
      private: {
        address: '',
        balances: {
          bch: 1.34,
          php: 178000,
          spice: 10000000
        },
        transactions: {
          bch: [],
          php: [],
          spice: []
        }
      }
    },
    assets: {
      bch: {
        name: 'Bitcoin Cash',
        symbol: 'BCH',
        logo: 'bitcoin-cash-bch-logo.png'
      },
      php: {
        name: 'Philippine Pesos',
        symbol: 'PHP',
        logo: 'pesos-logo.png'
      },
      spice: {
        name: 'Spice',
        symbol: 'SPICE',
        logo: 'spice-logo.png'
      }
    }
  }
}
