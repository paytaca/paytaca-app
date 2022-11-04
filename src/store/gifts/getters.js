export function getGiftShare (state) {
  return function (giftCodeHash) {
    return state.gifts[giftCodeHash]
  }
}
export function getQrShare (state) {
  return function (giftCodeHash) {
    return state.qr[giftCodeHash]
  }
}
