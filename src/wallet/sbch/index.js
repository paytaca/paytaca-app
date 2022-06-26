import Watchtower from 'watchtower-cash-js'
import axios from 'axios'
import sha256 from 'js-sha256'
import * as Bip39 from 'bip39'
import { hdkey } from 'ethereumjs-wallet'
import { BigNumber, ethers, utils } from 'ethers'

import { getProvider, toChecksumAddress, getERC721Contract, getSep20Contract, decodeEIP681URI, watchTransactions } from './utils'

export { getProvider, toChecksumAddress, getERC721Contract, getSep20Contract, decodeEIP681URI, watchTransactions }

export class SmartBchWallet {
  static TX_INCOMING = 'incoming'
  static TX_OUTGOING = 'outgoing'

  constructor (projectId, mnemonic, path) {
    this.TX_INCOMING = 'incoming'
    this.TX_OUTGOING = 'outgoing'

    this._watchtowerApi = new WatchtowerSBCH(projectId)
    this.watchtower = new Watchtower()

    this.mnemonic = mnemonic
    this.projectId = projectId
    this.derivationPath = path
    this.walletHash = this.getWalletHash()

    this.provider = getProvider()

    // Single address for now
    // TODO: Add support for multiple addresses in the future

    // this._wallet = ethers.Wallet.fromMnemonic(mnemonic, addressPath).connect(this.provider)
    this.getOrInitWallet()
  }

  async initWallet () {
    // Changed from using ethers.Wallet.fromMnemonic for faster initialization time
    // https://stackoverflow.com/a/71065135
    const seed = await Bip39.mnemonicToSeed(this.mnemonic)
    const hdNode = hdkey.fromMasterSeed(seed)
    const node = hdNode.derivePath(this.derivationPath)
    const childNode = node.deriveChild(0)
    const childWallet = childNode.getWallet()
    this._wallet = new ethers.Wallet(childWallet.getPrivateKey().toString('hex')).connect(this.provider)
  }

  async getOrInitWallet () {
    if (!this._wallet) await this.initWallet()
    return this._wallet
  }

  async subscribeWallet () {
    await this.getOrInitWallet()
    const data = {
      address: this._wallet.address,
      projectId: this.projectId,
      walletHash: this.getWalletHash(),
      walletIndex: 0,
      addressIndex: 0
    }
    return await this.watchtower.subscribe(data)
  }

  getWalletHash () {
    const mnemonicHash = sha256(this.mnemonic)
    const derivationPath = sha256(this.derivationPath)
    const walletHash = sha256(mnemonicHash + derivationPath)
    return walletHash
  }

  async getBalance () {
    await this.getOrInitWallet()
    const balance = await this._wallet.getBalance()
    return utils.formatEther(balance)
  }

  async getSep20TokenBalance (contractAddress) {
    if (!utils.isAddress(contractAddress)) return 0
    const tokenContract = getSep20Contract(contractAddress)
    const balance = await tokenContract.balanceOf(this._wallet.address)
    const decimals = await tokenContract.decimals()
    return utils.formatUnits(balance, decimals)
  }

  async getTransactions ({ type = null, before = 'latest', after = '0x0', limit = 10, includeTimestamp = false }) {
    let method = 'sbch_queryTxByAddr'
    if (type === this.TX_INCOMING) method = 'sbch_queryTxByDst'
    else if (type === this.TX_OUTGOING) method = 'sbch_queryTxBySrc'

    const txs = await this._wallet.provider.send(
      method,
      [
        this._wallet.address,
        before,
        after,
        '0x' + limit.toString(16)
      ]
    )

    const parsedTxs = txs
      .map(tx => {
        const received = String(tx.to).toLowerCase() === this._wallet.address.toLowerCase()
        return {
          record_type: received ? this.TX_INCOMING : this.TX_OUTGOING,
          hash: tx.hash,
          block: BigNumber.from(tx.blockNumber).toNumber(),

          amount: utils.formatEther(BigNumber.from(tx.value)),
          from: tx.from,
          to: tx.to,

          gas: utils.formatEther(BigNumber.from(tx.gas)),

          _raw: tx
        }
      })

    if (includeTimestamp) {
      // Timestamp is not returned by default since it can get costly (about 1.5kB on each tx)
      // Promise.all waits all promise to resolve before moving on
      await Promise.all(
        // Returns list of promise, each run asynchronously to fetch their own timestamps from block number
        parsedTxs.map(tx => {
          if (!includeTimestamp) return Promise.resolve()
          if (!tx || !tx.block) return Promise.resolve()

          // With <ethers.providers.JsonRpcBatchProvider>, each call would be compiled in one request
          return this._wallet.provider.getBlock(tx.block)
            .then(block => {
              tx.date_created = BigNumber.from(block.timestamp).toNumber() * 1000
            })
            .finally(() => {
              return Promise.resolve()
            })
        })
      )
    }

    return {
      success: true,
      transactions: parsedTxs
    }
  }

