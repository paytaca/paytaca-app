import { checkLiftTokenBalance } from 'src/utils/subscription-utils'
import limitsConfig from './limits.json'

/**
 * Check subscription status by verifying LIFT token balance
 * @param {Object} context - Vuex action context
 * @param {boolean} forceRefresh - Force refresh even if recently checked
 * @returns {Promise<{isPlus: boolean, balance: number}>}
 */
export async function checkSubscriptionStatus (context, forceRefresh = false) {
  // Ensure state exists
  if (!context.state) {
    console.error('Subscription state is not initialized')
    return { isPlus: false, balance: 0 }
  }
  
  // Check if we recently checked (within last 30 seconds) and not forcing refresh
  const lastChecked = context.state.lastChecked || null
  const thirtySecondsAgo = Date.now() - 30000
  
  if (!forceRefresh && lastChecked && lastChecked > thirtySecondsAgo) {
    return {
      isPlus: context.state.isPlus || false,
      balance: context.state.liftTokenBalance || 0
    }
  }
  
  try {
    const balance = await checkLiftTokenBalance()
    const minLiftTokens = context.state.minLiftTokens || limitsConfig.minLiftTokens
    const isPlus = balance >= minLiftTokens
    
    context.commit('setSubscriptionStatus', {
      isPlus,
      liftTokenBalance: balance
    })
    
    return { isPlus, balance }
  } catch (error) {
    console.error('Error checking subscription status:', error)
    // On error, default to free tier
    try {
      context.commit('setSubscriptionStatus', {
        isPlus: false,
        liftTokenBalance: 0
      })
    } catch (commitError) {
      console.error('Error committing subscription status:', commitError)
    }
    return { isPlus: false, balance: 0 }
  }
}

