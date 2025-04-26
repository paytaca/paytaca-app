import {
  encodeTransactionCommon,
  hashTransaction,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBch,
  CashAddressNetworkPrefix,
  generateTransaction,
  binToHex,
  extractResolvedVariables,
  utf8ToBin,
  binToBase64,
  base64ToBin,
  binToUtf8,
  hexToBin,
  stringify,
  decodeTransactionCommon,
  createVirtualMachineBch
} from 'bitauth-libauth-v3'

import Watchtower from '../watchtower'

export class MultisigTransaction {
  constructor ({ transaction, sourceOutputs, signatures, metadata }) {
    this.transaction = transaction
    this.sourceOutputs = sourceOutputs
    this.signatures = signatures || {}
    this.metadata = metadata || {
      status: 'pending',
      signatureCount: 0,
      requiredSignatures: 1
    }
  }

  get lockingScriptId () {
    return 'lock'
  }

  getSignersInfo ({ template, lockingData }) {
    console.log('🚀 ~ MultisigTransaction ~ getSignersInfo ~ lockingData:', lockingData)
    if (!template) return {}
    const signersInfo = {}
    for (const signer of Object.entries(lockingData.hdKeys.hdPublicKeys)) { // { signer_1: xPub..., .... }
      const [signerEntityKey, signerHdPubKey] = signer
      // only samples signatures of input 0, TODO: show sigs of each input
      const signerSignature = Object.entries(Object.values(this.signatures || {})[0]).find((signatureKeyValue) => {
        const [signatureKey/* , signatureValue */] = signatureKeyValue
        const signerEntityVariableKey = signatureKey.split('.')[0]
        return Boolean(template.entities[signerEntityKey].variables[signerEntityVariableKey])
      })
      signersInfo[signerEntityKey] = structuredClone(template.entities[signerEntityKey])
      signersInfo[signerEntityKey].hdPublicKey = signerHdPubKey
      if (signerSignature) {
        signersInfo[signerEntityKey].signature = Object.fromEntries([signerSignature])
      }
    }
    return signersInfo
  }

