export function addIdentity (state, data) {
	const identities = Object.assign({}, state.identities)
	identities[data.address] = data
	state.identities = identities
}

export function appendMessage (state, data) {
	if (state.history[data.topic]) {
		state.history[data.topic].push(data.message)
	} else {
    state.history[data.topic] = [data.message]
  }
}
