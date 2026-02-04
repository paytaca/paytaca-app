import Watchtower from 'watchtower-cash-js'
import BCHJS from '@psf/bch-js'
import sha256 from 'js-sha256'
import { decodeTransaction, hexToBin, lockingBytecodeToCashAddress, binToHex } from '@bitauth/libauth'
import { getWatchtowerApiUrl, convertCashAddress } from './chipnet'
import { convertIpfsUrl, getBcmrBackend } from './cashtokens'
import { isTokenAddress } from '../utils/address-utils'

const bchjs = new BCHJS()


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

  getWalletHash (derivationPath = '') {
    let __derivationPath = derivationPath
    if (derivationPath === '') __derivationPath = this.derivationPath
    
    const mnemonicHash = sha256(this.mnemonic)
    const derivationPathHash = sha256(__derivationPath)
    const walletHash = sha256(mnemonicHash + derivationPathHash)
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

  async getChildNode (index, derivationPath) {
    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(derivationPath)
    const receivingAddressNode = childNode.derivePath('0/' + index)
    const changeAddressNode = childNode.derivePath('1/' + index)
    return { receivingAddressNode, changeAddressNode }
  }

  async getAddressSetAt(index) {
    const { receivingAddressNode, changeAddressNode } = await this.getChildNode(index, this.derivationPath)

    let receivingAddress = bchjs.HDNode.toCashAddress(receivingAddressNode)
    let changeAddress = bchjs.HDNode.toCashAddress(changeAddressNode)

    if (this.isChipnet) {
      receivingAddress = convertCashAddress(receivingAddress, this.isChipnet, false)
      changeAddress = convertCashAddress(changeAddress, this.isChipnet, false)
    }

    return {
      receiving: receivingAddress,
      change: changeAddress
    }
  }

  async getNewAddressSet (index) {
    const addresses = await this.getAddressSetAt(index)
    const addressSet = { receiving: addresses.receiving, change: addresses.change }

    const data = {
      addresses: addressSet,
      projectId: this.projectId,
      walletHash: this.walletHash,
      addressIndex: index
    }
    const result = await this.watchtower.subscribe(data)
    if (result.success) {
      return {
        addresses: addressSet
      }
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
   * @param {Object} opts
   * @param {String} [opts.category]
   * @param {Boolean} [opts.nft]
   */
  async getUtxos(opts) {
    const params = {}
    let url = `utxo/wallet/${this.walletHash}/`
    if (opts?.category) {
      url += opts?.category + '/'
      params.is_cashtoken = true
      params.is_cashtoken_nft = Boolean(opts?.nft)
    }

    const response = await this.watchtower.BCH._api.get(url, { params })
    if (!Array.isArray(response.data?.utxos)) return Promise.reject({ response })

    return response.data?.utxos
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

  async getPrivateKey (addressPath, derivationPath = '', useChildNode = false, index = 0) {
    let __derivationPath = derivationPath
    if (derivationPath === '') __derivationPath = this.derivationPath 

    if (useChildNode) {
      const childNode = await this.getChildNode(index, __derivationPath)
      return {
        receiving: bchjs.HDNode.toWIF(childNode.receivingAddressNode).toString('hex'),
        change: bchjs.HDNode.toWIF(childNode.changeAddressNode).toString('hex')
      }
    }

    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(__derivationPath + '/' + String(addressPath))
    return bchjs.HDNode.toWIF(childNode)
  }

  async getPublicKey(addressPath, derivationPath = '', useChildNode = false, index = 0) {
    let __derivationPath = derivationPath
    if (derivationPath === '') __derivationPath = this.derivationPath

    if (useChildNode) {
      const childNode = await this.getChildNode(index, __derivationPath)
      return {
        receiving: bchjs.HDNode.toPublicKey(childNode.receivingAddressNode).toString('hex'),
        change: bchjs.HDNode.toPublicKey(childNode.changeAddressNode).toString('hex')
      }
    }

    const masterHDNode = await this._getMasterHDNode()
    const childNode = masterHDNode.derivePath(__derivationPath + '/' + String(addressPath))
    return bchjs.HDNode.toPublicKey(childNode).toString('hex')
  }

  async getBalance (tokenId = '', txid = '', index = 0) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getBalance({ walletHash, tokenId, txid, index })
    return request
  }

  async getTransactions ({page, recordType, tokenId, txSearchReference}) {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getHistory({ walletHash, tokenId, page, recordType, txSearchReference})
    return request
  }

  async getTokenDetails (tokenId) {
    const url = 'tokens/' + tokenId
    const response = await getBcmrBackend().get(url)
    const _metadata = response.data

    if (_metadata.error) {
      return null
    } else {
      let imageUrl
      if (_metadata.token.uris) {
        imageUrl = _metadata.token.uris?.icon || ''
      } else {
        imageUrl = _metadata.uris?.icon || ''
      }
      return {
        // purposely placed logo as first data here for dynamic display of details on add new asset component
        'logo': convertIpfsUrl(imageUrl),
        'id': 'ct/' + tokenId,
        'name': _metadata.name,
        // 'description': _metadata.description,
        'symbol': _metadata.token.symbol,
        'decimals': _metadata.token.decimals,
        'is_nft': _metadata.is_nft
      }
    } 
  }

  /**
   * Normalizes addresses for comparison by converting to cash address format
   * @param {string} address 
   * @returns {string}
   */
  _normalizeAddress (address) {
    try {
      // Try to convert to cash address if it's a legacy address
      if (address && !address.includes(':')) {
        // Legacy address, try to convert
        try {
          return bchjs.Address.toCashAddress(address)
        } catch (e) {
          return address.toLowerCase()
        }
      }
      return address.toLowerCase()
    } catch (e) {
      return address.toLowerCase()
    }
  }

  async _sendBch (changeAddress, token, recipients, broadcast = true, priceId, fiatAmounts = null, fiatCurrency = null) {
    const data = {
      sender: {
        walletHash: this.walletHash,
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      recipients,
      changeAddress,
      wallet: {
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      token,
      broadcast
    }
    if (priceId) {
      data.price_id = priceId
    }

    // If fiat amounts are provided, we need to build transaction without broadcasting,
    // decode it to map outputs to recipients, then broadcast with fiat amounts
    if (fiatAmounts && fiatAmounts.length > 0 && fiatCurrency && broadcast) {
      data.broadcast = false
      const result = await this.watchtower.BCH.send(data)
      
      if (!result?.success || !result?.transaction) {
        return result
      }

      // Decode transaction to map outputs to recipients
      try {
        const txHex = result.transaction
        const decoded = decodeTransaction(hexToBin(txHex))
        
        if (typeof decoded === 'string') {
          // Error decoding, fall back to normal broadcast without fiat amounts
          const broadcastData = { transaction: txHex }
          if (priceId) {
            broadcastData.price_id = priceId
          }
          const broadcastResponse = await this.watchtower.BCH._api.post('broadcast/', broadcastData)
          return {
            ...result,
            ...broadcastResponse.data
          }
        }

        const outputFiatAmounts = {}
        const normalizedChangeAddress = this._normalizeAddress(changeAddress)
        
        // Map recipients to their fiat amounts
        const recipientFiatMap = new Map()
        recipients.forEach((recipient, index) => {
          if (index < fiatAmounts.length && fiatAmounts[index]) {
            const normalizedRecipientAddr = this._normalizeAddress(recipient.address)
            recipientFiatMap.set(normalizedRecipientAddr, {
              fiatAmount: fiatAmounts[index],
              recipient: recipient.address,
              tokenAmount: token?.tokenId ? recipient.amount : undefined, // Use decimal amount for tokens
              tokenCategory: token?.tokenId
            })
          }
        })

        // Match outputs to recipients
        decoded.outputs.forEach((output, outputIndex) => {
          try {
            const outputAddress = lockingBytecodeToCashAddress(output.lockingBytecode)
            if (typeof outputAddress === 'string') {
              const normalizedOutputAddr = this._normalizeAddress(outputAddress)
              
              // Skip change outputs
              if (normalizedOutputAddr === normalizedChangeAddress) {
                return
              }

              const fiatData = recipientFiatMap.get(normalizedOutputAddr)
              if (fiatData) {
                const outputData = {
                  fiat_amount: String(fiatData.fiatAmount),
                  fiat_currency: fiatCurrency.toUpperCase(),
                  recipient: fiatData.recipient
                }

                // Include token information if this is a token transaction
                if (fiatData.tokenCategory) {
                  outputData.token_category = fiatData.tokenCategory
                  if (fiatData.tokenAmount !== undefined && fiatData.tokenAmount !== null) {
                    // Token amount is already in decimal format
                    outputData.token_amount = String(fiatData.tokenAmount)
                  }
                }

                outputFiatAmounts[String(outputIndex)] = outputData
              }
            }
          } catch (e) {
            // Skip outputs we can't decode
            console.warn('Could not decode output address:', e)
          }
        })

        // Broadcast with fiat amounts
        const broadcastData = { transaction: txHex }
        if (priceId) {
          broadcastData.price_id = priceId
        }
        if (Object.keys(outputFiatAmounts).length > 0) {
          broadcastData.output_fiat_amounts = outputFiatAmounts
        }
        
        const broadcastResponse = await this.watchtower.BCH._api.post('broadcast/', broadcastData)
        return {
          ...result,
          ...broadcastResponse.data
        }
      } catch (error) {
        console.error('Error processing fiat amounts:', error)
        // Fall back to normal broadcast
        const broadcastData = { transaction: result.transaction }
        if (priceId) {
          broadcastData.price_id = priceId
        }
        const broadcastResponse = await this.watchtower.BCH._api.post('broadcast/', broadcastData)
        return {
          ...result,
          ...broadcastResponse.data
        }
      }
    }

    const result = await this.watchtower.BCH.send(data)
    return result
  }

  /**
   * 
   * @param {Number|String} amount
   * @param {String} address
   * @param {String} changeAddress
   * @param {Object} token
   * @param {Number} tokenAmount
   * @param {Array} recipients
   * @param {String|Number} priceId - Optional price ID from BIP21 URI
   * @param {Array} fiatAmounts - Optional array of fiat amounts matching recipients order
   * @param {String} fiatCurrency - Optional fiat currency code (e.g., "PHP")
   */
  async sendBch (amount, address, changeAddress, token, tokenAmount, recipients = [], priceId, fiatAmounts = null, fiatCurrency = null) {
    const finalRecipients = []
    if (recipients.length > 0) {
      finalRecipients.push(...recipients)
    } else {
      finalRecipients.push({ address, amount, tokenAmount })
    }

    return this._sendBch(changeAddress, token, finalRecipients, true, priceId, fiatAmounts, fiatCurrency)
  }

  /**
   *
   * @param {Number|String} amount
   * @param {String} recipient
   * @param {String} changeAddress
   * @param {{ posId: Number, paymentTimestamp: Number }} posDevice
   */
  async sendBchToPOS(amount, recipient, changeAddress, posDevice, recipients = [], priceId) {
    const response = { success: false, txid: '', otp: '', otpTimestamp: -1, error: undefined }
    const finalRecipients = []
    if (recipients.length > 0) {
      finalRecipients.push(...recipients)
    } else {
      finalRecipients.push({ address: recipient, amount, tokenAmount: 0 })
    }

    const sendResponse = await this._sendBch(changeAddress, undefined, finalRecipients, false)

    if (!sendResponse?.success) {
      response.success = false
      response.error = sendResponse?.error || 'Error generating transaction'
      return response
    }
    if (sendResponse?.success && sendResponse?.txid && !sendResponse?.transaction) {
      response.txid = sendResponse?.txid
      return response
    }

    const broadcastData = {
      transaction: sendResponse.transaction,
      payment_timestamp: posDevice?.paymentTimestamp,
      pos_device: {
        receiving_address: recipient,
        posid: posDevice?.posId,
      }
    }
    if (priceId) {
      broadcastData.price_id = priceId
    }

    if (isNaN(parseInt(broadcastData?.pos_device?.posid))) {
      response.success = false
      response.error = 'Unable to resolve POS device info'
      return response
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
      response.errorObj = error
      const isValidErrorMessage = (msg) => typeof msg === 'string' && msg?.length < 250
      const validMessageOrUndefined = (msg) => isValidErrorMessage(msg) ? msg : undefined

      const data = error?.response?.data
      response.error = validMessageOrUndefined(data?.non_field_errors?.[0]) ||
                       validMessageOrUndefined(data?.[0]) || 
                       validMessageOrUndefined(data)

      if (!response.error && isValidErrorMessage(data?.transaction?.[0])) {
        const txError = data?.transaction?.[0]
        response.error = `Transaction error: ${txError}` 
      }
      if (!response.error && isValidErrorMessage(data?.payment_timestamp?.[0])) {
        const paymentTimestampError = data?.payment_timestamp?.[0]
        response.error = `Payment timestamp error: ${paymentTimestampError}` 
      }

      if(!response?.error) response.error = validMessageOrUndefined(error?.message)
      if (!response?.error) response.error = 'Unknown error occurred on sending transaction'
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
 * @param {Object} opts
 * @param {Number} opts.networkTimeDiff
 */
export function decodeBIP0021URI(paymentUri, opts) {
  const response = {
    address: '',
    amount: undefined,
    label: undefined,
    message: undefined,
    parameters: null,
  }
  const urlObject = new URL(paymentUri)
  if (!urlObject?.protocol || !urlObject?.pathname) {
    return
  }

  const fullAddress = `${urlObject.protocol}${urlObject.pathname}`
  const isTokenAddr = isTokenAddress(fullAddress)
  
  if (!isTokenAddr) {
    // only check if not token address, bchjs is not cashtoken aware?
    const isCashAddr = bchjs.Address.isCashAddress(urlObject.protocol + urlObject.pathname)
    if (!isCashAddr) {
      return
    }
  }

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
  if (searchParams.expires) {
    let now = Math.floor(Date.now() / 1000)
    if (opts?.networkTimeDiff) now += opts?.networkTimeDiff / 1000
    if (now >= Number(searchParams.expires)) throw new Error('PaymentRequestIsExpired')
  }

  response.parameters = searchParams

  return response
}

export async function getBalanceByAddress (address, verbose = false) {
  try {
    const result = await bchjs.Electrumx.balance(address)

    if (verbose) console.log(result)

    // The total balance is the sum of the confirmed and unconfirmed balances.
    const satBalance = Number(result.balance.confirmed) + Number(result.balance.unconfirmed)
    // Convert the satoshi balance to a BCH balance
    const bchBalance = bchjs.BitcoinCash.toBitcoinCash(satBalance)

    return bchBalance
  } catch (err) {
    console.error('Error in getBalanceByAddress: ', err)
    throw err
  }
}

export default BchWallet