  async _getSep20Transaction (contractAddress, { before = 'latest', after = '0x0', limit = 10 }) {
    if (!utils.isAddress(contractAddress)) return []

    const tokenContract = getSep20Contract(contractAddress)
    const decimals = await tokenContract.decimals()
    const eventFilter = tokenContract.filters.Transfer(this._wallet.address, this._wallet.address)

    const logs = await tokenContract.provider.send(
      'sbch_queryLogs',
      [
        tokenContract.address,
        eventFilter.topics,
        before,
        after,
        '0x' + limit.toString(16)
      ]
    )

    if (!Array.isArray(logs)) return []

    const parsedTxs = logs.map(log => {
      const parsedLog = tokenContract.interface.parseLog(log)
      const received = String(parsedLog.args._to).toLowerCase() === this._wallet.address.toLowerCase()
      return {
        record_type: received ? this.TX_INCOMING : this.TX_OUTGOING,
        hash: log.transactionHash,
        block: BigNumber.from(log.blockNumber).toNumber(),

        amount: utils.formatUnits(parsedLog.args._value, decimals),
        from: parsedLog.args._from,
        to: parsedLog.args._to,

        _raw: parsedLog
      }
    })

    return parsedTxs
  }

  /*
    It fetches using sbch_queryLogs since it allows a `limit` query filter.
      -sbch_queryLogs is unable to filter incoming/outgoing transfer events due to topics filter being position independent
      1. Set a new var `pseudoBefore` equal to `before` and new array `parsedTx`
      2. Query transfer events for the contract from block `after` to block `pseudoBefore` with `limit`
      3. Filter txs from step 2 based on `type`
      4. Add the filtered txs from step 3 to `parsedTx`
      4. If total filtered txs is less than `limit`, go back to step 2. But set `pseudoBefore` as the earliest block from the last txs response minus 1.
      5. Repeat until one of the conditions below is met:
        - txs returned from step 2 is zero.
        - total filtered txs is greater than or equal to the `limit` specified.
        - `pseudoBefore` is less than equal to `after`
        - Encountered empty filtered txs for an `limiter` number of time. (This condition is arbitrary, its just to prevent looping for forever)
    https://docs.smartbch.org/smartbch/developers-guide/jsonrpc#sbch_querylogs
  */
  async getSep20Transactions (contractAddress, { type = null, before = 'latest', after = '0x0', limit = 10, includeTimestamp = false }) {
    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    const tokenContract = getSep20Contract(contractAddress)
    const parsedTxs = []
    let pseudoBefore = before

    // need to check if after is a block number
    const afterBlock = /0x[0-9a-f]/i.test(after) ? BigNumber.from(after) : Infinity
    let limiterCtr = 0
    const limiter = limit
    while (limiterCtr < limiter) {
      const txs = await this._getSep20Transaction(tokenContract.address, { before: pseudoBefore, after, limit })
      const filteredTxs = txs.filter(tx => {
        if (type === this.TX_INCOMING) return this._wallet.address === tx.to
        if (type === this.TX_OUTGOING) return this._wallet.address === tx.from

        return parsedTxs.map(tx => tx.hash).indexOf(tx.hash) < 0
      })
      if (filteredTxs.length <= 0) limiterCtr++

      parsedTxs.push(...filteredTxs)

      if (parsedTxs.length >= limit) break
      if (!txs.length) break

      const earliestBlock = Math.min(...txs.map(tx => tx.block)) - 1
      if (earliestBlock <= afterBlock) break
      pseudoBefore = '0x' + earliestBlock.toString(16)
    }

    if (includeTimestamp) {
      // Timestamp is not returned by default since it can get costly (about 1.5kB on each tx)
      // Promise.all waits all promise to resolve before moving on
      await Promise.all(
        // Returns list of promise, each run asynchronously to fetch their own timestamps from block number
        parsedTxs.map(tx => {
          if (!includeTimestamp) return Promise.resolve()
          if (!tx || !tx.block) return Promise.resolve()

          // With <ethers.providers.JsonRpcBatchProvider>, each call would be compiled in one request
          return this._wallet.provider.getBlock(tx.block)
            .then(block => {
              tx.date_created = BigNumber.from(block.timestamp).toNumber() * 1000
            })
            .finally(() => {
              return Promise.resolve()
            })
        })
      )
    }

    return {
      success: true,
      // Causing new requests per transaction
      // token: {
      //   address: tokenContract.address,
      //   name: await tokenContract.name(),
      //   symbol: await tokenContract.symbol(),
      // },
      transactions: parsedTxs
    }
  }

