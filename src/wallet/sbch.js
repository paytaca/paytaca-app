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

  async getSep20Transactions(contractAddress, { type= null, before= 'latest', after= '0x0', limit= 10, includeTimestamp=false }) {
    if (!utils.isAddress(contractAddress)) return {
      success: false,
      error: 'Invalid token address',
    }

    const tokenContract = getSep20Contract(contractAddress, this._testnet)

    let eventFilter = tokenContract.filters.Transfer(this._wallet.address, this._wallet.address)
    if (type === this.TX_INCOMING) {
      eventFilter = tokenContract.filters.Transfer(ethers.constants.AddressZero, this._wallet.address)
    } else if (type === this.TX_OUTGOING) {
      eventFilter = tokenContract.filters.Transfer(this._wallet.address)
    }

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

    const parsedTxs = logs.map(log => {
      const parsedLog = tokenContract.interface.parseLog(log)
      const received = String(parsedLog.args._to).toLowerCase() === this._wallet.address.toLowerCase()
      console.log(log)
      console.log(parsedLog)
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
}
