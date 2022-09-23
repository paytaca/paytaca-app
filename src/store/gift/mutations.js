// import { ECPair } from '@psf/bitcoincashjs-lib'

// import { stat } from "fs"

/*
export function someMutation (state) {
}
*/
// testing 9/19/22
export function NEW_AMOUNT (state, amount) {
  state.giftingAmount.splice(amount, 1)
  state.giftingAmount.push(amount)
}

// test 9 23 2022
export function GENPRIVKEY (state, key) {
  state.privKey.push(key)
  // state.privKey.splice(key, 5)
}
export function GENCASHADD (state, key) {
  state.cashAdd.push(key)
  // state.cashAdd.splice(key, 5)
}
export function GENSHARES (state, key) {
  state.storeShare.push(key)
  // state.storeShare.splice(key, 5)
}
export function RECOVERSEC (state, key) {
  state.recShare.push(key)
  // state.recShare.splice(key, 5)
}
export function storeGift (state, id, shares) {
  state.genGifts[id] = shares
}