  async sendBch (amount, recipientAddress) {
    return this.sendBchWithData(amount, recipientAddress)
  }

  async sendBchWithData (amount, recipientAddress, data = '') {
    if (!utils.isAddress(recipientAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address'
      }
    }

    if (data && !/0x[0-9a-f]+/i.test(data)) {
      return {
        success: false,
        error: 'Data must be a valid hex string'
      }
    }

    const parsedAmount = utils.parseEther(amount)
    const txParams = {
      data: data,
      to: recipientAddress,
      value: parsedAmount
    }

    try {
      const balance = await this._wallet.getBalance()
      const estGas = await this._wallet.estimateGas(txParams)
      const totalReq = estGas.add(parsedAmount)
      if (balance.lt(totalReq)) {
        // for future reference setting value to max allowed by balance
        // txParams.value = txParams.value.sub(estGas)
        return { success: false, error: 'Not enough balance for gas' }
      }
      const tx = await this._wallet.sendTransaction(txParams)
      return {
        success: true,
        transaction: tx
      }
    } catch (e) {
      if (e && e.message === 'insufficient-balance') {
        return { success: false, error: 'Not enough balance for gas' }
      }

      return {
        success: false,
        error: e.reason
      }
    }
  }

  async sendTransaction (txParams, wait = true) {
    try {
      const tx = await this._wallet.sendTransaction(txParams)
      if (wait) await tx.wait()

      return {
        success: true,
        transaction: tx
      }
    } catch (e) {
      if (e && e.message === 'insufficient-balance') {
        return { success: false, error: 'Not enough balance for gas' }
      }

      return {
        success: false,
        error: e.reason
      }
    }
  }

  async sendSep20Token (contractAddress, amount, recipientAddress) {
    if (!utils.isAddress(recipientAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address'
      }
    }

    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    const tokenContract = getSep20Contract(contractAddress)
    const decimals = await tokenContract.decimals()
    const parsedAmount = utils.parseUnits(amount, decimals)
    const contractWithSigner = tokenContract.connect(this._wallet)
    try {
      const tx = await contractWithSigner.transfer(recipientAddress, parsedAmount)
      const minedTx = await tx.wait()
      return {
        success: true,
        transaction: minedTx
      }
    } catch (e) {
      return {
        success: false,
        error: e.reason
      }
    }
  }

  async sendERC721Token (contractAddress, tokenId, recipientAddress) {
    if (!utils.isAddress(recipientAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address'
      }
    }

    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    const parsedTokenId = Number(tokenId)
    if (!Number.isSafeInteger(parsedTokenId)) {
      return {
        success: false,
        error: 'Invalid Token ID'
      }
    }
    const tokenContract = getERC721Contract(contractAddress)
    const address = await tokenContract.ownerOf(tokenId)
    if (address !== this._wallet.address) {
      return {
        success: false,
        error: 'Token is not owned by wallet address'
      }
    }

    const contractWithSigner = tokenContract.connect(this._wallet)
    try {
      const tx = await contractWithSigner.safeTransferFrom(this._wallet.address, recipientAddress, parsedTokenId)
      const minedTx = await tx.wait()
      return {
        success: true,
        transaction: minedTx
      }
    } catch (e) {
      return {
        success: false,
        error: e.reason
      }
    }
  }

  async getTxReceipt (txHash) {
    return await this.provider.send(
      'sbch_getTransactionReceipt',
      [txHash]
    )
  }

  async getSep20ContractDetails (contractAddress) {
    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }
    const tokenContract = getSep20Contract(contractAddress)

    const tokenName = await tokenContract.name()
    const tokenSymbol = await tokenContract.symbol()

