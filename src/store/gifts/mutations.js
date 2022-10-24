export function saveGift (state, data) {
  state.gifts[data.giftCodeHash] = data.share
}

export function deleteGift (state, giftCodeHash) {
  const gifts = Object.assign({}, state.gifts)
  delete gifts[giftCodeHash]
  state.gifts = gifts
}
