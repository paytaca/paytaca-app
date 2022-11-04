export function saveGift (state, data) {
  state.gifts[data.giftCodeHash] = data.share
}
export function saveQr (state, data) {
  state.qr[data.giftCodeHash] = data.qr
}

export function deleteGift (state, giftCodeHash) {
  const gifts = Object.assign({}, state.gifts)
  delete gifts[giftCodeHash]
  state.gifts = gifts
}
