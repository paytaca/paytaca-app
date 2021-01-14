const BCHJS = require('@psf/bch-js')

const NET_TESTNET = 'testnet'
const NET_MAINNET = 'mainnet'

const TESTNET3 = 'https://testnet3.fullstack.cash/v3/'
const BCHN_MAINNET = 'https://bchn.fullstack.cash/v3/'
const testnetInstance = new BCHJS({
  restURL: TESTNET3
})

const mainnetInstance = new BCHJS({
  restURL: BCHN_MAINNET
})

export default {
  NET_TESTNET,
  NET_MAINNET,

  getBCHJS: function (network = NET_TESTNET) {
    switch (network) {
      case (NET_TESTNET):
        return testnetInstance
      case (NET_MAINNET):
        return mainnetInstance
      default:
        return null
    }
  }
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
