export function saveGift (state, data) {
  state.gifts[data.giftCodeHash] = data.share
  console.log(state.gifts)
}

export function deleteGift (state, giftCodeHash) {
  const gifts = Object.assign({}, state.gifts)
  delete gifts[giftCodeHash]
  state.gifts = gifts
  console.log(state.gifts)
}
