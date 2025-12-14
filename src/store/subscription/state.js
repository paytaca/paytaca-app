export default function () {
  return {
    // Subscription status
    isPlus: false,
    liftTokenBalance: 0,
    lastChecked: null,
    
    // Limits configuration
    limits: {
      free: {
        wallets: 3,
        favoriteTokens: 12,
        multisigWallets: 3,
        unclaimedGifts: 12,
        merchants: 3
      },
      plus: {
        wallets: 12,
        favoriteTokens: 24,
        multisigWallets: 12,
        unclaimedGifts: 24,
        merchants: 12
      }
    },
    
    // Minimum LIFT tokens required for Plus
    minLiftTokens: 100
  }
}

