import Watchtower from 'watchtower-cash-js'
import BCHJS from '@psf/bch-js'
import sha256 from 'js-sha256'
import { ethers } from 'ethers'


const bchjs = new BCHJS()

export class SmartBchWallet {
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

  async getNewAddress (index) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(this.derivationPath)
    const receivingAddressNode = childNode.derivePath('0/' + index)
    const publicKey = bchjs.HDNode.toPublicKey(receivingAddressNode)
    const address = ethers.utils.computeAddress(publicKey)
    const data = {
      address,
      projectId: this.projectId,
      walletHash: this.walletHash,
      addressIndex: index
    }
    return data
    // const result = await this.watchtower.subscribe(data)

    // if (result.success) {
    //   return address
    // } else {
    //   return null
    // }
  }

  async getPrivateKey (path) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(path)
    return bchjs.HDNode.toWIF(childNode)
  }

  async getBalance () {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash })
    return request
  }

  async getTransactions (page, recordType) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getHistory({ walletHash, page, recordType })
    return request
  }

  async sendBch (amount, recipient, changeAddress) {
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
      changeAddress: changeAddress,
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

export default SmartBchWallet
