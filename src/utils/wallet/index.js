import { SlpWallet } from './slp'
import { BchWallet } from './bch'

const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()

const projectId = 'd9d471d0-9f52-4d5b-8761-e71254f3720f'

export class Wallet {
  constructor (mnemonic) {
    this.BCH = new BchWallet(projectId, mnemonic, "m/44'/145'/0'") // Main BCH wallet
    this.BCHF = new BchWallet(projectId, mnemonic, "m/44'/146'/0'") // Fee funder BCH wallet
    this.SLP = new SlpWallet(projectId, mnemonic, "m/44'/245'/0'") // SLP wallet
  }
}

export function generateMnemonic () {
  const mnemonic = bchjs.Mnemonic.generate(128)
  return mnemonic
}

export default {
  Wallet,
  generateMnemonic
}
