import common from './common.js'

// amount is in bch
export default async function (senderAddress, senderWIF, recipientAddress, amount) {
  const satoshisPerByte = 1.2
  const outputCount = 2

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

    console.log('Getting utxos to use:')
    const inputUtxos = await common.getUtxosForAmount(
      utxos.utxos,
      amountInSatoshis,
      satoshisPerByte,
      outputCount,
      bchjs
    )
    console.log(inputUtxos)
    const totalInputAmount = inputUtxos.reduce(
      (subTotal, utxo) => subTotal + utxo.value,
      0
    )

    let transactionBuilder
    if (useTestnet) transactionBuilder = new bchjs.TransactionBuilder('testnet')
    else transactionBuilder = new bchjs.TransactionBuilder()

    for (var i = 0; i < inputUtxos.length; i ++) {
      transactionBuilder.addInput(
        // transaction id
        inputUtxos[i].tx_hash,
        // output from the transaction
        inputUtxos[i].tx_pos
      )
    }

    // get byte count to calculate fee. paying 1.2 sat/byte
    const byteCount = bchjs.BitcoinCash.getByteCount(
      { P2PKH: inputUtxos.length },
      { P2PKH: outputCount }
    )
    console.log(`Transaction byte count: ${byteCount}`)
    const txFee = Math.floor(satoshisPerByte * byteCount)
    console.log(`Transaction fee: ${txFee}`)

    // recipient gets the amount sent
    console.log('add recipient output')
    transactionBuilder.addOutput(
      recipientAddress,
      amountInSatoshis
    )

    // recipient gets the remaining amount after deducting the utxo total
    console.log('add change output')
    transactionBuilder.addOutput(
      senderAddress,
      totalInputAmount - amountInSatoshis - txFee
    )

    const keyPair = bchjs.ECPair.fromWIF(senderWIF)

    let redeemScript
    console.log('signing')
    for (var i = 0; i < inputUtxos.length; i ++) {
      transactionBuilder.sign(
        i,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        inputUtxos[i].value
      )
    }

    console.log('build')
    const tx = transactionBuilder.build()
    // output rawhex
    const hex = tx.toHex()

    // Broadcast transation to the network
    console.log('broadcasting')
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])

    console.log('done')
    console.log(txidStr)
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
