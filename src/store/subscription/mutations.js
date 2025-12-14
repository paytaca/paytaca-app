export function setSubscriptionStatus (state, { isPlus, liftTokenBalance }) {
  if (!state) {
    console.error('Subscription state is undefined in setSubscriptionStatus')
    return
  }
  
  // Ensure state properties exist
  if (typeof state.isPlus === 'undefined') {
    state.isPlus = false
  }
  if (typeof state.liftTokenBalance === 'undefined') {
    state.liftTokenBalance = 0
  }
  if (typeof state.lastChecked === 'undefined') {
    state.lastChecked = null
  }
  
  state.isPlus = isPlus !== undefined ? isPlus : false
  state.liftTokenBalance = liftTokenBalance || 0
  state.lastChecked = Date.now()
}

export function setLiftTokenBalance (state, balance) {
  if (!state) {
    console.error('Subscription state is undefined in setLiftTokenBalance')
    return
  }
  
  // Ensure state properties exist
  if (typeof state.liftTokenBalance === 'undefined') {
    state.liftTokenBalance = 0
  }
  if (typeof state.isPlus === 'undefined') {
    state.isPlus = false
  }
  if (typeof state.lastChecked === 'undefined') {
    state.lastChecked = null
  }
  if (typeof state.minLiftTokens === 'undefined') {
    state.minLiftTokens = 100
  }
  
  state.liftTokenBalance = balance || 0
  // Update isPlus status based on balance
  const minLiftTokens = state.minLiftTokens || 100
  state.isPlus = balance >= minLiftTokens
  state.lastChecked = Date.now()
}

export function setLimits (state, limits) {
  if (limits.free) {
    state.limits.free = { ...state.limits.free, ...limits.free }
  }
  if (limits.plus) {
    state.limits.plus = { ...state.limits.plus, ...limits.plus }
  }
}

