import { BigNumber, ethers, utils } from 'ethers'
import { getProvider, getSep20Contract } from '../sbch/utils'
import smartswapAbi from './abi'

export { BigNumber }


// Token address is from TangoSwap
const contract = new ethers.Contract(
  // "0x3718e9c405d0bc779870355c34fb5624196a1caa",
  "0xEd2E356C00A555DDdd7663BDA822C6acB34Ce614",
  smartswapAbi,
  getProvider(false)
)
const ROUTE_PARTS = 10


/**
 * Parse a token value from currency to BigNumber, e.g. 1 BCH -> BigNumber(1 * 10^18)
 * - removes excess floating points to safely convert to BigNumber
 * @param {Number} value value to convert
 * @param {Number} decimals number of decimals to shift when converting
*/
export function currencyToBigNumber(value, decimals=0) {
  if (decimals < 0) decimals = 0

  // Removes the excess decimals since ethers.BigNumber does not handle floating point
  const trimmedValue = value - value % (10 ** -decimals)
  return utils.parseUnits(String(trimmedValue), decimals)
}

/**
 * Parse a token value from BigNumber to a currency, e.g. BigNumber(1 * 10^18) -> 1 BCH
 * @param {ethers.BigNumber} value value to convert
 * @param {Number} decimals number of decimals to shift when converting
 */
export function bigNumberToCurrency(value, decimals=0) {
  if (decimals < 0) decimals = 0

  return Number(utils.formatUnits(value, decimals))
}


/**
 * 
 * @param {String} sourceTokenAddress SEP20 token contract address
 * @param {String} destTokenAddress SEP20 token contract address
 * @param {Number|String} amount can be number, number as string, or hex string
 * @returns {{ amount: ethers.BigNumber, gasAmount: ethers.BigNumber }}
 */
export async function getExpectedReturnWithGas(sourceTokenAddress, destTokenAddress, amount) {
  const parsedAmount = BigNumber.from(amount)
  const response = await contract.getExpectedReturnWithGas(sourceTokenAddress, destTokenAddress, parsedAmount, ROUTE_PARTS, 0, 0)
  return {
    amount: response.returnAmount,
    gasAmount: response.gasAmount,
    distribution: response.distribution,
  }
}

/**
 * 
 * @param {String} sourceTokenAddress SEP20 token contract address
 * @param {String} walletAddress 
 */
export async function hasApprovedSmartswap(sourceTokenAddress, walletAddress) {
  const tokenContract = getSep20Contract(sourceTokenAddress, false)
  if (!tokenContract) return false

  const eventFilter = tokenContract.filters.Approval(walletAddress, contract.address)
  const logs = await tokenContract.provider.send(
    'sbch_queryLogs',
    [
      tokenContract.address,
      eventFilter.topics,
      'latest',
      '0x0',
      '0x1',
    ]
  )
  return Array.isArray(logs) && logs.length > 0
}

