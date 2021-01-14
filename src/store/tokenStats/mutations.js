export function updateTokenStats (state, data) {
  if (!data || !data.id) return

  if (!Array.isArray(state.tokenTypes)) {
    state.tokenTypes = [data]
  }

  const index = state.tokenTypes.map(t => t.id).indexOf(data.tokenId)
  if (index < 0) state.tokenTypes.push(data)
  else state.tokenTypes[index] = data
}
