import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'

// testing 9 19 2022

export function aCashAddress ({ commit }) {
  // #generate private key
  const v = ECPair.makeRandom()
  const vWif = v.toWIF()
  console.log(vWif)
  commit('aPrivateKey', vWif)
  commit('apKeyStore', vWif)
  // #generate cashAddress from private key
  const BCHJS = require('@psf/bch-js')
  const bchjs = new BCHJS()
  const pk = vWif
  const pair = bchjs.ECPair.fromWIF(pk)
  const str = bchjs.ECPair.toCashAddress(pair)
  console.log(str)
  commit('aCashAddress', str)
  commit('acAddressStore', str)
  // #split private key into 3 shares
  const sss = require('shamirs-secret-sharing')
  const secret = Buffer.from(pk)
  const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
  this.shares = stateShare.map((share) => { return toHex(share) })
  commit('aSplitSecret', this.shares)
  console.log(this.shares)
}
export function spliceAddress ({ commit }) {
  // const v = 0
  commit('spliceAddress')
}
export function spliceKey ({ commit }) {
  commit('spliceKey')
}
export function spliceDict ({ commit }) {
  commit('spliceDict')
}
export function spliceUid ({ commit }) {
  commit('spliceUid')
}
export function changeBchAmount ({ commit }, amount) {
  commit('NEW_AMOUNT', amount)
}
export function shareDict ({ commit }, share) {
  share = ''
  commit('shareDict', share)
  // this.state.gift.giftingGift[share] = 'this.state.gift.aShare'
}
// test 9 23 2022
export function genPrivKey ({ commit }, key) {
  commit('GENPRIVKEY', key)
}
export function genCashAdd ({ commit }, key) {
  commit('GENCASHADD', key)
}
export function genShares ({ commit }, key) {
  commit('GENSHARES', key)
}
export function recoverSec ({ commit }, key) {
  commit('RECOVERSEC', key)
}
export function storeGift ({ commit }, id, shares) {
  // state.genGift[id] = value
  commit('storeGift', id, shares)
}
