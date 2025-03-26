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
  inputs.forEach(input => {
    input.unlockingBytecode = new Uint8Array([])
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
  constructor ({ lockingData, lockingScriptId, template, network }) {
    this.lockingData = lockingData
    this.lockingScriptId = lockingScriptId
    this.template = template
    this.transaction = {}
    this.compiler = walletTemplateToCompilerBCH(template)
    this.network = network || CashAddressNetworkPrefix.mainnet
    this.signatures = {}
  }

  setTransaction ({ transaction, sourceOutputs }) {
    this.transaction = transaction
    this.sourceOutputs = sourceOutputs
    this.id = generateId({ transaction })
  }

  getTransactionProposal () {
    return {
      locktime: this.transaction.locktime,
      outputs: this.transaction.outputs,
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
      if (lockingBytecodeToCashAddress({ bytecode: sourceOutput.lockingBytecode, prefix: this.network }).address === address) {
        input.unlockingBytecode = {
          ...input.unlockingBytecode,
          compiler: this.compiler,
          data: entityUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
    }
    const signAttempt = generateTransaction({ ...this.getTransactionProposal(), inputs: this.transaction.inputs })
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

    // const inputs = structuredClone(
    //   this.transaction.inputs.filter(input => !input.unlockingBytecode || Object.keys(input.unlockingBytecode || {}).length === 0)
    // )

    const unlockingScriptId = this.getUnlockingScriptId({ signatures: this.signatures, template: this.template })

    for (const input of this.transaction.inputs) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(utxo.outpointTransactionHash) === binToHex(input.outpointTransactionHash)
        })
      }
      if (lockingBytecodeToCashAddress({ bytecode: sourceOutput.lockingBytecode, prefix: this.network }).address === address) {
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
}
