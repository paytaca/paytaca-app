const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()
const axios = require('axios')
import Watchtower from 'watchtower-cash-js'

export class SweepPrivateKey {
  constructor (wif) {
    this.wif = wif
    const ecpair = bchjs.ECPair.fromWIF(this.wif)
    this.bchAddress = bchjs.ECPair.toCashAddress(ecpair)
    this.slpAddress = bchjs.SLP.Address.toSLPAddress(this.bchAddress)
  }

  async getBchBalance () {
    const respBch = await axios.post('https://watchtower.cash/api/subscription/', {
      address: this.bchAddress
    })
    if (respBch.data.success) {
      const resp = await axios.get(`https://watchtower.cash/api/balance/bch/${this.bchAddress}/`)
      console.log(resp)
      return resp.data
    }
  }

  async getTokensList () {
    const respSlp = await axios.post('https://watchtower.cash/api/subscription/', {
      address: this.slpAddress
    })

    if (respSlp.data.success) {
      const url = `https://watchtower.cash/api/tokens/?address=${this.slpAddress}&has_balance=true&token_type=1&limit=20`
      const resp = await axios.get(url)
      const _tokens = resp.data.results
      const tokens = []
      for (let i = 0; i < _tokens.length; i++) {
        const item = _tokens[i]
        const tokenId = item.id.split('/')[1]
        const resp = await axios.get(`https://watchtower.cash/api/balance/slp/${this.slpAddress}/${tokenId}/`)
        const data = resp.data
        resp.data.token_id = tokenId
        resp.data.symbol = item.symbol
        resp.data.image_url = item.image_url
        tokens.push(data)
      }
      return tokens
    }
  }

  sweepToken (slpAddress, slpWif, tokenId, balance, feeFunder, recipient) {
    const watchtower = new Watchtower()
    const data = {
      sender: {
        address: slpAddress,
        wif: slpWif
      },
      tokenId: tokenId,
      recipients: [
        {
          address: recipient,
          amount: balance
        }
      ],
      feeFunder: feeFunder,
      broadcast: true
    }

    return watchtower.SLP.Type1.send(data)
  }

  sweepBch (bchAddress, bchWif, spendableBalance, recipient) {
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
      broadcast: true
    }

    return watchtower.BCH.send(data)
  }
}

export default SweepPrivateKey
