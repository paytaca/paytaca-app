import { BigNumber, ethers, utils } from 'ethers'

const sep20Abi = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address _owner) external view returns (uint256 balance)',
  'function owner() external view returns (address)',
  'function transfer(address _to, uint256 _value) external returns (bool success)',
  'function transferFrom(address _from, address _to, uint256 _value) external returns (bool success)',
  'function approve(address _spender, uint256 _value) external returns (bool success)',
  'function allowance(address _owner, address _spender) external view returns (uint256 remaining)',
  'function decreaseAllowance(address _spender, uint256 _delta) external returns (bool success)',

  'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
  'event Approval(address indexed _owner, address indexed _spender, uint256 _value)',
]

export function getProvider(test=false) {
  const rpcUrls = {
    test: 'http://35.220.203.194:8545/',
    main: 'https://smartbch.fountainhead.cash/mainnet',
  }

  return new ethers.providers.JsonRpcBatchProvider(test ? rpcUrls.test : rpcUrls.main);
}

export function getSep20Contract(contractAddress, test=false) {
  if (!utils.isAddress(contractAddress)) return

  return new ethers.Contract(
    contractAddress,
    sep20Abi,
    getProvider(test),
  )
}

export class SmartBchWallet {
  static TX_INCOMING = 'incoming'
  static TX_OUTGOING = 'outgoing'

  constructor (projectId, mnemonic, path, test=true) {
    this.TX_INCOMING = 'incoming'
    this.TX_OUTGOING = 'outgoing'
  
    this.projectId = projectId
    this._testnet = test

    this.provider = getProvider(this._testnet)
    this._wallet = ethers.Wallet.fromMnemonic(mnemonic, path).connect(this.provider)
  }

  async getBalance() {
    const balance = await this._wallet.getBalance()
    return utils.formatEther(balance)
  }

  async getSep20TokenBalance(contractAddress) {
    if (!utils.isAddress(contractAddress)) return 0
    const tokenContract = getSep20Contract(contractAddress, this._testnet)
    const balance = await tokenContract.balanceOf(this._wallet.address)
    return utils.formatEther(balance)
  }

  async getTransactions({ type= null, before= 'latest', after= '0x0', limit= 10, includeTimestamp=false }) {
    let method = 'sbch_queryTxByAddr'
    if (type === this.TX_INCOMING) method = 'sbch_queryTxByDst'
    else if(type === this.TX_OUTGOING) method = 'sbch_queryTxBySrc'

    const txs = await this._wallet.provider.send(
      method,
      [
        this._wallet.address,
        before,
        after,
        '0x' + limit.toString(16),
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

          _raw: tx,          
        }
      })

