import BCHJS from '@psf/bch-js'
import axios from 'axios'
import { ethers, utils, BigNumber } from 'ethers'
import { getProvider } from './sbch/utils'

const bchjs = new BCHJS()
const provider = getProvider(false)

/*
  when performing an exchange, the user/wallet sends bch to the 'receiver' address; then
  wait or watch for transactions sent by the 'sender' address.
    - The amount to exchange must not exceed the 'sender' address' balance.
*/
const addresses = {
  cash2smart: {
    receiver: 'bitcoincash:qqa0dj5rwaw2s4tz88m3xmcpjyzry356gglq7zvu80',
    sender: '0xa659c0434399a8D0e15b8286b39f8d97830F8F91',
  },

  smart2cash: {
    receiver: '0x3207d65b4D45CF617253467625AF6C1b687F720b',
    sender: 'bitcoincash:qzteyuny2hdvvcd4tu6dktwx9f04jarzkyt57qel0y',
  },

  sbchContractAddress: '0xBAe8Af26E08D3332C7163462538B82F0CBe45f2a',
}

const bridgeContract = new ethers.Contract(
  addresses.sbchContractAddress,
  [
    'event Bridged(bytes32 indexed sourceTransaction, address indexed liquidityProviderAddress, address indexed outputAddress, uint256 outputAmount);',
  ],
  provider,
)

function toBigNumber(value) {
  return BigNumber.from('0x' + BigInt(value).toString(16)) 
}

/**
 * To reverse value set feeInfo:
 * nf = -f/(1-p), np = 1 - 1/(1-p), Where:
 *  nf: new fixed, f = prev fixed, np = new pctg, p = prev pctg     
 *  
 * @param {number} amount
 * @param {Object} feeInfo ex: { pctg: 0.001, fixed: 1 }
 * @returns {number}
 */
export function deductFromFee(amount, feeInfo={pctg: 0.0, fixed: 0}) {
  return amount * (1-feeInfo.pctg) - feeInfo.fixed
}

export async function smart2cashMax() {
  const response = await bchjs.Electrumx.balance(addresses.smart2cash.sender);
  if (response.success) {
    return {
      success: true,
      balance: response.balance.confirmed * (10 ** -8 ),
    }
  }
  return {
    success: false,
    error: response,
  }
}

export async function cash2smartMax() {
  const balance = await provider.getBalance(addresses.cash2smart.sender)
  return {
    success: true,
    balance: Number(utils.formatEther(balance)),
  }
}

/**
 * Sends a cash to smart,incoming type transaction
 * @param {number} amount in BCH 
 * @param {string} recipientAddress address of sbch wallet
 * @param {string} changeAddress bch address 
 * @returns 
 */
export async function c2s(wallet, amount, recipientAddress, changeAddress) {
  if (wallet && wallet._testnet) {
    return {
      success: false,
      error: 'Wallet used is in testnet.',
    }
  }
  if (!utils.isAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid SmartBCH address',
    }
  }

  const OP_RETURN = '6a', PUSH = '4c'
  const data = Buffer.from(recipientAddress, 'utf8').toString('hex');
  const dataLength = data.length.toString(16)
  const opReturnBuffer = Buffer.from(
    OP_RETURN + PUSH + dataLength + data,
    'hex',
  )

  const recipients = [
    { scriptHex: opReturnBuffer, amount: 0 },
    { address: addresses.cash2smart.receiver, amount: amount },
  ]

  const kwargs = {
    sender: {
      walletHash: wallet.BCH.walletHash,
      mnemonic: wallet.BCH.mnemonic,
      derivationPath: wallet.BCH.derivationPath
    },
    recipients: recipients,
    changeAddress: changeAddress,
    wallet: {
      mnemonic: wallet.BCH.mnemonic,
      derivationPath: wallet.BCH.derivationPath
    },
    broadcast: true
  }

  const result = await c2sIncoming(wallet, kwargs)
  return result
}

/**
 * Sends a smart to cash,incoming type transaction
 * @param {Wallet} amount in sBCH 
 * @param {number} amount in sBCH 
 * @param {string} recipientAddress address of bch wallet
 * @returns 
 */
export async function s2c(wallet, amount, recipientAddress) {
  if (wallet && wallet._testnet) {
    return {
      success: false,
      error: 'Wallet used is in testnet.',
    }
  }

  if (!bchjs.Address.isCashAddress(recipientAddress) && !bchjs.Address.isLegacyAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid cash/legacy address',
    }
  }

  return wallet.sBCH.sendBchWithData(
    amount,
    addresses.smart2cash.receiver,
    '0x' + Buffer.from(bchjs.Address.toLegacyAddress(recipientAddress), 'utf8').toString('hex')
  )
}

