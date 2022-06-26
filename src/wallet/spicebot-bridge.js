import axios from 'axios'
import { BigNumber } from 'ethers'
import { getProvider } from './sbch/utils'
import { bigNumberToCurrency } from './smartswap'

// const SPICEBOT_API_BASE_URL = 'http:localhost:8080/api'
const SPICEBOT_API_BASE_URL = 'https:spicebot.scibizinformatics.com/api'

/**
 *
 * @typedef {Object} SpicebotBridgeToken bridge token info from spicebot, some properties might not be documented
 * @property {String}  name
 * @property {Boolean} active
 * @property {String}  slp_token_id
 * @property {Number}  slp_decimals
 * @property {String}  slp_source_address
 * @property {String}  slp_to_sep20_ratio
 * @property {String}  sep20_contract
 * @property {Number}  sep20_decimals
 * @property {String}  sep20_source_address
 * @returns {{success: Boolean, tokens?: SpicebotBridgeToken[], error?: undefined }}
 */
export async function fetchTokensList () {
  try {
    const { data } = await axios.get(
      `${SPICEBOT_API_BASE_URL}/bridge/tokens/`,
      { params: { active: true } }
    )

    return {
      success: true,
      tokens: Array.isArray(data.results) ? data.results : []
    }
  } catch (err) {
    return { success: false, error: err }
  }
}

/**
 * Fetch token balances addresses on specific tokens
 * @param {[contractAddress: String, walletAddress: String][]} tokenWalletPairs
 * @return {{token: String, wallet: String, balance: Number}[]}
*/
export async function batchFetchSep20TokenBalances (tokenWalletPairs) {
  const provider = getProvider(false)

  // fetch balance of pairs
  const balances = await Promise.all(
    tokenWalletPairs.map(pair => {
      const tokenAddress = pair[0]
      const walletAddress = pair[1]
      return provider.send(
        'eth_call',
        [{ data: `0x70a08231000000000000000000000000${walletAddress.replace('0x', '')}`, to: tokenAddress }, 'latest']
      ).then(balanceHex => {
        return { wallet: walletAddress, token: tokenAddress, rawBalance: BigNumber.from(balanceHex) }
      }).catch(() => {
        // need to force resolve some tokens to allow to continue for tokens that succeeded
        return Promise.reject()
      })
    })
  )

  // resolve token contract decimals
  const contractAddresses = balances.map(info => info && info.token)
    .filter(Boolean)
    .filter((e, i, s) => s.indexOf(e) === i)

  const decimalsList = await Promise.all(
    contractAddresses.map(tokenAddress => {
      return provider.send(
        'eth_call',
        [{ data: '0x313ce567', to: tokenAddress }, 'latest']
      ).then(decimalsHex => {
        return { token: tokenAddress, decimals: BigNumber.from(decimalsHex).toNumber() }
      }).catch(() => {
        // need to force resolve some tokens to allow to continue for tokens that succeeded
        return Promise.reject()
      })
    })
  )

  const parsedBalances = balances.map(info => {
    const decimals = decimalsList.find(decimalInfo => decimalInfo.token.toLowerCase() === info.token.toLowerCase())?.decimals
    let parsedBalance
    if (decimals) parsedBalance = bigNumberToCurrency(info.rawBalance, decimals)
    return {
      token: info.token,
      wallet: info.wallet,
      balance: parsedBalance
    }
  })

  return parsedBalances
}

/**
 *
 * @param {String} slpTokenId
 * @param {Number} amount
 * @param {String} recipientSep20Address
 */
export async function getOrCreateSwapRequest (slpTokenId, amount, recipientSep20Address) {
  try {
    const { data } = await axios.get(
      `${SPICEBOT_API_BASE_URL}/bridge/swap-requests/`,
      {
        params: {
          fulfilled: false,
          slp_token_id: slpTokenId,
          to_address: recipientSep20Address,
          amount: amount
        }
      }
    )
    if (Array.isArray(data?.results) && data.results.length) {
      return {
        success: true,
        swapRequest: data.results[0]
      }
    }

    const { data: swapRequest } = await axios.post(
      `${SPICEBOT_API_BASE_URL}/bridge/swap-requests/`,
      {
        amount: amount,
        slp_token_id: slpTokenId,
        to_address: recipientSep20Address
      }
    )

    if (swapRequest?.id) {
      return {
        success: true,
        swapRequest: swapRequest
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}

/**
 *
 * @param {Number} swapRequestId
 */
export async function getSwapRequestDetails (swapRequestId) {
  try {
    const { data } = await axios.get(`${SPICEBOT_API_BASE_URL}/bridge/swap-requests/${swapRequestId}/`)
    return {
      success: true,
      swapRequest: data
    }
  } catch (err) {
    return {
      success: false,
      error: err
    }
  }
}
