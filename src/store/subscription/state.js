import limitsConfig from './limits.json'

export default function () {
  return {
    // Subscription status
    isPlus: false,
    liftTokenBalance: 0,
    lastChecked: null,
    
    // Limits configuration - imported from limits.json
    limits: {
      free: { ...limitsConfig.free },
      plus: { ...limitsConfig.plus }
    },
    
    // Minimum LIFT tokens required for Plus
    minLiftTokens: limitsConfig.minLiftTokens
  }
}

