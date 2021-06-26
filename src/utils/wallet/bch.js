const Watchtower = require('watchtower-cash-js')
const BCHJS = require('@psf/bch-js')
const sha256 = require('js-sha256')
const bchjs = new BCHJS()

class BchWallet {
  constructor (projectId, mnemonic, path) {
    this.mnemonic = mnemonic
    this.derivationPath = path
    this.watchtower = new Watchtower()
    this.projectId = projectId
  }

  getWalletHash () {
    const mnemonicHash = sha256(this.mnemonic)
    const derivationPath = sha256(this.derivationPath)
    const walletHash = sha256(mnemonicHash + derivationPath)
    return walletHash
  }

  async _getChildNode (index) {
    const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    const childNode = masterHDNode.derivePath(this.derivationPath + index)
    return childNode
  }

  async getAddress (index) {
    const childNode = await this._getChildNode(index)
    const address = bchjs.HDNode.toCashAddress(childNode)
    const data = {
      address: address,
      projectId: this.projectId,
      walletHash: this.walletHash,
      walletIndex: index
    }
    return this.watchtower.subscribe(data)
  }

  async getPrivateKey (index) {
    const childNode = await this._getChildNode(index)
    return bchjs.HDNode.toWIF(childNode)
  }

  async getBalance () {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash })
    return request
  }

  async getTransactions () {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getTransactions({ walletHash })
    return request
  }

  async sendBch () {}
}

module.exports = BchWallet
