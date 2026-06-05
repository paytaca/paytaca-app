import Watchtower from 'watchtower-cash-js'
const BCHJS = require('@psf/bch-js')
const sha256 = require('js-sha256')
const bchjs = new BCHJS()
import axios from 'axios'
import { getWatchtowerApiUrl, convertCashAddress } from './chipnet'


export class SlpWallet {
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
    const addresses = {
      receiving: bchjs.HDNode.toSLPAddress(receivingAddressNode),
      change: bchjs.HDNode.toSLPAddress(changeAddressNode)
    }

    if (this.isChipnet) {
      const encodedReceivingAddress = convertCashAddress(addresses.receiving, this.isChipnet, false)
      const encodedChangeAddress = convertCashAddress(addresses.change, this.isChipnet, false)

      addresses.receiving = bchjs.SLP.Address.toSLPAddress(encodedReceivingAddress)
      addresses.change = bchjs.SLP.Address.toSLPAddress(encodedChangeAddress)
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

  /**
   * Discovers SLP addresses with transaction history using BIP44 gap-limit scanning.
   * Same logic as BchWallet.discoverAddresses but for SLP addresses.
   * Sends batches of addresses to the Watchtower `wallet/address-discover/` endpoint
   * which checks each address for transaction history.
   *
   * @param {Object} opts
   * @param {number} [opts.gapLimit=20] - Consecutive empty addresses before stopping a chain
   * @param {number} [opts.batchSize=50] - Addresses per batch API request
   * @param {number} [opts.maxScans=500] - Safety cap on total addresses to scan
   * @param {Function} [opts.onProgress] - Progress callback
   * @returns {Promise<Object>} Discovery result
   */
  async discoverAddresses(opts = {}) {
    const {
      gapLimit = 20,
      batchSize = 50,
      maxScans = 500,
      onProgress,
    } = opts

    const result = {
      success: false,
      discoveredReceiving: [],
      discoveredChange: [],
      highestReceivingIndex: -1,
      highestChangeIndex: -1,
      subscribed: 0,
      scanned: 0,
      error: null,
    }

    let receivingGapCount = 0
    let changeGapCount = 0
    let receivingDone = false
    let changeDone = false
    let currentIndex = 0
    let totalScanned = 0

    while (totalScanned < maxScans && !(receivingDone && changeDone)) {
      const batchEnd = Math.min(currentIndex + batchSize, maxScans)
      const addressSets = []

      for (let i = currentIndex; i < batchEnd; i++) {
        const addresses = await this.getAddressSetAt(i)
        addressSets.push({
          address_index: i,
          receiving: addresses.receiving,
          change: addresses.change,
        })
      }

      try {
        const apiResponse = await this.watchtower.BCH._api.post(
          'wallet/address-discover/',
          {
            address_sets: addressSets,
            wallet_hash: this.walletHash,
            project_id: this.projectId,
          }
        )

        const discoveryResults = apiResponse.data?.results || []

        for (const discovery of discoveryResults) {
          const idx = discovery.address_index

          if (!receivingDone) {
            const receivingHasHistory = discovery.receiving?.has_history === true
            if (receivingHasHistory) {
              receivingGapCount = 0
              result.discoveredReceiving.push({
                address_index: idx,
                address: discovery.receiving.address,
              })
              if (idx > result.highestReceivingIndex) {
                result.highestReceivingIndex = idx
              }
            } else {
              receivingGapCount++
              if (receivingGapCount >= gapLimit) {
                receivingDone = true
              }
            }
          }

          if (!changeDone) {
            const changeHasHistory = discovery.change?.has_history === true
            if (changeHasHistory) {
              changeGapCount = 0
              result.discoveredChange.push({
                address_index: idx,
                address: discovery.change.address,
              })
              if (idx > result.highestChangeIndex) {
                result.highestChangeIndex = idx
              }
            } else {
              changeGapCount++
              if (changeGapCount >= gapLimit) {
                changeDone = true
              }
            }
          }
        }

        totalScanned += addressSets.length
        currentIndex = batchEnd

        if (onProgress) {
          onProgress({
            scanned: totalScanned,
            discoveredReceiving: result.discoveredReceiving.length,
            discoveredChange: result.discoveredChange.length,
            phase: 'discovering',
          })
        }
      } catch (error) {
        result.error = error?.message || String(error)
        return result
      }
    }

    result.scanned = totalScanned

    const highestIndex = Math.max(result.highestReceivingIndex, result.highestChangeIndex)

    if (highestIndex >= 0) {
      const subscribeCount = highestIndex + 1
      if (onProgress) {
        onProgress({
          scanned: totalScanned,
          discoveredReceiving: result.discoveredReceiving.length,
          discoveredChange: result.discoveredChange.length,
          phase: 'subscribing',
        })
      }
      const subscribeResult = await this.scanAddresses({
        startIndex: 0,
        count: subscribeCount,
      })
      if (subscribeResult.success) {
        result.subscribed = subscribeCount
      }
    }

    result.success = true
    return result
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

  async getCollectibleGroups() {
    const walletHash = this.getWalletHash()
    const request = await this.watchtower.Wallet.getTokens({ walletHash, tokenType: 129 })
    return request
  }

  async getSlpTokenDetails (tokenId) {
    const url = `${this.baseUrl}/tokens/${tokenId}/`
    const request = await axios.get(url)
    return request.data
  }

  async sendSlp (tokenId, tokenType, feeFunder, changeAddresses, recipients) {
    let data = {
      sender: {
        walletHash: this.walletHash,
        mnemonic: this.mnemonic,
        derivationPath: this.derivationPath
      },
      recipients,
      tokenId: tokenId,
      feeFunder: feeFunder,
      changeAddresses: changeAddresses,
      broadcast: true
    }
    let result
    if (tokenType === 1) {
      result = await this.watchtower.SLP.Type1.send(data)
    } else if (tokenType === 65) {
      // currently can only send to one recipient
      delete data.tokenId
      delete data.recipients
      data = Object.assign(
        {
          childTokenId: tokenId,
          // get the address of the very first recipient
          recipient: recipients[0].address
        },
        data
      )
      result = await this.watchtower.SLP.NFT1.Child.send(data)
    }
    return result
  }
}

export default SlpWallet
