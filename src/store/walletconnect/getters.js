export function sessionKeyPeerId (state) {
  return state.sessionKeyPeerId
}

export function callRequests (state) {
  if (!Array.isArray(state.callRequests)) return []
  return state.callRequests
}

export function settings (state) {
  return state.settings
}

/**
 * Get session requests (sign/transaction requests) for display on home page
 * @param {Object} state
 * @returns {Array} Array of session request objects
 */
export function getSessionRequests (state) {
  return state?.sessionRequests || []
}

/**
 * Check if there are any pending session requests
 * @param {Object} state
 * @returns {Boolean}
 */
export function hasSessionRequests (state) {
  return (state?.sessionRequests || []).length > 0
}