export async function findC2SOutgoingTx(txId='') {
  if (!txId.startsWith('0x')) txId = '0x' + txId

  const eventFilter = bridgeContract.filters.Bridged(txId)
  const logs = await bridgeContract.provider.send(
    'sbch_queryLogs',
    [
      bridgeContract.address,
      eventFilter.topics,
      'latest', // before block
      '0x0', // after block
      '0x1', // limit
    ]
  )

  if (!Array.isArray(logs)) return {
    success: false,
    error: 'Unable to find logs'
  }

  if (!logs.length) return {
    success: false,
    error: 'Not found'
  }

  const log = logs[0]
  const parsedLog = bridgeContract.interface.parseLog(log)
  return {
    success: true,
    tx: {
      hash: log.transactionHash,
      block: BigNumber.from(log.blockNumber).toNumber(),

      sourceTransaction: parsedLog.args.sourceTransaction,
      liquidityProviderAddress: parsedLog.args.liquidityProviderAddress,
      outputAddress: parsedLog.args.outputAddress,
      outputAmount: utils.formatEther(parsedLog.args.outputAmount),

      _raw: parsedLog
    },
  }
}

export async function findS2COutgoingTx(txId='') {
  let prasedTxId = txId
  if (prasedTxId.startsWith('0x')) prasedTxId = prasedTxId.substring(2)
  const query = `{
    "v": 3,
    "q": {
      "find": {
        "out.b0.op": 106,
        "out.h1": "${prasedTxId}"
      },
      "limit": 1
    },
    "r": {
      "f": "[.[] | { hash: .tx.h? }  ]"
    }
  }`

  const url = `https://bitdb.bch.sx/q/${btoa(query)}`
  let response = null
  try {
    response = await axios.get(url)
  } catch(err) {
    return {
      success: false,
      error: err,
    }
  }

  let txHash = ''
  let confirmed = false
  if (response.data?.c?.[0]?.hash) {
    txHash = response.data.c[0].hash
    confirmed = true
  } else if (response.data?.u?.[0]?.hash) {
    txHash = response.data.u[0].hash
    confirmed = true
  }

  if (txHash) {
    return {
      success: true,
      tx: {
        hash: txHash,
        confirmed: confirmed,
      }
    }
  } else {
    return {
      success: false,
      error: 'Not found',
    }
  }
}

/**
 * 
 * @param {String} txId transaction id from the BCH chain
 * @param {function} callback callback function when bridge transfer for the source tx is made
 * @returns {function} function to call to stop the listener
 */
 export function c2sOutgoingListener(txId='', callback=() =>{}) {
  if (!txId.startsWith('0x')) txId = '0x' + txId

  const contract = bridgeContract
  const filter = contract.filters.Bridged(txId)
  const eventCallback = (...args) => {
    const tx = args[args.length-1]
    callback({
      hash: tx.transactionHash,

      sourceTransaction: tx.args.sourceTransaction,
      liquidityProviderAddress: tx.args.liquidityProviderAddress,
      outputAddress: tx.args.outputAddress,
      outputAmount: utils.formatEther(tx.args.outputAmount),

      _raw: tx,
    })
  }

  contract.on(filter, eventCallback)
  return () => {
    contract.removeListener(eventFilter, eventCallback) 
  }
}


function matchOpReturn(txId, txData) {
  const asmRegex = /^OP_RETURN ([0-9a-f]{64})$/
  const outputs = txData?.vout
  if (!Array.isArray(outputs)) return false

  for(var i = 0; i < outputs.length; i++) {
    const match = String(out?.scriptPubKey?.asm).match(asmRegex)
    if (!match) continue
    if (String(txId).substring(2) === match[1]) {
      return true
    }
  }
  return false
}

async function matchOpReturnFromHash(txId, txHash) {
  try {
    const { details: txData } = await bchjs.Electrumx.txData(txHash)
    return {
      success: true,
      match: matchOpReturn(txId, txData),
      tx: txData,
    }
  } catch(err) {
    return {
      success: false,
      error: err,
    }
  }
}


/**
 * 
 * @param {String} txId transaction id from the Smart BCH chain
 * @param {function} callback callback function when bridge transfer for the source tx is made
 * @returns {function} function to call to stop the listener
 */
export function s2cOutgoingListener(txId='', callback=() => {}) {
  const txHashRegex = /[0-9a-f]{64}/
  const websocket = new WebSocket(`wss://watchtower.cash/ws/watch/bch/${addresses.smart2cash.sender}/`)
  websocket.onmessage = async (message) => {
    const data = JSON.parse(message)
    const txid = data?.txid
    if (!txHashRegex.test(txid)) return

    const response = await matchOpReturnFromHash(txId, txid)
    if (!response.success) return
    callback(response.tx)
  }
  
  return () => {
    websocket.close()
  }
}


export function waitC2SOutgoing(txId) {
  const promise = new Promise(resolve => {
    const stopListener = c2sOutgoingListener(txId, (tx) => {
      stopListener()
      resolve(tx)
    })
    setTimeout(() => {
      promise.cancelWatch = stopListener
    }, 100)
  })

  return promise
}


