export function getIdentity (state) {
  return function (address) {
    return state.identities[address]
  }
}

export function getChatsList (state) {
  return state.chatsList
}
