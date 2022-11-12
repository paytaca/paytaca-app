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

  /**
   * 
   * @param {Object} opts 
   * @param {Boolean} opts.with_tx
   * @param {Boolean} opts.exclude_pos
   * @param {Number} opts.posid
   */
   async getLastAddressIndex(opts) {
    const _params = {
      with_tx: opts?.with_tx || false,
      exclude_pos: opts?.exclude_pos || false,
      posid: opts?.posid || undefined,
    }
    const apiResponse = await this.watchtower.BCH._api.get(
      `last-address-index/wallet/${this.getWalletHash()}/`,
      { params: _params },
    )
    if (Number.isInteger(apiResponse?.data?.address?.address_index)) {
      return apiResponse.data.address.address_index
    }
  }

  async getAddressSetAt(index) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(this.derivationPath)
    const receivingAddressNode = childNode.derivePath('0/' + index)
    const changeAddressNode = childNode.derivePath('1/' + index)
    const addresses = {
      receiving: bchjs.HDNode.toSLPAddress(receivingAddressNode),
      change: bchjs.HDNode.toSLPAddress(changeAddressNode)
    }
    return addresses
  }

  async getNewAddressSet (index) {
    const addresses = await this.getAddressSetAt(index)
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

  /**
   * @param {Object} opts
   * @param {Boolean} opts.background
   */
   async scanUtxos(opts) {
    const queryParams = {}
    if (opts?.background) queryParams.background = true

    return this.watchtower.BCH._api.get(
      `utxo/wallet/${this.walletHash}/scan/`,
      { params: queryParams },
    )
  }

  /**
   * 
   * @param {Object} opts 
   * @param {Number} opts.startIndex
   * @param {Number} opts.count
   */
   async scanAddresses(opts) {
    const response = { success: false, error: '' }
    if(!Number.isSafeInteger(opts?.startIndex)) {
      response.success = false
      response.error = 'Invalid start index'
      return response
    }

    if(!Number.isSafeInteger(opts?.count)) {
      response.success = false
      response.error = 'Invalid count'
      return response
    }

    const startIndex = opts.startIndex
    const endIndex = opts.startIndex + opts.count
    const addressSets = []
    for (var addressIndex = startIndex; addressIndex < endIndex; addressIndex++) {
      const addresses = await this.getAddressSetAt(addressIndex)
      addressSets.push({ address_index: addressIndex, addresses: addresses })
    }

    const data = {
      address_sets: addressSets,
      wallet_hash: this.walletHash,
      project_id: this.projectId,
    }

    try {
      const apiResponse = await this.watchtower.BCH._api.post('wallet/address-scan/', data)
      response.success = true
      response.subscriptionResponses = apiResponse.data
    } catch(error) {
      response.success = false
      response.error = error
    }
    return response
  }

  async getPrivateKey (addressPath) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(this.derivationPath + '/' + String(addressPath))
    return bchjs.HDNode.toWIF(childNode)
  }

  async getBalance (tokenId) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash, tokenId })
    return request
  }

  async getTransactions (tokenId, page, recordType) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getHistory({ walletHash, tokenId, page, recordType })
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

  async sendSlp (amount, tokenId, tokenType, recipient, feeFunder, changeAddresses) {
    console.log(`Sending ${amount} of SLP token ${tokenId} to ${recipient}`)
    let data = {
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
      changeAddresses: changeAddresses,
      broadcast: true
    }
    let result
    if (tokenType === 1) {
      result = await this.watchtower.SLP.Type1.send(data)
    } else if (tokenType === 65) {
      delete data.tokenId
      delete data.recipients
      data = Object.assign(
        {
          childTokenId: tokenId,
          recipient: recipient
        },
        data
      )
      result = await this.watchtower.SLP.NFT1.Child.send(data)
    }
    return result
  }
}

export default SlpWallet
