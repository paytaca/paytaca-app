export function updateUser (state, user) {
  state.user = user
}

export function clearProfile (state) {
  state.user = null
}
