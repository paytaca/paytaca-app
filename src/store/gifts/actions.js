export function saveGift ({ commit }, data) {
  commit('saveGift', data)
}

export function deleteGift ({ commit }, giftCodeHash) {
  commit('deleteGift', giftCodeHash)
}
