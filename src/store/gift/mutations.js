// import { ECPair } from '@psf/bitcoincashjs-lib'
/*
export function someMutation (state) {
}
*/
export function changeAmount (state, number) {
  state.amt = number
}
export function retAmount (state, number) {
  state.amt = number
}
export function retAddress (state, number) {
  state.cashAddress = number
}
export function generatePrivateKey (state, wif) {
  state.privateKey = wif
}
export function convertToCashAddress (state, pk) {
  state.cashAddress = pk
}
export function splitSecret (state, sSecret) {
  state.secret = sSecret
}
export function storeShare (state, shares) {
  state.share = shares
}
export function recoverSecret (state, rSecret) {
  state.recover = rSecret
}
export function handleSubmit (state, submit) {
  state.submit = submit
}
// testing 9/19/22
export function NEW_AMOUNT (state, amount) {
  state.giftingAmount.splice(amount, 1)
  state.giftingAmount.push(amount)
}
export function aPrivateKey (state, arrPriv) {
  state.apKey.push(arrPriv)
}
export function apKeyStore (state, arrPriv) {
  // state.apKeyStore.push(arrPriv)
  state.apKeyStore.splice(arrPriv, 5)
}
export function acAddressStore (state, arrPriv) {
  // state.acAddressStore.push(arrPriv)
  state.acAddressStore.splice(arrPriv, 5)
}
export function aCashAddress (state, arrCash) {
  state.acAddress.push(arrCash)
}
export function aSplitSecret (state, arrShare) {
  state.aShare.push(arrShare)
}
export function spliceKey (state, split) {
  // state.acAddressStore.push(split)
  state.apKey.splice(split, 5)
}
export function spliceAddress (state, split) {
  // state.apKeyStore.push(split)
  state.acAddress.splice(split, 5)
}
