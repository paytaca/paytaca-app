import Watchtower from 'watchtower-cash-js'
import BCHJS from '@psf/bch-js'
import sha256 from 'js-sha256'

const bchjs = new BCHJS()

export class BchWallet {
  constructor (projectId, mnemonic, path) {
    this.mnemonic = mnemonic
    this.derivationPath = path
    this.watchtower = new Watchtower()
    this.projectId = projectId
    this.walletHash = this.getWalletHash()
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
    const childNode = masterHDNode.derivePath(this.derivationPath + '/' + index)
    return childNode
  }

  async getXPubKey () {
    const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    const childNode = bchjs.HDNode.derivePath(masterHDNode, this.derivationPath)
    return bchjs.HDNode.toXPub(childNode)
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
    const result = await this.watchtower.subscribe(data)
    if (result.success) {
      return address
    } else {
      return null
    }
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
    const request = await this.watchtower.Wallet.getHistory({ walletHash })
    return request
  }

  async sendBch (amount, recipient) {
    console.log(`Sending ${amount} BCH to ${recipient}`)
    const data = {
      sender: {
        walletHash: this.walletHash,
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      recipients: [
        {
          address: recipient,
          amount: amount
        }
      ],
      wallet: {
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      broadcast: true
    }
    const result = await this.watchtower.BCH.send(data)
    return result
  }
}

export default BchWallet
