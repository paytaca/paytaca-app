import common from './common.js'

/*
  return val:
  {
    confirmed: 0.000,
    unconfirmed: 0.00,

    // tokens is only when address is an slp address
    tokens: [
      {
        balanceString: "120",
        slpAddress: "simpleledger:qznwt5kvqvxuvrw0ce464qgzpmqf4pqg350apdmxhf",
        tokenId: "57b76544521b5ee8e2e918cda81a5faf276d38acf96fe20475e1359077850d8b",
        balance: 120,
        decimalCount: 8
      },
      ....
    ]
  }

*/

export default async function (address) {
  try {
    let bchjs = common.getBCHJS(common.NET_MAINNET)

    const isSLPAddress = bchjs.SLP.Address.isSLPAddress(address)
    const cashAddress = isSLPAddress ? bchjs.SLP.Address.toCashAddress(address) : address

    if (bchjs.Address.isTestnetAddress(cashAddress)) {
      bchjs = common.getBCHJS(common.NET_TESTNET)
    }

    var balance = await bchjs.Electrumx.balance(cashAddress)
    console.log(bchjs)

    if (balance.success) {
      console.log(`Got balance of ${address}`)
      if (isSLPAddress) {
        console.log('Got SLP address getting token balances')
        const tokens = await bchjs.SLP.Utils.balancesForAddress(address)
        balance.balance.tokens = tokens
      }
      return balance.balance
    } else {
      console.log(`Unsuccessfull getting balance of ${address}`)
      console.log(balance)
      throw new Error(balance)
    }
  } catch (err) {
    console.log(`Encountered error for getting balance of ${address}`)
    console.log(err)
  }
}
