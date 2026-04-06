export function setConnections (state, connections) {
  if (!state) return
  state.connections = connections || {}
}

export function addConnection (state, { id, data }) {
  if (!state) return
  state.connections = { ...state.connections, [id]: data }
}

export function removeConnection (state, connectionId) {
  if (!state) return
  const connections = { ...state.connections }
  delete connections[connectionId]
  state.connections = connections
}

export function updateConnection (state, { connectionId, data }) {
  if (!state || !state.connections) return
  if (!state.connections[connectionId]) return
  state.connections = {
    ...state.connections,
    [connectionId]: {
      ...state.connections[connectionId],
      ...data
    }
  }
}

export function clearPendingRequests (state) {
  if (!state) return
  state.pendingRequests = []
  state.cancelledKeys = []
}

export function addPendingRequest (state, request) {
  if (!state) return
  state.pendingRequests = [...(state.pendingRequests || []), request]
}

export function removePendingRequest (state, { connectionId, sequence }) {
  if (!state) return
  state.pendingRequests = (state.pendingRequests || []).filter(
    r => !(r.connectionId === connectionId && r.sequence === sequence)
  )
}

export function addCancelledKey (state, key) {
  if (!state) return
  state.cancelledKeys = [...(state.cancelledKeys || []), key]
}

export function removeCancelledKey (state, key) {
  if (!state) return
  state.cancelledKeys = (state.cancelledKeys || []).filter(k => k !== key)
}
