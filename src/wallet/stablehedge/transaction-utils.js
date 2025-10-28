import { SignatureTemplate, Transaction } from "cashscript"
import { hash256, placeholder, scriptToBytecode } from "@cashscript/utils"
import { cashScriptOutputToLibauthOutput, createInputScript, createSighashPreimage, getInputSize, getOutputSize, getPreimageSize, publicKeyToP2PKHLockingBytecode } from "cashscript/dist/utils";
import { binToHex, cashAddressToLockingBytecode, encodeTransactionBCH, hexToBin } from "@bitauth/libauth";
import { P2PKH_INPUT_SIZE } from "cashscript/dist/constants";

/**
 * Taken directly from Transaction class' fee calculation
 * Returns the bytesize of contract's transaction input
 * @param {Transaction} transaction
 */
export function calculateInputSize(transaction) {
  const redeemScript = transaction.redeemScript || transaction.contract?.redeemScript
  const placeholderArgs = transaction.args.map((arg) => (arg instanceof SignatureTemplate ? placeholder(65) : arg));
  // Create a placeholder preimage of the correct size
  const placeholderPreimage = transaction.abiFunction.covenant
      ? placeholder(getPreimageSize(scriptToBytecode(redeemScript)))
      : undefined;
  // Create a placeholder input script for size calculation using the placeholder
  // arguments and correctly sized placeholder preimage
  const placeholderScript = createInputScript(redeemScript, placeholderArgs, transaction.selector, placeholderPreimage);

  // Add one extra byte per input to over-estimate tx-in count
  const contractInputSize = getInputSize(placeholderScript) + 1;
  return contractInputSize
}

/**
 * @param {Object} opts
 * @param {SignatureTemplate} opts.template
 * @param {Number} opts.inputIndex
 * @param {import("@bitauth/libauth").TransactionBCH} opts.transaction
 * @param {import("@bitauth/libauth").Output[]} opts.sourceOutputs
 * @param {Boolean} [opts.includeSignature]
 */
export function unlockP2PKH(opts) {
  const template = opts?.template;
  const transaction = opts?.transaction
  const sourceOutputs = opts?.sourceOutputs
  const inputIndex = opts?.inputIndex

  const pubkey = template.getPublicKey();
  const prevOutScript = publicKeyToP2PKHLockingBytecode(pubkey);
  const hashtype = template.getHashType();
  const preimage = createSighashPreimage(transaction, sourceOutputs, inputIndex, prevOutScript, hashtype);
  const sighash = hash256(preimage);
  const signature = template.generateSignature(sighash);
  
  const inputScript = scriptToBytecode([signature, pubkey]);
  if (opts?.includeSignature) {
    return { signature, pubkey, hashtype, inputScript }
  }
  return inputScript
}

/**
 * @param {Object} opts
 * @param {Number} opts.hashType
 * @param {Uint8Array} opts.pubkey
 * @param {Uint8Array} opts.signature
 */
export function mockSignatureTemplate(opts) {
  const template = new SignatureTemplate({}, opts?.hashType)
  template.getPublicKey = () => opts?.pubkey
  template.generateSignature = () => opts?.signature
  return template
}

/**
 * @param {String} contractAddress
 * @param {Object} tx 
 * @param {Number} [tx.version]
 * @param {Number} tx.locktime
 * @param {import("cashscript").Utxo[]} tx.inputs
 * @param {import("cashscript").Recipient[]} tx.outputs
 */
