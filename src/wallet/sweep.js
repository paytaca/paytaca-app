const BCHJS = require('@psf/bch-js')
const bchjs = new BCHJS()
const axios = require('axios')
const Watchtower = require('watchtower-cash-js')

function sweepToken (slpAddress, slpWif, tokenId, balance, bchFundingAddress, bchFundingWif, recipient) {
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
    console.log(`\n\n####### Token: ${tokenId}`)
    console.log(result)
  })
}

function sweepBch (bchAddress, bchWif, spendableBalance, recipient) {
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
    console.log('\n\n####### BCH:')
    console.log(result)
  })
}

async function sweepPrivateKey (wif, bchRecipient, slpRecipient) {
  const ecpair = bchjs.ECPair.fromWIF(wif)
  const bchAddress = bchjs.ECPair.toCashAddress(ecpair)
  console.log(bchAddress)
  const slpAddress = bchjs.SLP.Address.toSLPAddress(bchAddress)
  console.log(slpAddress)

  const respBch = await axios.post('https://watchtower.cash/api/subscription/', {
    address: bchAddress
  })

  const respSlp = await axios.post('https://watchtower.cash/api/subscription/', {
    address: slpAddress
  })

  if (respBch.data.success && respSlp.data.success) {
    // Get tokens
    const url = `https://watchtower.cash/api/tokens/?address=${slpAddress}&has_balance=true&token_type=1&limit=20`
    const resp = await axios.get(url)
    const promises = resp.data.results.map(function (item) {
      const tokenId = item.id.split('/')[1]
      axios.get(`https://watchtower.cash/api/balance/slp/${slpAddress}/${tokenId}/`).then(function (resp) {
        // const data = resp.data
        // resp.data.token_id = tokenId
        // resp.data.symbol = item.symbol
        // resp.data.image_url = item.image_url
        // console.log(data)
        if (resp.data.balance > 0) {
          sweepToken(slpAddress, wif, tokenId, resp.data.spendable, bchAddress, wif, slpRecipient)
        }
      })
    })

    Promise.all(promises).then(function () {
      axios.get(`https://watchtower.cash/api/balance/bch/${bchAddress}`).then(function (resp) {
        sweepBch(bchAddress, wif, resp.data.spendable, bchRecipient)
      })
      // console.log(bchBalance.data)
    })
  }
}

const wif = ''
const bchRecipient = 'bitcoincash:qz0hlxg5shuzp9mmr2dypa7afp96s4pzeyaqvrqw5a'
const slpRecipient = 'simpleledger:qz7nux3ngafxtcwfy24ua30g8vq8hz6rucr0sqx8rw'
sweepPrivateKey(wif, bchRecipient, slpRecipient)
