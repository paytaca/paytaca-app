export function setCards (state, cards) {
  state.cards = cards
}

export function clearCards (state) {
  state.cards = []
}

export function addCard (state, card) {
  state.cards.push(card)
}

export function updateCard (state, updatedCard) {
  const index = state.cards.findIndex(card => card.id === updatedCard.id)
  if (index !== -1) {
    state.cards.splice(index, 1, updatedCard)
  }
}

export function setCardTransactions (state, { cardId, transactions }) {
  const card = state.cards.find(card => card.id === cardId)
  if (card) {
    card.transactions = transactions
  }
}

export function addCardTransactions (state, { cardId, transactions }) {
  const card = state.cards.find(card => card.id === cardId)
  if (card) {
    card.transactions = [...(card.transactions || []), ...transactions]
  }
}

export function clearCardTransactions (state, cardId) {
  const card = state.cards.find(card => card.id === cardId)
  if (card) {
    card.transactions = []
  }
}