export function waitS2COutgoing(txId) {
  const promise = new Promise(resolve => {
    const stopListener = s2cOutgoingListener(txId, (tx) => {
      stopListener()
      resolve(tx)
    })

    setTimeout(() => {
      promise.cancelWatch = stopListener
    }, 100)
  })

  return promise
}

export async function c2sIncoming(wallet, { sender, recipients, changeAddress, broadcast }) {
  let walletHash
  if (sender.walletHash !== undefined) {
    walletHash = sender.walletHash
  }

  if (broadcast == undefined) {
    broadcast = true
  }

  let totalSendAmount = 0
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    if (recipient.scriptHex) {

    } else if (recipient.address.indexOf('bitcoincash') < 0) {
      return {
        success: false,
        error: 'recipient should have a BCH address'
      }
    }
    totalSendAmount += recipient.amount
  }


  const totalSendAmountSats = parseInt(totalSendAmount * (10 ** 8))
  let handle
  if (walletHash) {
    handle = 'wallet:' + walletHash
  } else {
    handle = sender.address
  }

  const bchUtxos = await wallet.BCH.watchtower.BCH.getBchUtxos(handle, totalSendAmountSats)
  if (bchUtxos.cumulativeValue < totalSendAmountSats) {
    return {
      success: false,
      error: `not enough balance in sender (${bchUtxos.cumulativeValue}) to cover the send amount (${totalSendAmountSats})`
    }
  }

  const keyPairs = []

  let transactionBuilder = new bchjs.TransactionBuilder()
  let outputsCount = 0
  let totalInput = new BigNumber(0)
  let totalOutput = new BigNumber(0)
  
  for (let i = 0; i < bchUtxos.utxos.length; i++) {
    transactionBuilder.addInput(bchUtxos.utxos[i].tx_hash, bchUtxos.utxos[i].tx_pos)
    totalInput = totalInput.plus(bchUtxos.utxos[i].value)
    let utxoKeyPair
    if (walletHash) {
      let addressPath
      if (bchUtxos.utxos[i].address_path) {
        addressPath = bchUtxos.utxos[i].address_path
      } else {
        addressPath = bchUtxos.utxos[i].wallet_index
      }
      const utxoPkWif = await this.retrievePrivateKey(
        sender.mnemonic,
        sender.derivationPath,
        addressPath
      )
      utxoKeyPair = bchjs.ECPair.fromWIF(utxoPkWif)
      keyPairs.push(utxoKeyPair)
      if (!changeAddress) {
        changeAddress = bchjs.ECPair.toCashAddress(utxoKeyPair)
      }
    } else {
      const senderKeyPair = bchjs.ECPair.fromWIF(sender.wif)
      keyPairs.push(senderKeyPair)
      if (!changeAddress) {
        changeAddress = bchjs.ECPair.toCashAddress(senderKeyPair)
      }
    }
  }

  let inputsCount = bchUtxos.utxos.length

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]
    const sendAmount = new BigNumber(recipient.amount).times(10 ** 8)
    let outputData
    if (recipient.scriptHex) {
      outputData = scriptHex
    } else {
      outputData = bchjs.Address.toLegacyAddress(recipient.address)
    }
    transactionBuilder.addOutput(
      outputData,
      parseInt(sendAmount)
    )
    outputsCount += 1
    totalOutput = totalOutput.plus(sendAmount)
  }

  outputsCount += 1  // Add extra for sending the BCH change,if any
  let byteCount = bchjs.BitcoinCash.getByteCount(
    {
      P2PKH: inputsCount
    },
    {
      P2PKH: outputsCount
    }
  )

  const feeRate = 1.1 // 1.1 sats/byte fee rate

  let txFee = Math.ceil(byteCount * feeRate)
  let senderRemainder = 0

  // Send the BCH change back to the wallet, if any
  senderRemainder = totalInput.minus(totalOutput.plus(txFee))
  if (senderRemainder.isGreaterThan(this.dustLimit)) {
    transactionBuilder.addOutput(
      bchjs.Address.toLegacyAddress(changeAddress),
      parseInt(senderRemainder)
    )
  } else {
    txFee += senderRemainder.toNumber()
  }

  let combinedUtxos = bchUtxos.utxos

  // Sign each token UTXO being consumed.
  let redeemScript
  for (let i = 0; i < keyPairs.length; i++) {
    const utxo = combinedUtxos[i]
    transactionBuilder.sign(
      i,
      keyPairs[i],
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      parseInt(utxo.value)
    )
  }

  const tx = transactionBuilder.build()
  const hex = tx.toHex()

  if (broadcast === true) {
    try {
      const response = await wallet.BCH.watchtower.BCH.broadcastTransaction(hex)
      return response.data
    } catch (error) {
      return error.response.data
    }
  } else {
    return {
      success: true,
      transaction: hex,
      fee: txFee
    }
  }
}
