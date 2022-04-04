import BCHJS from '@psf/bch-js'
import axios from 'axios'
import { utils, BigNumber } from 'ethers'
import { provider, bridgeContract, addresses } from './config'

const bchjs = new BCHJS()

function toBigNumber(value) {
  return BigNumber.from('0x' + BigInt(value).toString(16)) 
}

function isValidMainchainAddress(address) {
  try{
    return bchjs.Address.isCashAddress(address) || bchjs.Address.isLegacyAddress(address)
  } catch {}
  return false
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
 * @param {number} fee in BCH that is sent to paytaca's fee receiver,
 *                      the value of fee is inclusive to the value specified in amount parameter
 * @param {string} changeAddress bch address 
 * @returns 
 */
export async function c2s(wallet, amount, recipientAddress, fee=0, changeAddress) {
  if (!utils.isAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid SmartBCH address',
    }
  }

  const recipients = [
    { address: addresses.cash2smart.receiver, amount: amount }
  ]

  if (!isValidMainchainAddress(addresses.cash2smart.paytacaFeeReceiver) && fee > 0) {
    recipients.push({
      address: addresses.cash2smart.paytacaFeeReceiver,
      amount: fee,
    })
    recipients[0].amount = Number(amount) - fee
  }

  const kwargs = {
    sender: {
      walletHash: wallet.BCH.walletHash,
      mnemonic: wallet.BCH.mnemonic,
      derivationPath: wallet.BCH.derivationPath
    },
    recipients: recipients,
    data: recipientAddress,
    changeAddress: changeAddress,
    wallet: {
      mnemonic: wallet.BCH.mnemonic,
      derivationPath: wallet.BCH.derivationPath
    },
    broadcast: true
  }

  const result = await wallet.BCH.watchtower.BCH.send(kwargs)
  return result
}

/**
 * Sends a smart to cash,incoming type transaction
 * @param {Wallet} amount in sBCH 
 * @param {number} amount in sBCH 
 * @param {number} fee in BCH that is sent to paytaca's fee receiver,
 *                      the value of fee is inclusive to the value specified in amount parameter
 * @param {string} recipientAddress address of bch wallet
 * @returns 
 */
export async function s2c(wallet, amount, recipientAddress, fee=0) {

  if (!isValidMainchainAddress(recipientAddress)) {
    return {
      success: false,
      error: 'Recipient address must be a valid cash/legacy address',
    }
  }

  let parsedAmount = amount
  let hasFee = false
  if (fee > 0 && utils.isAddress(addresses.smart2cash.paytacaFeeReceiver)) {
    hasFee = true
    parsedAmount = Number(amount) - fee
  }
  
  const response = await wallet.sBCH.sendBchWithData(
    String(parsedAmount),
    addresses.smart2cash.receiver,
    '0x' + Buffer.from(bchjs.Address.toLegacyAddress(recipientAddress), 'utf8').toString('hex')
  )

  if (response.success && hasFee) {
    const feeTx = wallet.sBCH.sendBCH(
      fee,
      addresses.smart2cash.paytacaFeeReceiver
    )

    response.feeTx = feeTx
  }

  return response
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
  // return {
  //   success: false,
  // }
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
    contract.removeListener(filter, eventCallback) 
  }
}


function matchOpReturn(txId, txData) {
  const asmRegex = /^OP_RETURN ([0-9a-f]{64})$/
  const outputs = txData?.vout
  if (!Array.isArray(outputs)) return false

  for(var i = 0; i < outputs.length; i++) {
    const match = String(outputs[i]?.scriptPubKey?.asm).match(asmRegex)
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
    let data
    try {
      data = JSON.parse(message.data)
    } catch(error) {
      console.log(error)
      return
    }
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
