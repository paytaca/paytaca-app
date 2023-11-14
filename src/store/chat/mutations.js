export function addIdentity (state, data) {
	if (!data) return
	const identities = Object.assign({}, state.identities)
	identities[data.address] = data
	state.identities = identities
}

export function appendMessage (state, data) {
	if (state.history[data.topic]) {
		const messages = state.history[data.topic]
		const lastMessage = messages[messages.length - 1]
		if (lastMessage.timestamp !== data.message.timestamp) {
			state.history[data.topic].push(data.message)
		}
	} else {
    state.history[data.topic] = [data.message]
  }
}

export function deleteHistory (state, topic) {
	delete state.history[topic]
}
