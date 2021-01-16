const BCHJS = require('@psf/bch-js')

const NET_TESTNET = 'testnet'
const NET_MAINNET = 'mainnet'

const ADDR_CASH = 'cashaddress'
const ADDR_SLP = 'simpleledger'
const ADDR_LEGACY = ''


const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
const testnetInstance = new BCHJS({
  restURL: TESTNET3
})

const mainnetInstance = new BCHJS({
  restURL: BCHN_MAINNET
})

// NOTE: rate limit is 20 requests per minute

export function getBCHJS (network = NET_TESTNET) {
  switch (network) {
    case (NET_TESTNET):
      return testnetInstance
    case (NET_MAINNET):
      return mainnetInstance
    default:
      return null
  }
}

// NOTE: This ignores token utxo to avoid burning
export async function getUtxosForAmount (utxos, amount, satoshisPerByte, outputCount, context) {
  // we will sort the utxos by value (biggest first) to get utxos that will satisfy the amount target
  let utxosToReturn = []
  const sortedUtxos = utxos.sort((a, b) => a.value < b.value)
  for (var i = 0; i < sortedUtxos.length; i++) {
    /*
      1. if total amount plus fees is met we stop
      2. validate utxo if it is spent already
      3. validate utxo if it is an slp token
    */

    // 1.
    const totalAmount = utxosToReturn.reduce((subTotal, utxo) => subTotal + utxo.value, 0)
    const byteCount = context.BitcoinCash.getByteCount(
      { P2PKH: utxosToReturn.length },
      { P2PKH: outputCount }
    )
    if (totalAmount >= (amount+ satoshisPerByte*byteCount)) break

    const thisUtxo = sortedUtxos[i]
    // 2.
    const txout = await context.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
    if (txout === null) {
      // If the UTXO has already been spent, the full node will respond with null.
      console.log('Stale UTXO found. You may need to wait for the indexer to catch up.')
      continue
    }

    // 3.
    if (thisUtxo.utxoType === 'token' || thisUtxo.tokenId) {
      console.log('Token utxo found. This utxo is a token it cannot be used for sending bch')
    }

    utxosToReturn.push(thisUtxo)
  }

  return utxosToReturn
}

// Returns the utxo with the biggest balance from an array of utxos.
// NOTE: This ignores token utxo to avoid burning
export async function findBiggestUtxo (utxos, context) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]
    // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);
    console.log(thisUtxo)

    // Validate the UTXO data with the full node.
    const txout = await context.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
    console.log(txout)
    if (txout === null) {
      // If the UTXO has already been spent, the full node will respond with null.
      console.log(
        'Stale UTXO found. You may need to wait for the indexer to catch up.'
      )
      continue
    }

    if (thisUtxo.utxoType === 'token' || thisUtxo.tokenId) {
      console.log('Token utxo found. This utxo is a token it cannot be used for sending bch')
    }

    if (thisUtxo.value > largestAmount) {
      console.log('swapping')
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}


// Either cash or slp address
export function parseAddress (address, toAddress = ADDR_CASH) {
  const bchjs = getBCHJS(NET_MAINNET)
  let isLegacyAddress = false
  let isCashAddress = false
  let isSLPAddress = false
  try {
    isLegacyAddress = bchjs.Address.isLegacyAddress(address)
  } catch (err) {}

  try {
    isSLPAddress = bchjs.SLP.Address.isSLPAddress(address)
  } catch (err) {}

  try {
    isCashAddress = bchjs.Address.isCashAddress(address) && !isSLPAddress
  } catch (err) {}

  if (isCashAddress) {
    switch (toAddress) {
      case (ADDR_CASH):
        return address
      case (ADDR_SLP):
        return bchjs.SLP.Address.toSLPAddress(address)
      case (ADDR_LEGACY):
        return bchjs.Address.toLegacyAddress(address)
    }
  } else if (isSLPAddress) {
    switch (toAddress) {
      case (ADDR_CASH):
        return bchjs.SLP.Address.toCashAddress(address)
      case (ADDR_SLP):
        return address
      case (ADDR_LEGACY):
        return bchjs.SLP.Address.toLegacyAddress(address)
    }
  } else if (isLegacyAddress) {
    switch (toAddress) {
      case (ADDR_CASH):
        return bchjs.Address.toCashAddress(address)
      case (ADDR_SLP):
        return bchjs.SLP.Address.toSLPAddress(address)
      case (ADDR_LEGACY):
        return address
    }
  }

  return address
}

export default {
  NET_TESTNET,
  NET_MAINNET,

  ADDR_CASH,
  ADDR_SLP,
  ADDR_LEGACY,
  parseAddress,

  findBiggestUtxo,
  getUtxosForAmount,

  getBCHJS, 
}