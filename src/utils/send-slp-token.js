import common from './common.js'

// amount is in the said token's amount
export default async function (senderAddress, senderWIF, recipientAddress, tokenId, amount) {
  try {
    // mainnet by dfault
    let bchjs = common.getBCHJS(common.NET_MAINNET)

    // check if sender is valid
    if (!bchjs.SLP.Address.isSLPAddress(senderAddress)) {
      throw new Error('Expected sender to be a valid slp address')
    }
    const senderCashAddress = bchjs.SLP.Address.toCashAddress(senderAddress)

    // check if recipient is valid
    if (!bchjs.SLP.Address.isSLPAddress(recipientAddress)) {
      throw new Error('Expected recipient to be a valid slp address')
    }

    // check if address is mainnet
    const useTestnet = bchjs.Address.isTestnetAddress(senderCashAddress)

    // switch to testnet if using testnet
    if (useTestnet) {
      bchjs = common.getBCHJS(common.NET_TESTNET)
    }

    // get utxos
    const utxos = await bchjs.Electrumx.utxo(senderCashAddress)

    // filter utxos that are of the same token type
    const tokenUtxos = getTokenUtxos(utxos.utxos, tokenId)

    // get utxo that is a bch type
    const bchUtxos = getBCHUtxos(utxos.utxos)
    const bchUtxo = common.findBiggestUtxo(bchUtxos)

    // Generate the SEND OP_RETURN
    const slpData = bchjs.SLP.TokenType1.generateSendOpReturn(
      tokenUtxos,
      amount // again, amount is quantity in terms of the selected token type
    )

    var transactionBuilder
    if (useTestnet) transactionBuilder = new bchjs.TransactionBuilder('testnet')
    else transactionBuilder = new bchjs.TransactionBuilder()

    const originalAmount = bchUtxo.value
    const TX_FEE = 250 // i have no idea yet why its 250, probably arbitrary

    // 546 is a dust bch put in each tx output for a slp token
    // we multiply by 2 because we put dust bch to the tx output for the sender and recipient, respectively
    const remainder = originalAmount - TX_FEE - 546 * 2

    // we add a bch utxo so we can use for spending dust bch
    transactionBuilder.addInput(bchUtxo.tx_hash, bchUtxo.tx_pos)

    // add input for each token utxo
    for (let i = 0; i < tokenUtxos.length; i++) {
      transactionBuilder.addInput(tokenUtxos[i].txid, tokenUtxos[i].vout)
    }

    // the first output is always the OP_RETURN
    transactionBuilder.addOutput(slpData, 0)

    // the order in which the recipients are added matter, not yet aware of the specifics
    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(recipientAddress),
      546
    )

    transactionBuilder.addOutput(
      bchjs.SLP.Address.toLegacyAddress(senderCashAddress),
      546
    )

    // this is the change tx output, always needed to send back change of the bch after deducting dust and tx fee
    transactionBuilder.addOutput(
      senderCashAddress,
      remainder
    )

    // get key pair from WIF of sender
    const keyPair = bchjs.ECPair.fromWIF(senderWIF)

    // Sign the transaction with the private key for the BCH UTXO paying the fees.
    let redeemScript
    transactionBuilder.sign(
      0,
      keyPair,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    )

    // Sign each token UTXO being consumed.
    for (let i = 0; i < tokenUtxos.length; i++) {
      const thisUtxo = tokenUtxos[i]

      transactionBuilder.sign(
        1 + i,
        keyPair,
        redeemScript,
        transactionBuilder.hashTypes.SIGHASH_ALL,
        thisUtxo.value
      )
    }

    // build tx
    const tx = transactionBuilder.build()

    // output rawhex
    const hex = tx.toHex()

    // END transaction construction.

    // Broadcast transation to the network
    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex])
    console.log(`Transaction ID: ${txidStr}`)

    console.log('Check the status of your transaction on this block explorer:')
    if (bchjs.Address.isTestnetAddress(senderCashAddress)) {
      console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`)
    } else {
      console.log(`https://explorer.bitcoin.com/bch/tx/${txidStr}`)
    }

    return txidStr
  } catch (err) {
    console.error('Got error when sending slp token')
    throw err
  }
}

// filter utxos of token type
function getTokenUtxos (utxos, tokenId) {
  return utxos.filter(utxo =>
    utxo && // UTXO is associated with a token.
    utxo.tokenId === tokenId && // UTXO matches the token ID.
    utxo.tokenType === 'token' // UTXO is not a minting baton.
  )
}

function getBCHUtxos (utxos) {
  return utxos.filter(utxo => {
    return utxo.isValid && !utxo.tokenId
  })
}
