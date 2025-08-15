import {
  cashAddressToLockingBytecode,
  encodeTransactionCommon,
  getDustThreshold,
  hexToBin,
  binToHex, 
  getMinimumFee,
  generateTransaction,
  encodeTransactionOutput} from 'bitauth-libauth-v3'
import Big from 'big.js'
import { getCompiler, getLockingData } from './wallet.js'
import { hdPublicKey0H } from './fixtures/wallets.js'

/**
 * @typedef {object} Recipient
 * @property {string} address - The recipient address
 * @property {string} amount - The raw amount entered on the UI, Example: 0.0001
 * @property {'bch'|string} asset - The asset identifier, if not 'bch' value is token category
 * @property {number} decimals - The decimals spec of the asset 8 if 'bch'
 * @property {string} [commitment] - The NFT commitment if sending a particular NFT 
 * @property {string} [capability] - The NFT capability
 */

/**
 * @typedef {object} TransactionProposal
 * @property {string} [creator] - The xpub key of the proposal creator
 * @property {string} origin - The origin of the transaction
 * @property {string} purpose 
 * @property {Recipient[]} recipients
 */

/**
 * @param { CommonUtxo } utxo
 * @returns { import("@bitauth/libauth").Output }
 */
export function commonUtxoToLibauthOutput (utxo, lockingBytecode) {
  const output = {
    lockingBytecode,
    valueSatoshis: BigInt(utxo.satoshis)
  }

  if (typeof (lockingBytecode) === 'string') {
    output.lockingBytecode = hexToBin(output.lockingBytecode)
  }

  if (utxo.token) {
    output.token = {}
    output.token.amount = BigInt(utxo.token.amount)
    output.token.category = hexToBin(utxo.token.category)
    if (utxo.token.nft) {
      output.token.nft.capability = utxo.token.nft.capability
      output.token.nft.commitment = hexToBin(utxo.token.nft.commitment)
    }
  }
  return output
}

/**
 * @param {Recipient[]} recipients
 * @param {number} m - The number of signers that will be signing this output
 * @param {number} n - Max number of signers 
 */
export function recipientsToLibauthTransactionOutputs(recipients, m, n) {
  return recipients.map(r => {

    let valueSatoshis = 0

    if (r.asset === 'bch') {
      valueSatoshis = BigInt(Big(r.amount).mul(1e8).toString()) 
    }

    const output = {
      lockingBytecode: cashAddressToLockingBytecode(r.address).bytecode,
      valueSatoshis: BigInt(valueSatoshis)
    }

    let tokenAmount = 0

    if (r.asset !== 'bch') {
      output.token = {
        category: hexToBin(r.asset)
      }
    }

    if (output.token && Number(r.amount) > 0) {
      tokenAmount = BigInt(Big(r.amount).mul(`1e${r.decimals || 0}`).toString())
      output.token.amount = BigInt(tokenAmount)
    }

    if (output.token && r.capability) {
      if (tokenAmount > 0) throw new Error('Semi fungible token not yet supported!')
      output.token.nft.capability = r.capability
      output.token.nft.commitment = hexToBin(r.commitment)
    }

    if (output.token) {
      output.valueSatoshis = getMofNDustThreshold(m, n, output)
    }

    return output
  })
}


export function getMofNDustThreshold (m, n, output, dustRelayFeeSatPerKb = 1000) {
  const pubkeyLen = 33
  const redeemScriptLen = 
      1                                 // OP_m
    + (n * (1 + pubkeyLen))             // Pubkey push
    + 1                                 // OP_n
    + 1                                 // OP_CHECKMULTISIG

  let redeemScriptPushOverhead = 2
  const inputSize =
      32                                // prev txid
    + 4                                 // prev index
    + 1                                 // scriptSig length prefix
    + 1                                 // OP_0 or check bits
    + m * (1 + 72)                  // m signatures (each with 1-byte push + sigLen) assumes ecdsa (it covers schnorr)
    + redeemScriptPushOverhead          // 1 byte if redeemScript ≤75 bytes, else 2 bytes
    + redeemScriptLen                   // redeemScript: OP_m + n×<push+pubkey> + OP_n + OP_CHECKMULTISIG
    + 4                                 // sequence

  console.log('input size', inputSize)
  const encodedOutput = encodeTransactionOutput(output)
  const dustThreshold = 3 * dustRelayFeeSatPerKb *  (encodedOutput.length + inputSize) / 1000
  return BigInt(dustThreshold)
}

