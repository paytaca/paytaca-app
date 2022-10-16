export function saveGift (state, data) {
  state.gifts[data.giftCodeHash] = data.share
}

export function deleteGift (state, data) {
  delete state.gifts[data.giftCodeHash]
}
