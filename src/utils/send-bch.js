import common from './common.js'

// amount is in bch
export default async function (senderAddress, senderWIF, recipientAddress, amount) {
  try {
    let bchjs = common.getBCHJS(common.NET_MAINNET)
    const useTestnet = bchjs.Address.isTestnetAddress(senderAddress)

    if (useTestnet) {
      bchjs = common.getBCHJS(common.NET_TESTNET)
    }

    const amountInSatoshis = bchjs.BitcoinCash.toSatoshi(amount)

    const senderBalance = await getBCHBalance(senderAddress, bchjs)
    if (senderBalance <= 0.0) throw new Error('No balance')

    const utxos = await bchjs.Electrumx.utxo(senderAddress)
    if (utxos.utxos.length === 0) throw new Error('No UTXOs found.')

    console.log('Listing utxos')
    console.log(utxos)

    console.log('Getting biggest utxo:')
    const utxo = await findBiggestUtxo(utxos.utxos, bchjs)
    console.log(utxo)

    let transactionBuilder
    if (useTestnet) transactionBuilder = new bchjs.TransactionBuilder('testnet')
    else transactionBuilder = new bchjs.TransactionBuilder()

    transactionBuilder.addInput(
      // transaction id
      utxo.tx_hash,
      // output from the transaction
      utxo.tx_pos
    )

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bchjs.BitcoinCash.getByteCount(
      { P2PKH: 1 },
      { P2PKH: 2 }
    )
    console.log(`Transaction byte count: ${byteCount}`)
    const satoshisPerByte = 1.2
    const txFee = Math.floor(satoshisPerByte * byteCount)
    console.log(`Transaction fee: ${txFee}`)

    // recipient gets the amount sent
    transactionBuilder.addOutput(
      recipientAddress,
      amountInSatoshis
    )

    // recipient gets the remaining amount after deducting the utxo total
    transactionBuilder.addOutput(
      senderAddress,
      utxo.value - amountInSatoshis - txFee
    )

    const keyPair = bchjs.ECPair.fromWIF(senderWIF)

    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      utxo.value
    )

    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])

    return txidStr
  } catch (err) {
    console.log('Encountered error in sending bch: ', err)
    throw err
  }
}

// Get the balance in BCH of a BCH address.
async function getBCHBalance (addr, context, verbose) {
  try {
    const result = await context.Electrumx.balance(addr)

    if (verbose) console.log(result)

    // The total balance is the sum of the confirmed and unconfirmed balances.
    const satBalance =
      Number(result.balance.confirmed) + Number(result.balance.unconfirmed)

    // Convert the satoshi balance to a BCH balance
    const bchBalance = context.BitcoinCash.toBitcoinCash(satBalance)

    return bchBalance
  } catch (err) {
    console.error('Error in getBCHBalance: ', err)
    console.log(`addr: ${addr}`)
    throw err
  }
}

// Returns the utxo with the biggest balance from an array of utxos.
// NOTE: This ignores token utxo to avoid burning
async function findBiggestUtxo (utxos, context) {
  let largestAmount = 0
  let largestIndex = 0

  for (let i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i]
    // console.log(`thisUTXO: ${JSON.stringify(thisUtxo, null, 2)}`);

    // Validate the UTXO data with the full node.
    const txout = await context.Blockchain.getTxOut(thisUtxo.tx_hash, thisUtxo.tx_pos)
    if (txout === null) {
      // If the UTXO has already been spent, the full node will respond with null.
      console.log(
        'Stale UTXO found. You may need to wait for the indexer to catch up.'
      )
      continue
    }

    if (thisUtxo.utxoType === 'token' || thisUtxo.tokenId) {
      console.log('This utxo is a token it cannot be used for sending bch')
    }

    if (thisUtxo.value > largestAmount) {
      console.log('swapping')
      largestAmount = thisUtxo.value
      largestIndex = i
    }
  }

  return utxos[largestIndex]
}
