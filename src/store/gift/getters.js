// import { toHex } from 'hex-my-bytes'
/*
export function someGetter (state) {
}
*/
export function getTitle (state) {
  return state.title
}
export function getAmount (state) {
  console.log(state.GIFTAMOUNT)
  return state.GIFTAMOUNT
}
export function share (state) {
  return state.share
}
