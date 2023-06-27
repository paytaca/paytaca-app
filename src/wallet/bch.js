import Watchtower from 'watchtower-cash-js'
import BCHJS from '@psf/bch-js'
import sha256 from 'js-sha256'
import * as openpgp from 'openpgp/lightweight'
import { getWatchtowerApiUrl, convertCashAddress } from './chipnet'
import { convertIpfsUrl } from './cashtokens'
import axios from 'axios'

const bchjs = new BCHJS()

import { setupCache } from 'axios-cache-interceptor';

const bcmrBackend = setupCache(axios.create({
  baseURL: 'https://bcmr.paytaca.com/api',
}))


export class BchWallet {
  constructor (projectId, mnemonic, path, isChipnet = false) {
    this.isChipnet = isChipnet
    this.mnemonic = mnemonic
    this.derivationPath = path
    this.watchtower = new Watchtower(isChipnet)
    this.projectId = projectId
    this.walletHash = this.getWalletHash()
    this.baseUrl = getWatchtowerApiUrl(isChipnet)
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
    let receivingAddress = bchjs.HDNode.toCashAddress(receivingAddressNode)
    let changeAddress = bchjs.HDNode.toCashAddress(changeAddressNode)

    // Generate a new PGP key
    const userID = receivingAddress.split(':')[1]
    const email = userID + '@bchmail.site'
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
      curve: 'p521',
      userIDs: [{ name: userID, email: email }]
    })

    const public_key_hash = sha256(publicKey)
    const signature = await this.signMessage(public_key_hash, index)
    const pgpInfo = {
      bch_address: receivingAddress,
      user_id: userID,
      email: email,
      public_key: Buffer.from(publicKey).toString('base64'),
      public_key_hash: public_key_hash,
      signature: Buffer.from(signature).toString('base64')
    }

    if (this.isChipnet) {
      receivingAddress = convertCashAddress(receivingAddress, this.isChipnet, false)
      changeAddress = convertCashAddress(changeAddress, this.isChipnet, false)
    }

    const pgpIdentity = {
      address: receivingAddress,
      userId: userID,
      email: email,
      publicKey: publicKey,
      privateKey: privateKey
    }
    return {
      receiving: receivingAddress,
      change: changeAddress,
      pgpInfo: pgpInfo,
      pgpIdentity: pgpIdentity
    }
  }

  async getNewAddressSet (index) {
    const addresses = await this.getAddressSetAt(index)
    const addressSet = { receiving: addresses.receiving, change: addresses.change }

    const data = {
      addresses: addressSet,
      projectId: this.projectId,
      walletHash: this.walletHash,
      addressIndex: index,
      chatIdentity: addresses.pgpInfo
    }
    const result = await this.watchtower.subscribe(data)
    if (result.success) {
      return { addresses: addressSet, pgpIdentity: addresses.pgpIdentity }
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

  async getBalance (tokenId = '', txid = '', index = 0) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash, tokenId, txid, index })
    return request
  }

  async getTransactions (page, recordType, tokenId = null) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getHistory({ walletHash, tokenId, page, recordType })
    return request
  }

  async getTokenDetails (tokenId) {
    const url = 'tokens/' + tokenId
    const response = await bcmrBackend.get(url)
    const _metadata = response.data

    if (_metadata.error) {
      return null
    } else {
      let imageUrl
      if (_metadata.token.uris) {
        imageUrl = _metadata.token.uris.icon || ''
      } else {
        imageUrl = _metadata.uris.icon || ''
      }
      return {
        // purposely placed logo as first data here for dynamic display of details on add new asset component
        'logo': convertIpfsUrl(imageUrl),
        'id': 'ct/' + tokenId,
        'name': _metadata.name,
        'description': _metadata.description,
        'symbol': _metadata.token.symbol,
        'decimals': _metadata.token.decimals,
      }
    } 
  }

  async _sendBch (amount, recipient, changeAddress, token, tokenAmount, broadcast=true) {
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
          amount: amount,
          tokenAmount: tokenAmount
        }
      ],
      changeAddress: changeAddress,
      wallet: {
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      token,
      broadcast: Boolean(broadcast),
    }
    const result = await this.watchtower.BCH.send(data)
    return result
  }

  async sendBch(amount, recipient, changeAddress, token, tokenAmount) {
    return this._sendBch(amount, recipient, changeAddress, token, tokenAmount, true)
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
