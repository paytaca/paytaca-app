export function getIdentity (state) {
  return function (address) {
    return state.identities[address]
  }
}

export function getChatsList (state) {
  return state.chatsList
}

export function getHistory (state) {
  return function (topic) {
    return state.history[topic]
  }
}
