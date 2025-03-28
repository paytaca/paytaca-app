import {
  encodeTransactionCommon,
  hashTransaction,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH,
  CashAddressNetworkPrefix,
  generateTransaction,
  binToHex,
  extractResolvedVariables
} from 'bitauth-libauth-v3'

/**
 * Generates an unique identifier for the PST.
 */
export const generateId = ({ transaction }) => {
  const inputs = structuredClone(transaction.inputs)
  const outputs = structuredClone(transaction.outputs)
  inputs.forEach(input => {
    input.unlockingBytecode = new Uint8Array([])
    // encodeTransactionCommon throws if expected bin is an object instead of Uint8Array
    input.outpointTransactionHash = Uint8Array.from(input.outpointTransactionHash)
  })
  outputs.forEach(output => {
    output.lockingBytecode = Uint8Array.from(output.lockingBytecode)
  })
  const unofficialPreimage = {
    locktime: transaction.locktime,
    outputs: transaction.outputs,
    version: transaction.version,
    inputs: inputs
  }
  const encoded = encodeTransactionCommon(unofficialPreimage)
  return hashTransaction(encoded)
}

export class Pst {
  constructor ({ m, n, lockingData, lockingScriptId, template, network }) {
    this.m = m
    this.n = n
    this.lockingData = lockingData
    this.lockingScriptId = lockingScriptId
    this.template = template
    this.transaction = {}
    // this.compiler = walletTemplateToCompilerBCH(template)
    this.network = network || CashAddressNetworkPrefix.mainnet
    this.signatures = {}
  }

  get compiler () {
    return walletTemplateToCompilerBCH(this.template)
  }

  setTransaction ({ transaction, sourceOutputs }) {
    this.transaction = structuredClone(transaction)
    this.sourceOutputs = structuredClone(sourceOutputs)
    this.transaction.inputs.forEach(input => {
      input.outpointTransactionHash = Uint8Array.from(Object.values((input.outpointTransactionHash)))
      input.unlockingBytecode = Uint8Array.from(Object.values((input.unlockingBytecode)))
    })
    this.id = generateId({ transaction })
  }

  getTransactionProposal () {
    const outputs = structuredClone(this.transaction.outputs)
    outputs.forEach(o => { o.lockingBytecode = Uint8Array.from(Object.values(o.lockingBytecode)) })
    return {
      locktime: this.transaction.locktime,
      outputs: outputs,
      version: this.transaction.version
    }
  }

  signTransaction (entityPrivateKey /* example: { signer_1: privatekeyofsigner1 } */) {
    const [entity, privateKey] = Object.entries(entityPrivateKey)[0]
    const entityUnlockingData = {
      ...this.lockingData,
      hdKeys: {
        ...this.lockingData.hdKeys,
        hdPrivateKeys: {
          [entity]: privateKey
        }
      }
    }

    const lockingBytecode = this.compiler.generateBytecode({
      data: this.lockingData,
      scriptId: this.lockingScriptId
    })

    const { address } = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: this.network
    })

    const unlockingScriptId = this.template.entities[entity].scripts.filter((scriptId) => scriptId !== 'lock')[0]

    for (const input of this.transaction.inputs) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(utxo.outpointTransactionHash) === binToHex(input.outpointTransactionHash)
        })
      }
      if (lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network }).address === address) {
        input.unlockingBytecode = {
          ...input.unlockingBytecode,
          compiler: this.compiler,
          data: entityUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId
          // TODO: token: sourceOutput.token test utxo with a token
        }
      }
    }
    const inputs = [...this.transaction.inputs]
    inputs.forEach(i => delete i.sourceOutput)
    const signAttempt = generateTransaction({ ...this.getTransactionProposal(), inputs })
    const signerResolvedVariables = extractResolvedVariables(signAttempt)
    this.signatures = {
      ...this.signatures,
      ...signerResolvedVariables
    }
    return signerResolvedVariables
  }

  getUnlockingScriptId ({ signatures, template }) {
    return Pst.getUnlockingScriptId({ signatures, template })
  }

  finalize () {
    const fullUnlockingData = {
      ...this.lockingData,
      bytecode: {
        ...this.signatures
        // 'key1.ecdsa_signature.all_outputs': expectedSigner1Signature,
        // 'key2.ecdsa_signature.all_outputs': expectedSigner2Signature,
        // ...signer1ResolvedVariables,
        // ...signer2ResolvedVariables,
        // ...signer3ResolvedVariables
      }
    }

    const lockingBytecode = this.compiler.generateBytecode({
      data: this.lockingData,
      scriptId: this.lockingScriptId
    })

    const { address } = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: this.network
    })

    const unlockingScriptId = this.getUnlockingScriptId({ signatures: this.signatures, template: this.template })

    for (const input of this.transaction.inputs) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(utxo.outpointTransactionHash) === binToHex(input.outpointTransactionHash)
        })
      }
      if (lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network }).address === address) {
        input.unlockingBytecode = {
          ...input.unlockingBytecode,
          compiler: this.compiler,
          data: fullUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
    }

    const successfulCompilation = generateTransaction({
      ...this.getTransactionProposal(),
      inputs: this.transaction.inputs
    })

    return successfulCompilation
  }

  save (store) {
    // TODO: serialize pst before saving?
    store(this)
  }

  static getUnlockingScriptId ({ signatures, template }) {
    const scriptsEntries = Object.entries(template.scripts)
    const unlockingScript = scriptsEntries.find(([scriptId, value]) => {
      let found = value.unlocks && scriptId !== 'lock'
      found = Object.keys(signatures).every((signatureKey) => {
        return value.script.includes(signatureKey)
      }) // Example signatureKey = key2.ecdsa_signature.all_outputs

      return found
    })
    return unlockingScript[0]
  }

  static fromJSON (stringifiedPst) {
    const { transaction, ...rest } = JSON.parse(stringifiedPst)
    const pst = new Pst({ rest })
    pst.setTransaction(transaction)
    return pst
  }
}
