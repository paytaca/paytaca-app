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
