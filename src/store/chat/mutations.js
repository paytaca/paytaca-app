export function addIdentity (state, data) {
	const identities = Object.assign({}, state.identities)
	identities[data.address] = data
	state.identities = identities
}

