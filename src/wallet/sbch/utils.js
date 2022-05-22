import axios from 'axios'
import { BigNumber, ethers, utils } from 'ethers'

import { sep20Abi, erc721Abi } from './abi'

export function getProvider (test = false) {
  const rpcUrls = {
    test: 'http://35.220.203.194:8545/',
    main: 'https://smartbch.fountainhead.cash/mainnet'
  }

  return new ethers.providers.JsonRpcBatchProvider(test ? rpcUrls.test : rpcUrls.main)
}

export function toChecksumAddress(address='') {
  if (!utils.isAddress(address)) return address

  return utils.getAddress(address)
}

export function getERC721Contract (contractAddress, test = false) {
  if (!utils.isAddress(contractAddress)) return

  return new ethers.Contract(
    contractAddress,
    erc721Abi,
    getProvider(test)
  )
}

export function getSep20Contract(contractAddress, test=false) {
  if (!utils.isAddress(contractAddress)) return

  return new ethers.Contract(
    contractAddress,
    sep20Abi,
    getProvider(test)
  )
}

export async function getERC721ContractDetails (contractAddress, test = false) {
  if (!utils.isAddress(contractAddress)) {
    return {
      success: false,
      error: 'Invalid token address'
    }
  }
  console.log('gettin details for:', contractAddress)
  const tokenContract = getERC721Contract(contractAddress, test)

  const tokenName = await tokenContract.name()
  console.log('got name:', tokenName)
  const tokenSymbol = await tokenContract.symbol()
  console.log('got symbol:', tokenSymbol)

  return {
    success: true,
    token: {
      address: tokenContract.address,
      name: tokenName,
      symbol: tokenSymbol
    }
  }
}


export async function getSep20ContractDetails (contractAddress, test) {
  const parsedAddress = utils.getAddress(String(contractAddress).toLowerCase())
  if (!utils.isAddress(parsedAddress)) {
    return {
      success: false,
      error: 'Invalid token address'
    }
  }

  const token = {
    address: parsedAddress,
    name: '',
    symbol: '',
    decimals: 0,
    image_url: '',
  }
  try {
    const { data } = await axios.get(`https://watchtower.cash/api/smartbch/token-contracts/${parsedAddress}/`)
    if (data && data.name && data.symbol) {
      token.name = data.name
      token.symbol = data.symbol
      token.decimals = data.decimals
      token.image_url = data.image_url
    }
  } catch {}

  if (!token.name && !token.symbol) {
    const tokenContract = getSep20Contract(parsedAddress, test)
    tokenContract // necessary for not getting reference error
    const data = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ])
    token.name = data[0]
    token.symbol = data[1]
    token.decimals = data[2]
  }

  return {
    success: true,
    token: token,
  }
}

export function decodeEIP681URI (uri, urnScheme) {
  // https://github.com/tokenkit/eip681

  urnScheme = urnScheme || 'ethereum'
  var exp = new RegExp('^' + urnScheme + ':(pay-)?(0x[\\w]{40})\\@?([\\w]*)*\\/?([\\w]*)*')
  var data = uri.match(exp)

  if (!data) {
    throw new Error('Invalid BIP681 URI: ' + uri)
  }

  var parameters = uri.split('?')
  parameters = parameters.length > 1 ? parameters[1] : ''

  var obj = {
    urnScheme: urnScheme,
    hasPayTag: !!data[1],
    target_address: data[2],
    chain_id: data[3],
    function_name: data[4],
    parsedValue: null,
    parameters: Object.fromEntries(new URLSearchParams(parameters).entries())
  }

  // 判断金额
  var key = obj.function_name === 'transfer' ? 'uint256' : 'value'

  if (obj.parameters[key]) {
    const decimalNotation = Number(obj.parameters[key]).toString(10)
    const parsed = utils.formatEther(decimalNotation)
    obj.parsedValue = parsed
  }
  return obj
}

export async function watchTransactions (address, { type = null, tokensOnly = false, contractAddresses = [], test = false }, callback) {
  if (!utils.isAddress(address)) return

  const contracts = !Array.isArray(contractAddresses) ? [] : contractAddresses.map(contractAddress => getSep20Contract(contractAddress, test))
  const cancelWatchFunctions = []
  const tokensWatched = []
  await Promise.all(
    contracts.map(async (contract) => {
      const receiveFilter = contract.filters.Transfer(null, address)
      const sendFilter = contract.filters.Transfer(address)

      const tokenName = await contract.name()
      const tokenSymbol = await contract.symbol()
      const decimals = await contract.decimals()
      let eventFilter = [receiveFilter, sendFilter]
      if (type === 'incoming') eventFilter = receiveFilter
      if (type === 'outgoing') eventFilter = sendFilter
      const eventCallback = (...args) => {
        const tx = args[args.length - 1]
        // eslint-disable-next-line standard/no-callback-literal
        callback({
          tx: {
            hash: tx.transactionHash,
            to: tx.args._to,
            from: tx.args._from,
            value: tx.args._value,
            amount: utils.formatUnits(tx.args._value, decimals),
            _raw: tx
          },
          token: {
            address: contract.address,
            name: tokenName,
            symbol: tokenSymbol
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
