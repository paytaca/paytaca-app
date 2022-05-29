/**
 * 
 * @param {Object} state 
 * @param {{ key:String, peerId:String }} param1 
 */
export function updateSessionKeyPeerId(state, { key, peerId }) {
  state.sessionKeyPeerId = `${key}:${peerId}`
}

/**
 * 
 * @param {Object} state 
 * @param {Object} callRequest call request payload
 * @param {Number} callRequest.timestamp timestamp of when the call request was received
 * @param {{id:Number, method:String, params: Array.<String|Object>}} callRequest.payload call request payload
 */
 export function addCallRequest(state, callRequest) {
  if (!Array.isArray(state.callRequests)) state.callRequests = []

  const duplicateCallReq = state.callRequests.find(_callRequest => _callRequest?.payload?.id === callRequest?.payload?.id)
  if (duplicateCallReq) {
    const index = state.callRequests.indexOf(duplicateCallReq)
    state.callRequests[index] = callRequest
  } else {
    state.callRequests.unshift(callRequest)
  }
}

/**
 * 
 * @param {Object} state 
 * @param {Number} callRequestId 
 */
export function removeCallRequest(state, callRequestId) {
  if (!Array.isArray(state.callRequests)) return

  state.callRequests = state.callRequests.filter(callRequest => callRequest?.payload?.id !== callRequestId)
}

export function clearCallRequests(state) {
  state.callRequests = []
}
