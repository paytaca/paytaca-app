export function getConnections (state) {
  return state?.connections || {}
}

export function getPendingRequests (state) {
  return state?.pendingRequests || []
}

export function hasPendingRequests (state) {
  return (state?.pendingRequests || []).length > 0
}
