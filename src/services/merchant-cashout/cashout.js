import { backend } from 'src/wallet/pos'
import {
  hexToBin,
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
  importAuthenticationTemplate,
  authenticationTemplateToCompilerBCH,
  authenticationTemplateP2pkhNonHd,
  decodePrivateKeyWif,
  cashAddressToLockingBytecode,
  generateTransaction,
  encodeTransaction
} from '@bitauth/libauth'
import { mnemonicToSeedSync } from 'bip39'
import Watchtower from 'src/lib/watchtower'

const watchtower = new Watchtower()

function parseResponseToUtxo (utxos) {
  // get the cumulative value of the utxos
  // get the fees (use the transaction balancer)

  let cumulativeValue = 0n
  let inputBytes = 0
  const filteredUtxos = []
  for (let i = 0; i < utxos.length; i++) {
    cumulativeValue = cumulativeValue + BigInt(utxos[i].value)
    filteredUtxos.push(utxos[i])
    inputBytes += 180 // average byte size of a single input
  }
  return {
    inputBytes: inputBytes,
    cumulativeValue: cumulativeValue,
    utxos: filteredUtxos.map(function (item) {
      return {
        tx_hash: item.txid,
        tx_pos: item.vout,
        block: item.block,
        value: BigInt(item.value),
        wallet_index: item.wallet_index,
        address_path: item.address_path
      }
    })
  }
}

export async function getBchUtxosByWallet (walletHash) {
  const response = await backend.get(`/utxo/wallet/${walletHash}/`)
  return response.data.utxos
}

export async function getBchUtxosByAddress (address) {
  let utxos = []
  await backend.get(`/utxo/bch/${address}/`)
    .then(response => {
      utxos = parseResponseToUtxo(response.data.utxos)
    })
    .catch(error => { console.error(error.response || error) })
  return utxos
}

function retrievePrivateKey (mnemonic, derivationPath, addressPath) {
  const seedBuffer = mnemonicToSeedSync(mnemonic)
  const masterHDNode = deriveHdPrivateNodeFromSeed(seedBuffer, true)
  const child = deriveHdPath(masterHDNode, `${derivationPath}/${addressPath}`)
  if (typeof child === 'string') {
    throw new Error(child)
  }

  return child.privateKey
}

export async function sendUtxos (params) {
  const sender = params?.sender
  const recipient = params?.recipient
  const parsedUtxos = parseResponseToUtxo(params?.utxos)
  const broadcast = params?.broadcast

  const template = importAuthenticationTemplate(
    authenticationTemplateP2pkhNonHd
  )

  if (typeof template === 'string') {
    return {
      success: false,
      error: 'Transaction template error'
    }
  }

  const compiler = authenticationTemplateToCompilerBCH(template)
  const transaction = {
    inputs: [],
    locktime: 0,
    outputs: [],
    version: 2
  }

  let totalInput = 0n
  const utxos = parsedUtxos.utxos
  for (const utxo of utxos) {
    totalInput = totalInput + utxo.value

    // get inputPrivKey
    let inputPrivKey
    if (sender?.walletHash) {
      let addressPath
      if (utxo.address_path) {
        addressPath = utxo.address_path
      } else {
        addressPath = utxo.wallet_index
      }

      inputPrivKey = retrievePrivateKey(
        sender.mnemonic,
        sender.derivationPath,
        addressPath
      )
    } else {
      const decodeResult = decodePrivateKeyWif(sender.wif);
      if (typeof decodeResult === 'string') {
        return {
          success: false,
          error: decodeResult
        }
      }
      inputPrivKey = decodeResult.privateKey
    }

    transaction.inputs.push({
      outpointIndex: utxo.tx_pos,
      outpointTransactionHash: hexToBin(utxo.tx_hash),
      sequenceNumber: 0,
      unlockingBytecode: {
        compiler,
        data: {
          keys: { privateKeys: { key: inputPrivKey } },
        },
        valueSatoshis: utxo.value,
        script: 'unlock',
        // token: libauthToken
      }
    })
  }

  transaction.outputs.push({
    lockingBytecode: cashAddressToLockingBytecode(recipient.address).bytecode,
    valueSatoshis: totalInput
  })

  console.log('inputs:', transaction.inputs)
  console.log('outputs:', transaction.outputs)

  const estimatedTransaction = generateTransaction(transaction)
  if (!estimatedTransaction.success) {
    console.error(estimatedTransaction.errors)
    return {
      success: false,
      error: `${JSON.stringify(estimatedTransaction.errors, null, 2)}`
    }
  }
  const estimatedTransactionBin = encodeTransaction(estimatedTransaction.transaction)
  const byteCount = estimatedTransactionBin.length
  const feeRate = 1.2 // 1.2 sats/byte fee rate
  const txFee = BigInt(Math.ceil(byteCount * feeRate))
  const totalOutput = totalInput - txFee

  // change output amount to input amount - fees
  transaction.outputs[0].valueSatoshis = totalOutput

  console.log('totalInput:', totalInput)
  console.log('txFee:', txFee)
  console.log('totalOutput:', totalOutput)

  const result = generateTransaction(transaction)

  if (!result.success) {
    console.error('error:', result.errors)
    return {
      success: false,
      error: `${JSON.stringify(result.errors, null, 2)}`
    }
  }
  const hex = binToHex(encodeTransaction(result.transaction))

  if (broadcast) {
    try {
      const response = await watchtower.BCH._api.post('broadcast/', { transaction: hex })
      console.log('broadcast: ', response.data)
      return response.data
    } catch (error) {
      console.error(error.response || error)
      return error.response.data
    }
  } else {
    const txDetails = {
      success: true,
      transaction: hex,
      fee: txFee
    }

    console.log('txDetails:', txDetails)
    return txDetails
  }
}

import BCHJS from '@psf/bch-js'
const bchjs = new BCHJS()
import { pubkeyToAddress } from 'src/utils/crypto'

function getPubkeyAt (xpubkey) {
  const mainNode = bchjs.HDNode.fromXPub(xpubkey)
  const childNode = mainNode.derivePath(String(13))
  return bchjs.HDNode.toPublicKey(childNode).toString('hex')
}

export async function generateAddressFromXPubKey (xpubkey) {
  const pubkey = getPubkeyAt(xpubkey)
  const address = pubkeyToAddress(pubkey)
  console.log('pubkey', pubkey)
  console.log('address:', address)
}
