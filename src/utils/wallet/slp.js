const Watchtower = require('watchtower-cash-js')
const BCHJS = require('@psf/bch-js')
const sha256 = require('js-sha256')
const bchjs = new BCHJS()
import axios from 'axios'

export class SlpWallet {
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

  async _getMasterHDNode () {
    const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    return masterHDNode
  }

  async getXPubKey () {
    const seedBuffer = await bchjs.Mnemonic.toSeed(this.mnemonic)
    const masterHDNode = bchjs.HDNode.fromSeed(seedBuffer)
    const childNode = masterHDNode.derivePath(this.derivationPath)
    return bchjs.HDNode.toXPub(childNode)
  }

  async getNewAddressSet (index) {
    const masterHDNode = await this._getMasterHDNode()
    const receivingAddressNode = masterHDNode.derivePath('0/' + index)
    const changeAddressNode = masterHDNode.derivePath('1/' + index)
    const addresses = {
      receiving: bchjs.HDNode.toCashAddress(receivingAddressNode),
      change: bchjs.HDNode.toCashAddress(changeAddressNode)
    }
    const data = {
      addresses,
      projectId: this.projectId,
      walletHash: this.walletHash,
      addressIndex: index
    }
    const result = await this.watchtower.subscribe(data)
    if (result.success) {
      return addresses
    } else {
      return null
    }
  }

  async getPrivateKey (path) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(path)
    return bchjs.HDNode.toWIF(childNode)
  }

  async getBalance (tokenId) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash, tokenId })
    return request
  }

  async getTransactions (tokenId) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getHistory({ walletHash, tokenId })
    return request
  }

  async getCollectibles () {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getTokens({ walletHash, tokenType: 65 })
    return request
  }

  async getSlpTokenDetails (tokenId) {
    const url = `https://watchtower.cash/api/tokens/${tokenId}/`
    const request = await axios.get(url)
    return request.data
  }

  async sendSlp (amount, tokenId, recipient, feeFunder) {
    console.log(`Sending ${amount} of SLP token ${tokenId} to ${recipient}`)
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
      tokenId: tokenId,
      feeFunder: feeFunder,
      broadcast: true
    }
    const result = await this.watchtower.SLP.Type1.send(data)
    return result
  }
}

export default SlpWallet