/**
 * @param {import('bitauth-libauth-v3').WalletTemplate} template
 * @param {import('bitauth-libauth-v3').Input[]} inputs - With attached sourceOutput
 * @param {import('bitauth-libauth-v3').Output[]} outputs
 * @param {import('./wallet.js').MultisigWalletSigner[]} signers
 */
export function estimateFee (inputs, outputs, template) {
    // // // Estimate fee
    // const outpointTransactionHashSize = 32
    // const outpointIndexSize = 4
    // const unlockingBytecodeLengthSize = 1
    // const scriptSigLengthSize = m * 1
    // const scriptSigDummyByteSize = 1
    // const pushSignatureSize = 73 // 72 Assumes ESCDA, SCHNORR is covered by this value + 1 (push)


    const compiler = getCompiler({ template })
    const sampleEntityId = Object.keys(template.entities)[0]
    const sampleScriptId = template.entities[sampleEntityId].scripts.find((scriptId) => scriptId !== 'lock')
    const scenario = compiler.generateScenario({
      unlockingScriptId: sampleScriptId
    })

    const unlockingBytecode = scenario.program.transaction.inputs[0].unlockingBytecode

    console.log('UNLOCKING', binToHex(unlockingBytecode))
    console.log('inputs', scenario.program.transaction.inputs[0])
    console.log('scenario outputs', scenario.program.transaction.outputs)

    const satoshiChange = {
      lockingBytecode: inputs[0].sourceOutput.lockingBytecode,
      valueSatoshis: 1000n
    }

    let tokenChange = null

    if (inputs?.filter(i => i?.sourceOutput?.token)?.length >0) {
      tokenChange = {
        lockingBytecode: inputs[0].sourceOutput.lockingBytecode,
        valueSatoshis: 1000n,
        token: inputs?.filter(i => i?.sourceOutput?.token)[0]
      }
    }

    console.log('Inputs', inputs)
    inputs.forEach(u => {
      u.unlockingBytecode = unlockingBytecode
      return u
    })

    scenario.program.transaction.inputs = inputs

    scenario.program.transaction.outputs = [...outputs, satoshiChange]

    // if (!isDustOutput(changeOutput)) {
    //   scenario.program.transaction.outputs.push(changeOutput)
    // }

    const dustRelayFeeSatPerKb = 1100n // We'll just increase the default
    const transactionForFeeEstimation = generateTransaction(scenario.program.transaction)
    const estimatedTransactionSize = encodeTransactionCommon(transactionForFeeEstimation.transaction).length
    console.log('Transaction Size', estimatedTransactionSize)
    const minimumFee = getMinimumFee(BigInt(estimatedTransactionSize), dustRelayFeeSatPerKb)
    console.log('Minimum Fee', minimumFee)
    // // selectWithFee
    // selectUtxosOptions.targetAmount = sendAmount + minimumFee
    // const finalSelected = selectUtxos(utxos.value.utxos, selectUtxosOptions)
    // const finalInputs = finalSelected.selectedUtxos.map(u => commonUtxoToLibauthInput(u, [])) // without unlocking bytecode
    // const finalChangeOutput = {
    //   lockingBytecode: getLockingBytecode(multisigWallet.value).bytecode,
    //   valueSatoshis: finalSelected.total - sendAmount - minimumFee
    // }

    // if (!isDustOutput(finalChangeOutput)) {
    //   outputs.push(finalChangeOutput)
    // }

    // const finalTransaction = {
    //   locktime: 0,
    //   version: 2,
    //   inputs: finalInputs,
    //   outputs: outputs
    // }

    // console.log('Final utxo selections', finalSelected)
    // if (finalSelected.total < sendAmount + minimumFee) {
    //   $q.dialog({ message: 'Insufficient Balance' })
    // }



}


export class MultisigTransactionBuilder {

  constructor() {
    this.inputs = []
    this.outputs = []
    this.locktime = 0
    this.version = 2
  }

  setLocktime (locktime) {
    this.locktime = locktime
    return this
  }

  /**
   * 
   * @param { import("@bitauth/libauth").Input[] } inputs
   */
  addInputs(inputs) {
    this.inputs = this.inputs.concat(inputs)
    return this
  }
  
  /**
   * 
   * @param { import("@bitauth/libauth").Output[] } outputs
   */
  addOutputs(outputs) {
    this.outputs = this.outputs.concat(outputs)
    return this
  }

  build() {
    return binToHex(
      encodeTransactionCommon({
        inputs: this.inputs,
        outputs: this.outputs,
        version: this.version,
        locktime: this.locktime
      })
    )
  }
}