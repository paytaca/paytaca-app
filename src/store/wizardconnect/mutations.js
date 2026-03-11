export function setConnections (state, connections) {
  state.connections = connections
}

export function addConnection (state, { id, data }) {
  state.connections = { ...state.connections, [id]: data }
}

export function removeConnection (state, connectionId) {
  const connections = { ...state.connections }
  delete connections[connectionId]
  state.connections = connections
}

export function updateConnection (state, { connectionId, data }) {
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
  state.pendingRequests = []
  state.cancelledKeys = []
}

export function addPendingRequest (state, request) {
  state.pendingRequests = [...state.pendingRequests, request]
}

export function removePendingRequest (state, { connectionId, sequence }) {
  state.pendingRequests = state.pendingRequests.filter(
    r => !(r.connectionId === connectionId && r.sequence === sequence)
  )
}

export function addCancelledKey (state, key) {
  state.cancelledKeys = [...state.cancelledKeys, key]
}

export function removeCancelledKey (state, key) {
  state.cancelledKeys = state.cancelledKeys.filter(k => k !== key)
}