export function cashscriptTxToLibauth(contractAddress, tx) {
  const transaction = {
    version: tx?.version || 2,
    locktime: tx?.locktime,
    inputs: tx?.inputs?.map(input => {
      return {  
        outpointIndex: input?.vout,
        outpointTransactionHash: hexToBin(input?.txid),
        sequenceNumber: 0xfffffffe,
        unlockingBytecode: new Uint8Array(),
      }
    }),
    outputs: tx?.outputs?.map(cashScriptOutputToLibauthOutput),
  }

  let contractBytecode
  const sourceOutputs = tx?.inputs?.map(input => {
    const pubkey = input?.template?.getPublicKey?.();
    const sourceBytecode = pubkey ? publicKeyToP2PKHLockingBytecode(pubkey) : null;

    // lazy loading contractAddress' bytecode
    if (!sourceBytecode && !contractBytecode) {
      contractBytecode = cashAddressToLockingBytecode(contractAddress)
      if (typeof contractBytecode === 'string') throw new Error(contractBytecode)
      contractBytecode = contractBytecode.bytecode
    }

    const sourceOutput = {
      to: sourceBytecode || contractBytecode,
      amount: BigInt(input?.satoshis),
      token: input?.token,
    }

    return cashScriptOutputToLibauthOutput(sourceOutput);
  })

  return { transaction, sourceOutputs }
}

export class TransactionBalancer {
  /**
   * @callback InputSizeCalculator
   * @returns {Number | undefined}
   * 
   * @param {Object} opts
   * @param {InputSizeCalculator} opts.inputSizeCalculator
   */
  constructor(opts) {
    /** @type {import("cashscript").Utxo[]} */
    this.inputs = []

    /** @type {import("cashscript").Recipient[]} */
    this.outputs = []

    this.inputSizeCalculator = opts?.inputSizeCalculator

    this.feePerByte = 1
    this.locktime = NaN
  }

  get inputSats() {
    return this.inputs
      .map(input => input.satoshis)
      .reduce((subtotal, sats) => subtotal + sats, 0n)
  }

  get outputSats() {
    return this.outputs
      .map(output => output.amount)
      .reduce((subtotal, sats) => subtotal + sats, 0n)
  }

  get txSize() {
    const inputsSize = this.inputs
      .map(input => this.inputSizeCalculator?.(input) || P2PKH_INPUT_SIZE)
      .map(BigInt)
      .reduce((subtotal, size) => subtotal + size, 0n)

    const outputsSize = this.outputs
      .map(getOutputSize).map(BigInt)
      .reduce((subtotal, size) => subtotal + size, 0n)

    return 10n + inputsSize + outputsSize
  }

  get txFee() {
    // Use integer arithmetic to avoid floating-point precision issues
    // Convert feePerByte to fixed-point: multiply by 1000000, divide result by 1000000
    // Higher precision to handle multiple inputs better
    const feePerByteScaled = Math.round(this.feePerByte * 1000000)
    const feeScaled = this.txSize * BigInt(feePerByteScaled)
    // Always round up (ceiling) to ensure we never underpay
    // This matches what JPP servers expect
    const fee = (feeScaled + 999999n) / 1000000n
    return fee
  }

  get excessSats() {
    return this.inputSats - this.outputSats - this.txFee
  }

  inputTokens(category='') {
    return this.inputs.filter(input => input?.token?.category === category)
      .map(input => input.token.amount)
      .reduce((subtotal, amount) => subtotal + amount, 0n)
  }

  outputTokens(category='') {
    return this.outputs.filter(output => output?.token?.category === category)
      .map(output => output.token.amount)
      .reduce((subtotal, amount) => subtotal + amount, 0n)
  }

  tokenChange(category='') {
    return this.inputTokens(category) - this.outputTokens(category)
  }

  build() {
    const { transaction, sourceOutputs } = cashscriptTxToLibauth('', {
      locktime: this.locktime,
      inputs: this.inputs,
      outputs: this.outputs,
    })

    transaction.inputs.forEach((input, index) => {
      const unlockingBytecode = unlockP2PKH({
        template: this.inputs[index].template,
        transaction: transaction,
        sourceOutputs: sourceOutputs,
        inputIndex: index,
      })
      transaction.inputs[index].unlockingBytecode = unlockingBytecode;
    })

    return binToHex(encodeTransactionBCH(transaction))
  }

  buildUnsigned() {
    const { transaction } = cashscriptTxToLibauth('', {
      locktime: this.locktime,
      inputs: this.inputs,
      outputs: this.outputs,
    })

    transaction.inputs.forEach((input, index) => {
      transaction.inputs[index].unlockingBytecode = new Uint8Array()
    })

    return binToHex(encodeTransactionBCH(transaction))
  }
}
