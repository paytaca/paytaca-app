import { BchWallet } from './bch'
import { SlpWallet } from './slp'

class Wallet {
  constructor () {
    this.BCH1 = new BchWallet("m/44'/145'/0'/") // Main BCH wallet
    this.BCH2 = new BchWallet("m/44'/145'/1'/") // Fee funder BCH wallet
    this.SLP = new SlpWallet("m/44'/245'/0'/") // SLP wallet
  }

  async generateMnemonic () {
    const mnemonic = this.bchjs.Mnemonic.generate(128)
    return mnemonic
  }
}

module.exports = Wallet
