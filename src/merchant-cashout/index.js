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

/**
 * CashoutTransactionBuilder class handles the creation and broadcasting of BCH transactions
 * for merchant cashouts. It utilizes the @bitauth/libauth library for transaction
 * generation and encoding, and Watchtower for broadcasting transactions.
 *
 * This class accepts manually selected UTXOs as inputs and creates a single fixed output.
 * There is no sending of change because the entire input value, minus the transaction fees,
 * is sent to the recipient.
 *
 * @class CashoutTransactionBuilder
 */
export default class CashoutTransactionBuilder {
  constructor () {
    this.compiler = authenticationTemplateToCompilerBCH(this.buildTemplate())
    this.transaction = {
      inputs: [],
      locktime: 0,
      outputs: [],
      version: 2
    }
  }

  get txFee () {
    const estimatedTransaction = generateTransaction(this.transaction)
    if (!estimatedTransaction.success) {
      console.error(estimatedTransaction.errors)
      throw new Error({
        success: false,
        error: `${JSON.stringify(estimatedTransaction.errors, null, 2)}`
      })
    }
    const estimatedTransactionBin = encodeTransaction(estimatedTransaction.transaction)
    const byteCount = estimatedTransactionBin.length
    const feeRate = 1.2 // 1.2 sats/byte fee rate
    return BigInt(Math.ceil(byteCount * feeRate))
  }

  async sendUtxos ({ sender, payoutAddress, broadcast, utxos }) {
    const selectedUtxos = this.transformUtxos(utxos)

    const { totalInputValue, inputs } = this.buildInputUtxos({
      sender: sender,
      compiler: this.compiler,
      utxos: selectedUtxos.utxos
    })

    this.addInputs(inputs)
    this.addOutputs([{
      lockingBytecode: cashAddressToLockingBytecode(payoutAddress).bytecode,
      valueSatoshis: totalInputValue
    }])

    const txFee = this.txFee
    const totalOutput = totalInputValue - this.txFee

    // change output amount to totalOutput
    this.transaction.outputs[0].valueSatoshis = totalOutput

    // rebuild transaction with updated output value
    const txHex = this.buildTransaction()

    let result
    if (broadcast) {
      result = await this.broadcastTransaction(txHex)
    } else {
      result = {
        success: true,
        transaction: txHex,
        fee: txFee
      }
    }
    result.payoutAddress = payoutAddress
    console.log('result:', result)
    return result
  }

  async fetchPayoutAddress ({ orderId }) {
    const params = {
      order_id: orderId,
      fixed: false
    }
    try {
      const response = await backend.get('/paytacapos/cash-out/payout_address/', { params: params })
      console.log(response)
      return response.data?.payout_address
    } catch (error) {
      console.error(error.response || error)
    }
  }

  buildTemplate () {
    const template = importAuthenticationTemplate(
      authenticationTemplateP2pkhNonHd
    )

    if (typeof template === 'string') {
      throw new Error({
        success: false,
        error: 'Transaction template error'
      })
    }
    return template
  }

  buildInputUtxos ({ sender, utxos }) {
    const compiler = this.compiler

    let totalInput = 0n
    const inputs = []
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

        inputPrivKey = this.retrievePrivateKey(
          sender.mnemonic,
          sender.derivationPath,
          addressPath
        )
      } else {
        const decodeResult = decodePrivateKeyWif(sender.wif)
        if (typeof decodeResult === 'string') {
          return {
            success: false,
            error: decodeResult
          }
        }
        inputPrivKey = decodeResult.privateKey
      }

      inputs.push({
        outpointIndex: utxo.tx_pos,
        outpointTransactionHash: hexToBin(utxo.tx_hash),
        sequenceNumber: 0,
        unlockingBytecode: {
          compiler,
          data: {
            keys: { privateKeys: { key: inputPrivKey } }
          },
          valueSatoshis: utxo.value,
          script: 'unlock'
        }
      })
    }

    return {
      totalInputValue: totalInput,
      inputs: inputs
    }
  }

  addInputs (utxos) {
    this.transaction.inputs.push(...utxos)
  }

  addOutputs (recipients) {
    this.transaction.outputs.push(...recipients)
  }

  buildTransaction () {
    const result = generateTransaction(this.transaction)
    if (!result.success) {
      console.error('error:', result.errors)
      throw new Error({
        success: false,
        error: `${JSON.stringify(result.errors, null, 2)}`
      })
    }
    const hex = binToHex(encodeTransaction(result.transaction))
    return hex
  }

  async broadcastTransaction (txHex) {
    try {
      const response = await watchtower.BCH._api.post('broadcast/', { transaction: txHex })
      return response.data
    } catch (error) {
      console.error(error.response || error)
      return error.response.data
    }
  }

  async getBchUtxosByWallet (walletHash) {
    const response = await watchtower.BCH._api.get(`/utxo/wallet/${walletHash}/`)
    return response.data.utxos
  }

  async getBchUtxosByAddress (address) {
    const response = await backend.get(`/utxo/bch/${address}/`)
    return response.data.utxos
  }

  transformUtxos (utxos) {
    let cumulativeValue = 0n
    let inputBytes = 0
    for (const utxo of utxos) {
      cumulativeValue = cumulativeValue + BigInt(utxo.value)
      inputBytes += 180 // average byte size of a single input
    }
    return {
      inputBytes: inputBytes,
      cumulativeValue: cumulativeValue,
      utxos: utxos.map(function (item) {
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

  retrievePrivateKey (mnemonic, derivationPath, addressPath) {
    const seedBuffer = mnemonicToSeedSync(mnemonic)
    const masterHDNode = deriveHdPrivateNodeFromSeed(seedBuffer, true)
    const child = deriveHdPath(masterHDNode, `${derivationPath}/${addressPath}`)
    if (typeof child === 'string') {
      throw new Error(child)
    }

    return child.privateKey
  }
}
