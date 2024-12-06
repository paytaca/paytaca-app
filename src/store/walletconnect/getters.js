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
