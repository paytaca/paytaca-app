import common from './common.js'

export default async function createWallet (testnet = false, mnemonic = '', index = 0) {
  try {
    const bchjs = common.getBCHJS(testnet ? common.NET_TESTNET : common.NET_MAINNET)

    if (!mnemonic) mnemonic = bchjs.Mnemonic.generate(128)

    if (testnet) {
      console.log('Creating testnet wallet')
    } else {
      console.log('Creating wallet')
    }

    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic)
    const hdNode = bchjs.HDNode.fromSeed(rootSeed)

    const account = bchjs.HDNode.derive(hdNode, index)

    const cashAddress = bchjs.Address.toCashAddress(account.keyPair.getAddress())
    const legacyAddress = bchjs.Address.toLegacyAddress(cashAddress)
    const slpAddress = bchjs.SLP.Address.toSLPAddress(cashAddress)
    const privateKey = account.keyPair.toWIF()

    const returnVal = {
      cashAddress,
      legacyAddress,
      slpAddress,
      privateKey,
      mnemonic
    }

    console.log('Created wallet:')
    console.log(returnVal)

    return returnVal
  } catch (err) {
    console.error('Encountered error in creating wallet')
    console.error(err)
    throw err
  }
}
