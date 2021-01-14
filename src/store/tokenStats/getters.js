export function getTokenStats (state) {
  return (tokenId) => {
    if (!Array.isArray(state.tokenTypes)) return null

    return state.tokenTypes.find(tknStats => tknStats.id === tokenId)
  }
}
