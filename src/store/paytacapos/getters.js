import { Store } from 'src/store'

/**
 * Get current wallet hash from global store
 * @returns {string|null} Current wallet hash
 */
function getCurrentWalletHash() {
  try {
    const wallet = Store.getters['global/getWallet']('bch')
    return wallet?.walletHash || null
  } catch (error) {
    return null
  }
}

/**
 * Get wallet-specific state for current wallet
 * @param {Object} state - PaytacaPOS store state
 * @param {string} walletHash - Optional wallet hash, if not provided uses current wallet
 * @returns {Object} Wallet-specific state
 */
function getWalletState(state, walletHash = null) {
  const hash = walletHash || getCurrentWalletHash()
  if (!hash) {
    return {}
  }
  
  // Ensure byWallet exists
  if (!state.byWallet) {
    return {}
  }
  
  if (!state.byWallet[hash]) {
    return {}
  }
  
  return state.byWallet[hash]
}

export function paymentMethod (state) {
  const walletState = getWalletState(state)
  return walletState.paymentMethod || {}
}

export function lastPaymentMethod (state) {
  const walletState = getWalletState(state)
  return walletState.lastPaymentMethod || null
}

function getFormattedLocation(location) {
  return [
    location?.location || location?.landmark,
    location?.street,
    location?.city,
    location?.country,
  ].filter(Boolean).join(', ')
}


export function merchants(state) {
  const walletState = getWalletState(state)
  if (!Array.isArray(walletState.merchants)) return []

  return walletState.merchants?.map(merchantData => {
    const formattedLocation = getFormattedLocation(merchantData?.location)
    return Object.assign({ formattedLocation }, merchantData)
  }) || []
}

export function merchantBranches(state) {
  const walletState = getWalletState(state)
  if (!Array.isArray(walletState.branches)) return []
  return walletState.branches || []
}

export function linkCodes(state) {
  const walletState = getWalletState(state)
  if (!Array.isArray(walletState.linkCodes)) return []
  return walletState.linkCodes || []
}

export function devicesLastActive(state) {
  const walletState = getWalletState(state)
  if (!Array.isArray(walletState.devicesLastActive)) return []
  return walletState.devicesLastActive || []
}

export function paymentOTPCache(state) {
  const walletState = getWalletState(state)
  return (txid) => {
    return {
      txid: txid,
      otp: walletState?.paymentOTPCache?.[txid]?.otp,
      timestamp: walletState?.paymentOTPCache?.[txid]?.timestamp,
      rawPaymentUri: walletState?.paymentOTPCache?.[txid]?.rawPaymentUri,
    }
  }
}

export function cashoutMerchant (state) {
  const walletState = getWalletState(state)
  return walletState.cashoutMerchant || {}
}
