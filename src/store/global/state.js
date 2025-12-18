// type ConnectedApp = {
//   app_url: string,
//   app_name: string,
//   app_icon: string,
//   wallet_address: string,
//   wallet_hash: string
// }

// type AddressAndIndex = {
//   address: String,
//   address_index: number
// }

// type WalletAddress = {
//     wif: string,
// } & AddressAndIndex



export default function () {
  return {
    network: 'BCH',
    language: 'en-us',
    country: {
      name: 'United States',
      code: 'US'
    },
    theme: 'glassmorphic-blue', // [glassmorphic-blue, payhero]
    isChipnet: false,
    autoGenerateAddress: true,
    enableStablhedge: false,
    enableSLP: false,
    wallets: {
      bch: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {},
        lastAddressAndIndex: { /*{ address: string, index: number}*/ },
        connectedApps: [], /* ConnectedApp[] */
        walletAddresses: [] /* WalletAddress[] Discovered addresses based on lastAdressAnIndex address_index */
      },
      slp: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      }
    },
    chipnet__wallets: {
      bch: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {},
        lastAddressAndIndex: {},
        connectedApps: [],
        walletAddresses: []
      },
      slp: {
        walletHash: '',
        derivationPath: '',
        xPubKey: '',
        lastAddress: '',
        lastChangeAddress: '',
        lastAddressIndex: 0,
        connectedAddress: '',
        connectedAddressIndex: '0/0',
        connectedSites: {}
      }
    },
    utxoScanTasks: {
      // <walletHash>: { taskId: '', timestamp: 0, lastUpdate: 0, status: '', queueInfo: ... },
      '86f684f477079124f75e385384b42edec8a35ec73f666262528da1e045fc6e85': {
        taskId: '37c23f84-5271-43f4-a569-c9152fd8e535',
        timestamp: 1668062253501,
        lastUpdate: 1668062253501,
        status: '',
        dateDone: 0,
        queueInfo: undefined,
      }
    },
    user: {
      onboardingStep: 0,
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: ''
    },
    online: null,
    walletIndex: 0,
    vault: [],
    denomination: 'BCH',
    appControl: null,
    merchantActivity: {
      active: false,
      verified: false
    },
    walletsRecovered: false, // Flag to check if wallets have been recovered from storage
    walletRecoveryMessage: '',
    /**
     * Clearable state, any apps storing state here should be able to recover if cache is cleared.
     */
    cache: {
      /**
       * Caches the basic cashtoken details.
       * Using category as key, the value is a partial of BCMR's latest IdentitySnapshot.
       * 
       * @type {[category: string]: {
       *   name: string
       *   description?: string,
       *   uris?: {
       *     icon: string
       *   },
       *   token: {
       *    category: string,
       *    symbol: string,
       *    decimals?: number
       *  }
       * }} - A partial BCMR IdentitySnapshot, other fields are omitted
       */
      cashtokenIdentities: {}
    }
  }
}
