export function isPlusSubscriber (state) {
  return state?.isPlus || false
}

export function getLiftTokenBalance (state) {
  return state?.liftTokenBalance || 0
}

export function getSubscriptionTier (state) {
  return state?.isPlus ? 'plus' : 'free'
}

/**
 * Get the limit for a specific feature based on subscription tier
 * @param {Object} state
 * @param {string} limitType - 'wallets', 'favoriteTokens', 'multisigWallets', 'unclaimedGifts', 'merchants'
 * @returns {number} The limit for the current subscription tier
 */
import limitsConfig from './limits.json'

export function getLimit (state) {
  return (limitType) => {
    if (!state || !state.limits) {
      // Return free tier limits as default from limits.json
      return limitsConfig.free[limitType] || 0
    }
    const tier = state.isPlus ? 'plus' : 'free'
    return state.limits[tier]?.[limitType] || 0
  }
}

/**
 * Get current count for a specific feature
 * @param {Object} state
 * @param {Object} getters
 * @param {Object} rootState - Root Vuex state
 * @param {Object} rootGetters - Root Vuex getters
 * @param {string} limitType - 'wallets', 'favoriteTokens', 'multisigWallets', 'unclaimedGifts', 'merchants'
 * @returns {number} Current count
 */
export function getCurrentCount (state, getters, rootState, rootGetters) {
  return (limitType) => {
    if (!rootState && !rootGetters) {
      return 0
    }
    
    switch (limitType) {
      case 'wallets':
        // Count non-deleted wallets in vault using getter for reliability
        try {
          const vault = rootGetters['global/getVault'] || rootState?.global?.vault || []
          if (!Array.isArray(vault)) {
            return 0
          }
          return vault.filter(w => w && !w.deleted).length
        } catch (error) {
          console.warn('Error getting wallet count:', error)
          return 0
        }
      case 'favoriteTokens':
        // Count favorites from the store if available, otherwise return 0
        // Note: This requires favorites to be loaded in the store
        // For now, we'll calculate it in the component that uses it
        return 0
      case 'multisigWallets':
        try {
          const wallets = rootGetters['multisig/getWallets'] || rootState?.multisig?.wallets || []
          return Array.isArray(wallets) ? wallets.length : 0
        } catch (error) {
          console.warn('Error getting multisig wallet count:', error)
          return 0
        }
      case 'unclaimedGifts':
        // This will be calculated in the component/action that uses it
        // since gifts are fetched from API
        return 0
      case 'merchants':
        try {
          const merchants = rootGetters['paytacapos/merchants'] || rootState?.paytacapos?.merchantsListInfo || []
          return Array.isArray(merchants) ? merchants.length : 0
        } catch (error) {
          console.warn('Error getting merchant count:', error)
          return 0
        }
      default:
        return 0
    }
  }
}

/**
 * Check if a limit has been reached
 * @param {Object} state
 * @param {Object} getters
 * @param {string} limitType
 * @returns {boolean}
 */
export function isLimitReached (state, getters, rootState) {
  return (limitType) => {
    const current = getters.getCurrentCount(limitType)
    const limit = getters.getLimit(limitType)
    return current >= limit
  }
}

/**
 * Check if user can perform an action (hasn't reached limit)
 * @param {Object} state
 * @param {Object} getters
 * @param {string} limitType
 * @returns {boolean}
 */
export function canPerformAction (state, getters, rootState) {
  return (limitType) => {
    return !getters.isLimitReached(limitType)
  }
}

export function getMinLiftTokens (state) {
  return state?.minLiftTokens || limitsConfig.minLiftTokens
}

