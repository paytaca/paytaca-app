import { ECPair } from '@psf/bitcoincashjs-lib'
import { toHex } from 'hex-my-bytes'
// import { getMnemonic, Wallet } from '../../../wallet'
/*
export function someAction (context) {
}
*/
export function changeAmount ({ commit }) {
  console.log('changeAmount (action)')
  // let v
  const v = this.state.gift.amt
  commit('changeAmount', v)
}
export function retAmount ({ commit }) {
  const v = 0
  commit('retAmount', v)
}
export function generatePrivateKey ({ commit }) {
  // console.log('generatePrivateKey (action)')
  const v = ECPair.makeRandom()
  const vWif = v.toWIF()
  // console.log(vWif)
  commit('generatePrivateKey', vWif)
}
export function convertToCashAddress ({ commit }) {
  // console.log('convertToCashAddress (action)')
  const BCHJS = require('@psf/bch-js')
  const bchjs = new BCHJS()
  const pk = this.state.gift.privateKey
  const pair = bchjs.ECPair.fromWIF(pk)
  commit('convertToCashAddress', bchjs.ECPair.toCashAddress(pair))
}
export function splitSecret ({ commit }) {
  // console.log('splitSecret (action)')
  const pk = this.state.gift.privateKey
  const cashAdd = this.state.gift.cashAddress
  console.log(pk)
  console.log(cashAdd)
  const sss = require('shamirs-secret-sharing')
  const secret = Buffer.from(pk)
  // let stateShare = this.state.gift.share
  const stateShare = sss.split(secret, { shares: 3, threshold: 2 })
  this.shares = stateShare.map((share) => { return toHex(share) })
  // this.handleSubmit(this.cashAdd)
  // // this.qrCode()
  commit('splitSecret', this.shares)
  console.log(this.shares)
}
export function storeShare ({ commit }) {
  commit('storeShare', this.shares)
}
export function retAddress ({ commit }) {
  const v = this.state.zero
  commit('retAddress', v)
}
export function recoverSecret ({ commit }) {
  const sss = require('shamirs-secret-sharing')
  let recovery = this.state.gift.recover
  recovery = sss.combine([this.shares[0], this.shares[1]])
  console.log(recovery.toString())
  commit('recoverSecret', recovery)
}
export function handleSubmit ({ commit }) {
  const vm = this
  const address = this.state.gift.cashAddress
  vm.wallet.BCH.sendBch(vm.state.gift.amt, address).then(function (result, err) {
    if (result.success) {
      vm.state.gift.submit = result.txid
    } else {
      console.error(err)
    }
    commit('handleSubmit', vm.state.gift.submit)
  })
}