    if (includeTimestamp) {
      // Timestamp is not returned by default since it can get costly (about 1.5kB on each tx)
      // Promise.all waits all promise to resolve before moving on
      await Promise.all(
        // Returns list of promise, each run asynchronously to fetch their own timestamps from block number
        parsedTxs.map(tx => {
          if(!includeTimestamp) return Promise.resolve()
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
      transactions: parsedTxs,
    }
  }

  async _getSep20Transaction(contractAddress, { before='latest', after='0x0', limit= 10}) {
    if (!utils.isAddress(contractAddress)) return []

    const tokenContract = getSep20Contract(contractAddress, this._testnet)
    const eventFilter = tokenContract.filters.Transfer(this._wallet.address, this._wallet.address)

    const logs = await tokenContract.provider.send(
      'sbch_queryLogs',
      [
        tokenContract.address,
        eventFilter.topics,
        before,
        after,
        '0x' + limit.toString(16),
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

        amount: utils.formatEther(parsedLog.args._value),
        from: parsedLog.args._from,
        to: parsedLog.args._to,

        _raw: parsedLog,          
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
  async getSep20Transactions(contractAddress, { type= null, before= 'latest', after= '0x0', limit= 10, includeTimestamp=false }) {
    if (!utils.isAddress(contractAddress)) return {
      success: false,
      error: 'Invalid token address',
    }

    const tokenContract = getSep20Contract(contractAddress, this._testnet)
    const parsedTxs = []
    let pseudoBefore = before

    // need to check if after is a block number
    const afterBlock = /0x[0-9a-f]/i.test(after) ? BigNumber.from(after) : Infinity
    let limiterCtr = 0
    let limiter = limit
    while(limiterCtr < limiter) {
      const txs = await this._getSep20Transaction(tokenContract.address, {before: pseudoBefore, after, limit})
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
          if(!includeTimestamp) return Promise.resolve()
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
      transactions: parsedTxs,
    }
  }

  async sendBch(amount, recipientAddress) {
    if (!utils.isAddress(recipientAddress)) return {
      success: false,
      error: 'Invalid recipient address',
    }

    const parsedAmount = utils.parseEther(amount)
    try {
      const tx = await this._wallet.sendTransaction({
        to: recipientAddress,
        value: parsedAmount,
      })
      return {
        success: true,
        transaction: tx,
      }
    } catch (e) {
      return {
        success: false,
        error: e.reason,
      }
    }
  }

  async sendSep20Token(contractAddress, amount, recipientAddress) {
    if (!utils.isAddress(recipientAddress)) return {
      success: false,
      error: 'Invalid recipient address',
    }

    if (!utils.isAddress(contractAddress)) return {
      success: false,
      error: 'Invalid token address',
    }

    const parsedAmount = utils.parseEther(amount)
    const tokenContract = getSep20Contract(contractAddress, this._testnet)
    const contractWithSigner = tokenContract.connect(this._wallet)
    try {
      const tx = await contractWithSigner.transfer(recipientAddress, parsedAmount)
      const minedTx = await tx.wait();
      return {
        success: true,
        transaction: minedTx,
      }
    } catch(e) {
      return {
        success: false,
        error: e.reason,
      }
    }
  }

  async getTxReceipt (txHash) {
    return await this.provider.send(
      'sbch_getTransactionReceipt',
      [txHash]
    )
  }

  async getSep20ContractDetails(contractAddress) {    
    if (!utils.isAddress(contractAddress)) return {
      success: false,
      error: 'Invalid token address',
    }
    const tokenContract = getSep20Contract(contractAddress, this._testnet)
    
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();

    return {
      success: true,
      token: {
        address: tokenContract.address,
        name: tokenName,
        symbol: tokenSymbol,
      }
    }
  }
}


export async function watchTransactions(address, {type=null, tokensOnly=false, contractAddresses=[], test=true}, callback) {
  if (!utils.isAddress(address)) return

  const contracts = !Array.isArray(contractAddresses) ? [] : contractAddresses.map(contractAddress => getSep20Contract(contractAddress, test))
  const cancelWatchFunctions = []
  const tokensWatched = []
  await Promise.all(
    contracts.map(async (contract) => {
      const receiveFilter = contract.filters.Transfer(null, address);
      const sendFilter = contract.filters.Transfer(address);
  
      const tokenName = await contract.name();
      const tokenSymbol = await contract.symbol();
      let eventFilter = [receiveFilter, sendFilter]
      if (type === 'incoming') eventFilter = receiveFilter
      if (type === 'outgoing') eventFilter = sendFilter
      const eventCallback = (...args) => {
        const tx = args[args.length-1]
        callback({
          tx: {
            hash: tx.transactionHash,
            to: tx.args._to,
            from: tx.args._from,
            value: tx.args._value,
            amount: utils.formatEther(tx.args._value),
            _raw: tx,
          },
          token: {
            address: contract.address,
            name: tokenName,
            symbol: tokenSymbol,
          }
        })
      }
      
      contract.on(eventFilter, eventCallback)
      tokensWatched.push({
        address: contract.address,
        name: tokenName,
        symbol: tokenSymbol,
      })

      cancelWatchFunctions.push(function () {
        contract.removeListener(eventFilter, eventCallback)
      })
    })
  )
  
  if (!tokensOnly) {
    const provider = getProvider(test)
    const event = 'block'
    const eventCallback = async (blockNumber) => {
      const block = await provider.getBlockWithTransactions(blockNumber);
      for (const tx of block.transactions) {
        const incoming = String(tx.to).toLowerCase() === address.toLowerCase()
        const outgoing = String(tx.from).toLowerCase() === address.toLowerCase()
        let emit = incoming || outgoing
        if (type === 'incoming') emit = incoming
        if (type === 'outgoing') emit = outgoing

        if (emit) {
          callback({
            tx: {
              hash: tx.hash,
              to: tx.to,
              from: tx.from,
              value: tx.value,
              amount: utils.formatEther(tx.value),
              _raw: tx,
            },
          })
        }
      }
    }
    provider.on(event, eventCallback)
    cancelWatchFunctions.push(function () {
      provider.removeListener(event, eventCallback)
    })
  }

  return {
    tokens: tokensWatched,
    stop: () => {
      cancelWatchFunctions.forEach(stopFunc => stopFunc())
    }
  }
}