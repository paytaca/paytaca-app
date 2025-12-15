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
        favoriteTokens: 7,
        multisigWallets: 1,
        unclaimedGifts: 3,
        merchants: 1
      },
      plus: {
        wallets: 12,
        favoriteTokens: 24,
        multisigWallets: 5,
        unclaimedGifts: 10,
        merchants: 3
      }
    },
    
    // Minimum LIFT tokens required for Plus
    minLiftTokens: 100
  }
}