/**
 * 
 * @param {String} sourceTokenAddress SEP20 token contract address
 * @param {ethers.Signer} signer 
 * @returns {{ success:Boolean, error:String|undefined, transaction: ethers.providers.TransactionReceipt }}
*/
export async function approveTokenOnSmartswap(sourceTokenAddress, signer) {
  const tokenContract = getSep20Contract(sourceTokenAddress, false)
  if (!tokenContract) return {
    success: false,
    error: 'Invalid token address',
  }
  const contractWithSigner = tokenContract.connect(signer)
  try {
    const tx = await contractWithSigner.approve(
      contract.address,
      BigNumber.from('0x' + 'f'.repeat(64)), // hex for 2 ^ 256
    )
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

/**
 * Returns balance of token addresses in raw units
 * doesn't provide & convert balances to their corresponding decimals
 * @param {String[]} tokenAddresses 
 * @param {String} walletAddress 
 * @param {Map<String, ethers.BigNumber>}
 */
export async function batchFetchBalance(tokenAddresses, walletAddress) {
  if (!utils.isAddress(walletAddress)) return {}

  const addresses = tokenAddresses
    .map(contractAddress => {
      const parsedAddress = utils.getAddress(String(contractAddress).toLowerCase())
      if (!utils.isAddress(parsedAddress)) return
      return parsedAddress
    }) // parse addresses
    .filter(Boolean) // filter invalid addresses
    .filter((e, i, s) => s.indexOf(e) === i) // remove duplicates

  const provider = getProvider(false)
  const balances = await Promise.all(
    addresses.map(tokenAddress => {
      return provider.send(
        'eth_call',
        [{ data: `0x70a08231000000000000000000000000${walletAddress.replace('0x', '')}`, to: tokenAddress }, 'latest']
      ).then(balanceHex => {
        return { address: tokenAddress, balance: BigNumber.from(balanceHex) }
      }).catch(() => {
        // need to force resolve some tokens to allow to continue for tokens that succeeded
        return Promise.resolve()
      })
    })
  )

  const balanceMap = {}
  balances.forEach(balanceInfo => {
    if (!balanceInfo) return
    balanceMap[balanceInfo.address.toLowerCase()] = balanceInfo.balance
  })

  return balanceMap
}

/**
 * Returns an unsigned tx for the swap
 * @param {Object} swapInfo
 * @param {String} swapInfo.sourceTokenAddress contract address of token to swap from
 * @param {String} swapInfo.destTokenAddress contract address of token to swap to
 * @param {Number|String|ethers.BigNumber} swapInfo.amount can be number, number as string, or hex string
 * @param {Number|String|ethers.BigNumber} swapInfo.minReturn can be number, number as string, or hex string
 * @param {ethers.BigNumber[]} swapInfo.distribution can be number, number as string, or hex string
 * @param {Number|String|ethers.BigNumber} swapInfo.flags can be number, number as string, or hex string
 * @param {Number|String|ethers.BigNumber} swapInfo.deadline can be number, number as string, or hex string
 * @param {Number|String|ethers.BigNumber} swapInfo.feePercent can be number, number as string, or hex string
*/
export async function getSwapDetails({sourceTokenAddress, destTokenAddress, amount, minReturn=0, distribution=[], flags=0, deadline=0, feePercent=0}) {
  const data = {
    sourceTokenAddress,
    destTokenAddress,
    amount: BigNumber.from(amount),
    minReturn: BigNumber.from(minReturn),
    distribution: [],
    flags: BigNumber.from(flags),
    deadline: BigNumber.from(deadline),
    feePercent: BigNumber.from(feePercent),
    overrides: {},
  }

  if (Array.isArray(distribution)) data.distribution = distribution
  if (data.sourceTokenAddress === '0x0000000000000000000000000000000000000000') data.overrides.value = data.amount

  return contract.populateTransaction.swap(
    data.sourceTokenAddress,
    data.destTokenAddress,
    data.amount,
    data.minReturn,
    data.distribution,
    data.flags,
    data.deadline,
    data.feePercent,
    data.overrides,
  )
}

/**
 * Decodes a hex string of swap tx data
 * @param {String} dataHex 
 * @returns {{ fromToken: String, destToken: String, amount: ethers.BigNumber, minReturn: ethers.BigNumber, distribution: ethers.BigNumber[], flags: ethers.BigNumber, deadline: ethers.BigNumber, feePercent: ethers.BigNumber }}
*/
export function decodeSwapHexData(dataHex) {
  const swapAbi = contract.interface.fragments.find(fragment => fragment.name === 'swap' && fragment.type === 'function')
  const data = contract.interface.decodeFunctionData(swapAbi, dataHex)
  return {
    fromToken: data.fromToken,
    destToken: data.destToken,
    amount: data.amount,
    minReturn: data.minReturn,
    distribution: data.distribution,
    flags: data.flags,
    deadline: data.deadline,
    feePercent: data.feePercent,
  }
}


/**
 * Parses SmartSwap distribution to human readable route. Taken from TangoSwap's SmartSwap interface code
 * @param {ethers.BigNumber[]} distribution 
 * @param {Number} parts 
 * @returns {{ steps:Number, grouped:Map<String,{percentage:Number, exhange:String, currency:String}> }}
 * @see {@link https://github.com/tangoswap-cash/tangoswap-interface/blob/v3.0.0/src/features/exchange-v1/swap/SmartSwapRouting.tsx}
 */
export function parseDistribution(distribution, parts=ROUTE_PARTS) {
  const swapOptions = [
    {exchange: "1BCH", currency: "DIRECT_SWAP"},
    {exchange: "1BCH", currency: "BCH"},
    {exchange: "1BCH", currency: "flexUSD"},
    {exchange: "BenSwap", currency: "DIRECT_SWAP"},
    {exchange: "BenSwap", currency: "BCH"},
    {exchange: "BenSwap", currency: "flexUSD"},
    {exchange: "MistSwap", currency: "DIRECT_SWAP"},
    {exchange: "MistSwap", currency: "BCH"},
    {exchange: "MistSwap", currency: "flexUSD"},
    {exchange: "CowSwap", currency: "DIRECT_SWAP"},
    {exchange: "CowSwap", currency: "BCH"},
    {exchange: "CowSwap", currency: "flexUSD"},
    {exchange: "TangoSwap", currency: "DIRECT_SWAP"},
    {exchange: "TangoSwap", currency: "BCH"},
    {exchange: "TangoSwap", currency: "flexUSD"},
    {exchange: "Tropical", currency: "DIRECT_SWAP"},
    {exchange: "Tropical", currency: "BCH"},
    {exchange: "Tropical", currency: "flexUSD"},
    {exchange: "EmberSwap", currency: "DIRECT_SWAP"},
    {exchange: "EmberSwap", currency: "BCH"},
    {exchange: "EmberSwap", currency: "flexUSD"},

    {exchange: "1BCH", currency: "TANGO"},
    {exchange: "BenSwap", currency: "TANGO"},
    {exchange: "MistSwap", currency: "TANGO"},
    {exchange: "CowSwap", currency: "TANGO"},
    {exchange: "TangoSwap", currency: "TANGO"},
    {exchange: "Tropical", currency: "TANGO"},
    {exchange: "EmberSwap", currency: "TANGO"},

    {exchange: "LawSwap", currency: "DIRECT_SWAP"},
    {exchange: "LawSwap", currency: "BCH"},
    {exchange: "LawSwap", currency: "flexUSD"},
    {exchange: "LawSwap", currency: "TANGO"},

    {exchange: "KoingFu", currency: "DIRECT_SWAP"},
    {exchange: "KoingFu", currency: "BCH"},
    {exchange: "KoingFu", currency: "flexUSD"},
    {exchange: "KoingFu", currency: "TANGO"},
  ]

  const returnData = {
    steps: 0,
    grouped: {},
  }

  distribution.forEach((value, index) => {
    if(value.toString() !== "0") {
      const route = {percentage: parseInt(value) * 100 / parts, ...swapOptions[index] }
      returnData.steps += 1
      if (Array.isArray(returnData.grouped[route.currency])) {
        returnData.grouped[route.currency].push(route)
      } else {
        returnData.grouped[route.currency] = [ route ]
      }
    }
  })

  return returnData
}
