const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()
const axios = require('axios')
const Watchtower = require('watchtower-cash-js')

export class SweepPrivateKey {
  constructor (wif) {
    this.wif = wif
  }

  async getTokensList () {
    const ecpair = bchjs.ECPair.fromWIF(this.wif)
    const bchAddress = bchjs.ECPair.toCashAddress(ecpair)
    const slpAddress = bchjs.SLP.Address.toSLPAddress(bchAddress)

    const respSlp = await axios.post('https://watchtower.cash/api/subscription/', {
      address: slpAddress
    })

    if (respSlp.data.success) {
      const url = `https://watchtower.cash/api/tokens/?address=${slpAddress}&has_balance=true&token_type=1&limit=20`
      const resp = await axios.get(url)
      const _tokens = resp.data.results
      const tokens = []
      for (let i = 0; i < _tokens.length; i++) {
        const item = _tokens[i]
        const tokenId = item.id.split('/')[1]
        const resp = await axios.get(`https://watchtower.cash/api/balance/slp/${slpAddress}/${tokenId}/`)
        const data = resp.data
        resp.data.token_id = tokenId
        resp.data.symbol = item.symbol
        resp.data.image_url = item.image_url
        tokens.push(data)
      }
      return tokens
    }
  }

  sweepToken (slpAddress, slpWif, tokenId, balance, bchFundingAddress, bchFundingWif, recipient) {
    const watchtower = new Watchtower()
    const data = {
      sender: {
        address: slpAddress,
        wif: slpWif
      },
      tokenId: tokenId,
      feeFunder: {
        address: bchFundingAddress,
        wif: bchFundingWif
      },
      recipients: [
        {
          address: recipient,
          amount: balance
        }
      ],
      broadcast: false
    }

    watchtower.SLP.Type1.send(data).then(function (result) {
      console.log(result)
    })
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
          amount: spendableBalance - (10 / (10 ** 8))
        }
      ],
      broadcast: false
    }

    watchtower.BCH.send(data).then(function (result) {
      console.log(result)
    })
  }
}
