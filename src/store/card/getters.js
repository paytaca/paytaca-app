export function getUser (state) {
  return state.user
}

export function getCardById (state) {
  return function (id) {
    return state.cards.find(card => {
      return card.id === parseInt(id)
    })
  }
}

export function cards (state) {
  return state.cards || []
}

export function transactions (state) {
  return function (id) {
    const card = state.cards.find(card => card.id === id)
    return card ? card.transactions : []
  }
}