  finalize ({
    template,
    lockingData,
    cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet,
    lockingScriptId = 'lock'
  }) {
    const compiler = walletTemplateToCompilerBch(template)
    const signatures = structuredClone(this.signatures)
    Object.entries(signatures).forEach((signatureEntry) => {
      const [key, value] = signatureEntry
      signatures[key] =
        typeof value === 'string' ? hexToBin(value) : Uint8Array.from(Object.values(value))
    })

    const lockingBytecode = compiler.generateBytecode({
      data: lockingData,
      scriptId: lockingScriptId
    })

    const { address } = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: cashAddressNetworkPrefix
    })

    const unlockingScriptId = MultisigTransaction.getUnlockingScriptId({ signatures: this.signatures, template })
    console.log('TRANSACTION', this.transaction)
    const transaction = this.transaction
    const sourceOutputs = [] // will be used for verification
    for (const [index, input] of transaction.inputs.entries()) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex &&
                binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
                binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
      if (lockingBytecodeToCashAddress({ bytecode: sourceOutput.lockingBytecode, prefix: cashAddressNetworkPrefix }).address === address) {
        const inputUnlockingData = {
          ...lockingData,
          bytecode: {
            ...this.signatures[index]
          }
        }

        input.unlockingBytecode = {
          ...input.unlockingBytecode,
          compiler: compiler,
          data: inputUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
      sourceOutputs.push(sourceOutput)
    }

    const successfulCompilation = generateTransaction({
      ...transaction
    })
    if (successfulCompilation.success) {
      const encodedTransaction = encodeTransactionCommon(successfulCompilation.transaction)
      this.signedTransaction = binToHex(encodedTransaction)
    }

    const vm = createVirtualMachineBch()
    const verificationResult = vm.verify({
      sourceOutputs: sourceOutputs, transaction: successfulCompilation.transaction
    })
    console.log('🚀 ~ Pst ~ finalize ~ verificationResult:', verificationResult)

    Object.keys(this.signatures).forEach((inputIndex) => {
      Object.keys(this.signatures[inputIndex]).forEach((signatureKey) => {
        this.signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(this.signatures[inputIndex][signatureKey]))
      })
    })
    console.log('🚀 ~ Pst ~ finalize ~ verificationResult:', verificationResult)

    console.log('signatures', stringify(this.signatures))
    if (verificationResult !== true) {
      throw new Error('Transaction failed local vm verification')
    }
    return successfulCompilation
  }

  toJSON () {
    return {
      transaction: this.transaction,
      sourceOutputs: this.sourceOutputs,
      signatures: this.signatures,
      metadata: this.metadata
    }
  }

  async broadcast ({ network }) {
    const watchtower = new Watchtower(network === 'chipnet')
    await watchtower.subscribe({ address: this.metadata.walletAddress })
    const response = await watchtower.broadcastTx(this.signedTransaction)
    return response
  }

  exportPST ({ signers, format = 'base64' }) {
    console.log('EXPORT Pst object', this.transaction)
    const pst = {
      v: 1,
      transaction: binToHex(encodeTransactionCommon(this.transaction)),
      sourceOutputs: this.sourceOutputs,
      signatures: this.signatures,
      metadata: {
        signers,
        ...this.metadata
      }
    }
    console.log('🚀 ~ MultisigTransaction ~ exportPSTObject ~ pst:', pst)
    if (format === 'json') return stringify(pst)
    if (format === 'electron-cash') throw new Error('Not yet implemented')
    const bin = utf8ToBin(pst)
    return binToBase64(bin)
  }

  static importPST ({ pst }) {
    if (typeof pst === 'string') {
      const bin = base64ToBin(pst)
      const parsed = JSON.parse(binToUtf8(bin))
      console.log('🚀 ~ MultisigTransaction ~ importPST ~ parsed:', parsed)
      parsed.transaction = MultisigTransaction.transactionBinObjectsToUint8Array(
        decodeTransactionCommon(parsed.transaction)
      )
      return parsed
    }
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

  static createInstanceFromWCSessionRequest ({ sessionRequest, metadata }) {
    const walletAddress =
      sessionRequest.session.namespaces.bch.accounts[0].replace('bch:', '')

    const m = {
      origin: sessionRequest.verifyContext?.verified?.origin,
      prompt: sessionRequest.params?.request?.params?.userPrompt,
      wcSessionRequest: sessionRequest,
      walletAddress,
      ...metadata
    }

    return new MultisigTransaction({
      transaction: MultisigTransaction.transactionBinObjectsToUint8Array(
        sessionRequest.params.request.params.transaction
      ),
      sourceOutputs: sessionRequest.params.request.params.sourceOutputs,
      metadata: m
    })
  }

  static createInstanceFromObject (multisigTransactionObject) {
    multisigTransactionObject.transaction =
      MultisigTransaction.transactionBinObjectsToUint8Array(
        multisigTransactionObject.transaction
      )
    return new MultisigTransaction(multisigTransactionObject)
  }

  static transactionBinObjectsToUint8Array (transactionObject) {
    const transaction = structuredClone(transactionObject)

    transaction.inputs.forEach(input => {
      if (input.outpointTransactionHash && !(input?.outpointTransactionHash instanceof Uint8Array)) {
        input.outpointTransactionHash = Uint8Array.from(Object.values((input.outpointTransactionHash)))
      }
      if (input.unlockingBytecode && !(input?.unlockingBytecode instanceof Uint8Array)) {
        input.unlockingBytecode = Uint8Array.from(Object.values((input.unlockingBytecode)))
      }
      if (input.sourceOutput?.lockingBytecode && !(input.sourceOutput.lockingBytecode instanceof Uint8Array)) {
        input.lockingBytecode = Uint8Array.from(Object.values((input.sourceOutput.lockingBytecode)))
      }
    })

    transaction.outputs.forEach(output => {
      if (output.lockingBytecode && !(output?.lockingBytecode instanceof Uint8Array)) {
        output.lockingBytecode = Uint8Array.from(Object.values(output.lockingBytecode))
      }
      if (output.token?.category && !(output.token?.category instanceof Uint8Array)) {
        output.token.category = Uint8Array.from(Object.values(output.token.category))
      }

      if (output.token?.nft?.commitment && !(output.token.nft.commitment instanceof Uint8Array)) {
        output.token.nft.commitment = Uint8Array.from(Object.values(output.token.nft.commitment))
      }
    })

    return {
      version: transaction.version,
      locktime: transaction.locktime,
      inputs: transaction.inputs,
      outputs: transaction.outputs
    }
  }
}
