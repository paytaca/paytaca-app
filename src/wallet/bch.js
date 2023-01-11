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
    return {
      receiving: bchjs.HDNode.toCashAddress(receivingAddressNode),
      change: bchjs.HDNode.toCashAddress(changeAddressNode)
    }
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

  async getPublicKey(addressPath) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(this.derivationPath + '/' + String(addressPath))
    return bchjs.HDNode.toPublicKey(childNode).toString('hex')
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

  async _sendBch (amount, recipient, changeAddress, broadcast=true) {
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
      broadcast: Boolean(broadcast),
    }
    const result = await this.watchtower.BCH.send(data)
    console.log(result)
    return result
  }

  async sendBch(amount, recipient, changeAddress) {
    return this._sendBch(amount, recipient, changeAddress, true)
  }

  /**
   * 
   * @param {Number|String} amount 
   * @param {String} recipient 
   * @param {String} changeAddress 
   * @param {{ walletHash: String, posId: Number, paymentTimestamp: Number }} posDevice 
   */
  async sendBchToPOS(amount, recipient, changeAddress, posDevice) {
    const response = { success: false, txid: '', otp: '', otpTimestamp: -1, error: undefined }
    const sendResponse = await this._sendBch(amount, recipient, changeAddress, false)

    if (!sendResponse?.success) {
      response.success = false
      response.error = sendResponse?.error || 'Error generating transaction'
      return response
    }

    const broadcastData = {
      transaction: sendResponse.transaction,
      payment_timestamp: posDevice?.paymentTimestamp,
      pos_device: {
        wallet_hash: posDevice?.walletHash,
        posid: posDevice?.posId,
      }
    }

    try {
      const broadcastResponse = await this.watchtower.BCH._api.post(
        'paytacapos/broadcast/',
        broadcastData,
      )
      response.success = Boolean(broadcastResponse?.data?.success)
      response.txid = broadcastResponse?.data?.txid || ''
      response.otp = broadcastResponse?.data?.otp || ''
      response.otpTimestamp = broadcastResponse?.data?.otp_timestamp || -1
    } catch(error) {
      response.success = false
      if (typeof error?.response?.data === 'string') response.error = error.response.data
      else if(typeof error?.response?.data?.[0] === 'string') response.error = error.response.data[0]
      else if(error?.message) response.error = error.message

      response.errorObj = error
    }
    return response
  }

  async sendBchMultiple (recipients, changeAddress) {
    if (!Array.isArray(recipients) || !recipients.length) return Promise.reject({ error: 'Must have at least one recipient' })

    const data = {
      sender: {
        walletHash: this.walletHash,
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      recipients: recipients,
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

  async signMessage (message, lastAddressIndex) {
    const privateKey = await this.getPrivateKey('0/' + String(lastAddressIndex))
    return bchjs.BitcoinCash.signMessageWithPrivKey(
      privateKey,
      message
    )
  }

  async verifyMessage (address, signature, message) {
    return bchjs.BitcoinCash.verifyMessage(
      address,
      signature,
      message
    )
  }
}


/**
 * decoding a URI standard BIP 0021 used as bitcoin payment links
 * @param {String} uri 
 */
export function decodeBIP0021URI(paymentUri) {
  const response = {
    address: '',
    amount: undefined,
    label: undefined,
    message: undefined,
    parameters: null,
  }
  const urlObject = new URL(paymentUri)
  if (!urlObject?.protocol || !urlObject?.pathname) return

  if (!bchjs.Address.isCashAddress(urlObject.protocol + urlObject.pathname)) return

  response.address = urlObject.protocol + urlObject.pathname

  const searchParams = Object.fromEntries(urlObject.searchParams.entries())
  if (searchParams.amount) {
    response.amount = Number(searchParams.amount)
    delete searchParams.amount
  }
  if (searchParams.label) {
    response.label = searchParams.label
    delete searchParams.label
  }
  if (searchParams.message) {
    response.message = searchParams.message
    delete searchParams.message
  }

  response.parameters = searchParams

  return response
}

export default BchWallet
