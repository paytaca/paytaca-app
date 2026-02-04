import { computed } from 'vue'
import { useStore } from 'vuex'

/**
 * Composable for subscription features
 * Provides easy access to subscription status, limits, and helper methods
 */
export function useSubscription () {
  const store = useStore()
  
  // Subscription status
  const isPlus = computed(() => store.getters['subscription/isPlusSubscriber'])
  const tier = computed(() => store.getters['subscription/getSubscriptionTier'])
  const liftTokenBalance = computed(() => store.getters['subscription/getLiftTokenBalance'])
  const minLiftTokens = computed(() => store.getters['subscription/getMinLiftTokens'])
  
  // Helper methods
  const getLimit = (limitType) => {
    return store.getters['subscription/getLimit'](limitType)
  }
  
  const getCurrentCount = (limitType) => {
    return store.getters['subscription/getCurrentCount'](limitType)
  }
  
  const isLimitReached = (limitType) => {
    return store.getters['subscription/isLimitReached'](limitType)
  }
  
  const canPerformAction = (limitType) => {
    return store.getters['subscription/canPerformAction'](limitType)
  }
  
  const checkSubscriptionStatus = (forceRefresh = false) => {
    return store.dispatch('subscription/checkSubscriptionStatus', forceRefresh)
  }
  
  return {
    // Computed properties
    isPlus,
    tier,
    liftTokenBalance,
    minLiftTokens,
    
    // Methods
    getLimit,
    getCurrentCount,
    isLimitReached,
    canPerformAction,
    checkSubscriptionStatus
  }
}

