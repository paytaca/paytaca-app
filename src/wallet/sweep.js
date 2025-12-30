const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()
const axios = require('axios')
import Watchtower from 'watchtower-cash-js'
import { convertCashAddress } from './chipnet'
import { CashNonFungibleToken } from './cashtokens'

export class SweepPrivateKey {
  constructor (wif) {
    this.wif = wif
    const ecpair = bchjs.ECPair.fromWIF(this.wif)
    this.bchAddress = bchjs.ECPair.toCashAddress(ecpair)
    this.slpAddress = bchjs.SLP.Address.toSLPAddress(this.bchAddress)
    this.tokenAddress = convertCashAddress(this.bchAddress, false, true)
    this.subscribed = false
  }

  async subscribe() {
    if (this.subscribed) return true
    const resp = await axios.post('https://watchtower.cash/api/subscription/', {
      address: this.bchAddress
    })
    if (resp.data.success) {
      this.subscribed = true
      return true
    }
    return false
  }

  async getBchBalance (subscribe=true) {
    if (subscribe) {
      const respBch = await axios.post('https://watchtower.cash/api/subscription/', {
        address: this.bchAddress
      })
      if (!respBch.data.success) return
    }

    let retries = 0
    let resp

    while (retries < 3) {
      try {
        resp = await axios.get(`https://watchtower.cash/api/balance/bch/${this.bchAddress}/`)
        // Return response even if balance is 0
        if (resp.data) {
          return resp.data
        }
      } catch (error) {
        console.error(`BCH balance fetch attempt ${retries + 1} failed:`, error.message)
      }
      
      retries++
      if (retries < 3) {
        // Properly wait between retries
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Return default balance structure if all retries failed
    return resp?.data || { balance: 0, spendable: 0, pending: 0 }
  }

  async getFungibleCashTokens(subscribe=true) {
    if (subscribe) {
      const subscribeResp = await axios.post('https://watchtower.cash/api/subscription/', {
        address: this.bchAddress,
      })
      if (!subscribeResp.data.success) return []
    }

    const url = `https://watchtower.cash/api/cts/balances/${encodeURIComponent(this.tokenAddress)}/fts`
    const params = { limit: 100 }
    let retries = 0
    let resp

    while (retries < 3) {
      try {
        resp = await axios.get(url, { params })
        if (resp.data?.results) {
          break
        }
      } catch (error) {
        console.error(`Fungible tokens fetch attempt ${retries + 1} failed:`, error.message)
      }
      
      retries++
      if (retries < 3) {
        // Properly wait between retries
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    if (!resp?.data?.results) {
      return []
    }

    const tokenDataPromises = await Promise.allSettled(
      resp.data.results
        .map(token => token?.tokenId)
        .filter(Boolean)
        .filter((element, index, array) => array.indexOf(element) === index)
        .map(tokenId => axios.get(`https://watchtower.cash/api/cashtokens/fungible/${tokenId}/`))
    )

    const tokenDataResults = tokenDataPromises
      .map(result => result?.value?.data)
      .filter(Boolean)

    const tokens = resp.data.results
    const result = tokens.map(token => {
      const tokenDetails = tokenDataResults.find(tokenData => 
        tokenData?.id?.includes(token?.tokenId)
      )
      return {
        category: token?.tokenId,
        balance: token?.balance,
        parsedMetadata: {
          fungible: true,
          name: tokenDetails?.name,
          symbol: tokenDetails?.symbol,
          decimals: tokenDetails?.decimals,
          imageUrl: tokenDetails?.image_url,
        },
      }
    })
    return result
  }

  async getNftCashTokens(subscribe=true) {
    if (subscribe) {
      const subscribeResp = await axios.post('https://watchtower.cash/api/subscription/', {
        address: this.bchAddress,
      })
      if (!subscribeResp.data.success) return []
    }

    const url = `https://watchtower.cash/api/cashtokens/nft/`
    const params = {
      address: this.bchAddress,
      has_balance: true,
      limit: 100,
    }
    let retries = 0
    let resp

    while (retries < 3) {
      try {
        resp = await axios.get(url, { params })
        // If we get a valid response (even with empty results), that's the final answer
        // Only retry if response is invalid/malformed
        if (resp?.data && Array.isArray(resp.data.results)) {
          break
        }
      } catch (error) {
        console.error(`NFT tokens fetch attempt ${retries + 1} failed:`, error.message)
      }
      retries++
      if (retries < 3) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    if (!resp?.data?.results) {
      return []
    }

    const results = resp.data.results.map(CashNonFungibleToken.parse)
    await Promise.allSettled(results.map(nft => nft?.fetchMetadata()))
    return results
  }

  /**
   * @param {Object} param0
   * @param {String} param0.tokenAddress 
   * @param {String} param0.bchWif 
   * @param {Object} param0.token
   * @param {String} param0.token.tokenId
   * @param {String} [param0.token.capability]
   * @param {String} [param0.token.commitment]
   * @param {String} [param0.token.txid]
   * @param {Number} [param0.token.vout]
   * @param {Number} param0.tokenAmount
   * @param {String} param0.recipient
   */
  sweepCashToken({ tokenAddress, bchWif, token, tokenAmount, feeFunder, recipient }) {
    const watchtower = new Watchtower()
    const data = {
      sender: { address: tokenAddress, wif: bchWif },
      recipients: [
        { address: recipient, tokenAmount: tokenAmount },
      ],
      token,
      feeFunder,
      broadcast: true,
    }
    return watchtower.BCH.send(data)
  }

  sweepBch (bchAddress, bchWif, spendableBalance, feeFunder, recipient, broadcast = true) {
    const watchtower = new Watchtower()
    const data = {
      sender: {
        address: bchAddress,
        wif: bchWif
      },
      recipients: [
        {
          address: recipient,
          amount: spendableBalance
        }
      ],
      feeFunder,
      broadcast
    }

    return watchtower.BCH.send(data)
  }
}

export function isValidWif(value='') {
  return /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(value)
}

export function extractWifFromUrl(value='') {
  if (typeof value !== 'string') return

  const removePrefixes = ['bitcoincash:', 'bch-wif:']

  const wifWithoutPrefix = removePrefixes.reduce((result, prefix) => {
    return result.startsWith(prefix) ? result.slice(prefix.length) : result;
  }, value);

  if (!isValidWif(wifWithoutPrefix)) return

  return wifWithoutPrefix
}


export default SweepPrivateKey
