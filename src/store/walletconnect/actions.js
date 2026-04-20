import { initWeb3Wallet, getWeb3Wallet, isWalletConnectInitialized, parseSessionRequest } from 'src/wallet/walletconnect2'

/**
 * Initialize WalletConnect and load pending session requests
 * This should be called on app startup and on home page refresh
 * @param {Object} context - Vuex action context
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Force refresh even if already initialized
 */
export async function loadSessionRequests({ commit, rootGetters }, { forceRefresh = false } = {}) {
  try {
    // Initialize WalletConnect if not already done
    let web3Wallet = getWeb3Wallet()
    if (!web3Wallet || !isWalletConnectInitialized()) {
      web3Wallet = await initWeb3Wallet()
    }

    if (!web3Wallet) {
      console.warn('WalletConnect not available')
      return []
    }

    // Get active sessions to attach session metadata to requests
    const isChipnet = rootGetters['global/isChipnet']
    const chainIdFilter = isChipnet ? 'bch:bchtest' : 'bch:bitcoincash'
    
    const allSessions = web3Wallet.getActiveSessions()
    const activeSessions = Object.fromEntries(
      Object.entries(allSessions).filter(([topicKey, sessionValue]) => {
        return sessionValue.namespaces?.bch?.chains?.includes(chainIdFilter)
      })
    )

    // Get pending session requests
    let requests = await web3Wallet.getPendingSessionRequests()
    
    // Filter by chain and parse requests
    const whitelistedMethods = ['bch_getAddresses', 'bch_getAccounts']
    
    requests = requests.filter((r) => {
      return r.params?.chainId === chainIdFilter
    }).map(sessionRequest => {
      const parsedSessionRequest = parseSessionRequest(sessionRequest)
      parsedSessionRequest.session = activeSessions[parsedSessionRequest.topic]
      return parsedSessionRequest
    }).filter((sessionRequest) => {
      // Remove whitelisted methods that are handled automatically
      return !whitelistedMethods.includes(sessionRequest.params?.request?.method)
    })

    // Serialize requests for Vuex store (avoid storing non-serializable objects)
    const serialized = requests.map(req => ({
      id: req.id,
      topic: req.topic,
      params: req.params,
      verifyContext: req.verifyContext,
      session: req.session ? {
        peer: {
          metadata: req.session.peer?.metadata
        }
      } : null
    }))

    commit('setSessionRequests', serialized)
    return serialized
  } catch (error) {
    console.error('Error loading WalletConnect session requests:', error)
    return []
  }
}

/**
 * Initialize WalletConnect without loading requests
 * Useful for ensuring WalletConnect is ready
 */
export async function init({ dispatch }) {
  try {
    await initWeb3Wallet()
    // Load session requests after initialization
    await dispatch('loadSessionRequests')
  } catch (error) {
    console.error('Error initializing WalletConnect:', error)
  }
}
