export function getGiftShare (state) {
  return function (giftCodeHash) {
    return state.gifts[giftCodeHash]
  }
}
