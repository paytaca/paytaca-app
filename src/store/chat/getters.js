export function getIdentity (state) {
  return function (address) {
    return state.identities[address]
  }
}

export function getChatsList (state) {
  let topics = Object.keys(state.history)
  topics = topics.reverse()
  return topics.map((topic) => {
    const messages = state.history[topic]
    const lastMessage = messages[messages.length - 1]
    return { topic, message: lastMessage }
  })
}

export function getHistory (state) {
  return function (topic) {
    return state.history[topic] || []
  }
}