    return {
      success: true,
      token: {
        address: tokenContract.address,
        name: tokenName,
        symbol: tokenSymbol
      }
    }
  }

  async getNFTMetadata (contractAddress, tokenID) {
    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    const contract = getERC721Contract(contractAddress)
    const uri = await contract.tokenURI(tokenID)
    let success = false
    let data = null
    let error
    try {
      const response = await axios.get(uri)
      success = true
      data = response.data
    } catch (err) {
      success = false
      error = err
    }

    return {
      success: success,
      id: tokenID,
      address: contract.address,
      url: uri,
      data: data,
      error: error
    }
  }

  async getOwnedNFTs (contractAddress, { limit = 10, offset = 0, includeMetadata = false }) {
    return this.getNFTs(
      contractAddress,
      {
        limit,
        offset,
        includeMetadata,
        address: this._wallet.address
      }
    )
  }

  /**
   * @dev Get's list of tokens for an erc721 token
   * @param {string}  contractAddress address of the smart contract
   * @param {number}  limit number of tokens to receive
   * @param {number}  offset index of token to start. See ERC721 enumerable
   * @param {string}  address if not empty, will to list tokens that are owned by the address
   * @param {bool}    includeMetadata flag to include metadata in response. See ERC721 metadata
   * @param {bool}    asyncMetadata flag to fetch the metadatta async. Only meaningful with `includeMetadata`
   * @param {func}    metadataCallback function to call when a token metadata is fetched. Recommended if `asyncMetadata` is set.
   *
   * - Metadata is not fetched by default as it can get costly
   * - Added fetching metadata asynchronously to allow partial response with less response time
   */
  async getNFTs (contractAddress, { limit = 10, offset = 0, includeMetadata = false, asyncMetadata = false, metadataCallback = () => {}, address = '' }) {
    if (!utils.isAddress(contractAddress)) {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    const contract = getERC721Contract(contractAddress)
    var balance
    if (address) balance = await contract.balanceOf(this._wallet.address)
    else balance = await contract.totalSupply()

    const startIndex = Math.min(offset, balance)
    const endIndex = Math.min(offset + limit, balance)

    const promises = []
    for (var i = startIndex; i < endIndex; i++) {
      if (address) promises.push(contract.tokenOfOwnerByIndex(this._wallet.address, i))
      else promises.push(contract.tokenByIndex(i))
    }

    const tokenIDs = await Promise.all(promises)
    const parsedTokens = tokenIDs.map(tokenID => {
      return {
        id: tokenID.toNumber(),
        contractAddress: contract.address
      }
    })

    if (includeMetadata) {
      const metadataPromises = Promise.all(parsedTokens.map(async (token, index) => {
        try {
          const { url, data } = await this.getNFTMetadata(contract.address, token.id)
          token.metadata_url = url
          token.metadata = data
          if (typeof metadataCallback === 'function') metadataCallback(token, index)
        } catch {}
        return Promise.resolve()
      }))

      if (!asyncMetadata) await metadataPromises
    }

    return {
      success: true,
      tokens: parsedTokens,
      pagination: {
        count: balance.toNumber(),
        limit: limit,
        offset: offset
      }
    }
  }
}

class WatchtowerSBCH {
  constructor (projectId) {
    this.TX_INCOMING = 'incoming'
    this.TX_OUTGOING = 'outgoing'

    this._watchtower = new Watchtower()
    this.projectId = projectId
  }

  async getTransactions (address, { type = null, before = 'latest', after = '0x0', limit = 10 }) {
    return this._getTransactions('bch', address, { type, before, after, limit })
  }

  async getSep20Transactions (contractAddress, address, { type = null, before = 'latest', after = '0x0', limit = 10 }) {
    if (!utils.isAddress(contractAddress) && contractAddress !== 'bch') {
      return {
        success: false,
        error: 'Invalid token address'
      }
    }

    return this._getTransactions(
      contractAddress,
      address,
      { type, before, after, limit }
    )
  }

  async _getTransactions (contractAddress, address, { type = null, before = 'latest', after = '0x0', limit = 10 }) {
    const queryParams = {
      offset: 0,
      limit: limit,
      tokens: toChecksumAddress(contractAddress),
      addresses: toChecksumAddress(address),
      record_type: undefined
    }

    if (type === this.TX_INCOMING) queryParams.record_type = this.TX_INCOMING
    else if (type === this.TX_OUTGOING) queryParams.record_type = this.TX_OUTGOING

    if (/0x[0-9a-f]/i.test(after)) {
      queryParams.after_block = BigNumber.from(after).toString()
    }

    if (/0x[0-9a-f]/i.test(before)) {
      queryParams.before_block = BigNumber.from(before).toString()
    }

    let unparsedTxs = []
    try {
      const response = await this._watchtower.Wallet._api('smartbch/transactions/transfers/', { params: queryParams })
      if (Array.isArray(response?.data?.results)) unparsedTxs = response?.data?.results
      else if (Array.isArray(response?.data)) unparsedTxs = response.data
    } catch (err) {
      return {
        success: false,
        error: err?.response?.detail
      }
    }

    const parsedTxs = unparsedTxs.map(tx => {
      let recordType = queryParams.record_type
      if (!recordType) {
        const received = String(tx.to_addr).toLowerCase() === String(address).toLowerCase()
        recordType = received ? this.TX_INCOMING : this.TX_OUTGOING
      }

      return {
        record_type: recordType,
        hash: tx.txid,
        block: BigNumber.from(tx.block_number).toNumber(),

        gas: tx.tx_fee,
        amount: tx.amount,
        from: tx.from_addr,
        to: tx.to_addr,
        date_created: new Date(tx.timestamp) * 1,

        _raw: tx
      }
    })

    return {
      success: true,
      transactions: parsedTxs
    }
  }
}
