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
  createVirtualMachineBch,
  extractMissingVariables,
  hashTransactionUiOrder
} from 'bitauth-libauth-v3'

import Watchtower from '../watchtower'

export const MultisigTransactionStatus = Object.freeze({
  CREATED: 0,
  PARTIALLY_SIGNED: 1,
  FULLY_SIGNED: 2,
  SUBMITTED: 3,
  CONFIRMED: 4
})

export const MultisigTransactionStatusText = Object.freeze({
  [MultisigTransactionStatus.CREATED]: 'Created',
  [MultisigTransactionStatus.PARTIALLY_SIGNED]: 'Partially Signed',
  [MultisigTransactionStatus.FULLY_SIGNED]: 'Fully Signed',
  [MultisigTransactionStatus.SUBMITTED]: 'Submitted',
  [MultisigTransactionStatus.CONFIRMED]: 'Confirmed'
})

export class MultisigTransaction {
  constructor ({ transaction, sourceOutputs, signatures, metadata }) {
    this.transaction = transaction
    this.sourceOutputs = sourceOutputs
    this.signatures = signatures || {}
    this.metadata = metadata || {
      status: MultisigTransactionStatus.CREATED, /* Partially Signed | Fully Signed | Submitted | Confirmed */
      finalized: false
    }
  }

  get lockingScriptId () {
    return 'lock'
  }

  get isFinalized () {
    return this.metadata.finalized
  }

  signerSigned ({ multisigWallet, signerEntityId }) {
    const signersWithoutSignatures = this.identifySignersWithoutSignatures({
      template: multisigWallet.template,
      lockingData: multisigWallet.lockingData,
      cashAddressNetworkPrefix: multisigWallet.network
    })
    console.log('🚀 ~ MultisigTransaction ~ signerSigned ~ signerEntityId:', signerEntityId)
    console.log('🚀 ~ MultisigTransaction ~ signerSigned ~ signersWithoutSignatures:', signersWithoutSignatures)
    return !Array.from(signersWithoutSignatures.missingSignersEntityIdSet)?.includes(signerEntityId)
  }

  signTransaction ({ multisigWallet, signerEntityIndex }) {
    const { sourceOutputs, signatures } = this
    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(this.transaction)
    const entityUnlockingData = {
      ...multisigWallet.lockingData,
      hdKeys: {
        ...multisigWallet.lockingData.hdKeys,
        hdPrivateKeys: {
          [`signer_${signerEntityIndex}`]: multisigWallet.signers[signerEntityIndex].xprv
        }
      }
    }

    const unlockingScriptId = multisigWallet.template.entities[`signer_${signerEntityIndex}`].scripts.filter((scriptId) => scriptId !== 'lock')[0]
    for (const input of transaction.inputs) {
      let sourceOutput = input.sourceOutput

      if (!sourceOutput) {
        sourceOutput = sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) === binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      const { address: sourceOutputAddress } = lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: multisigWallet.network })
      if (sourceOutputAddress === multisigWallet.address) {
        input.unlockingBytecode = {
          // ...input.unlockingBytecode,
          compiler: multisigWallet.compiler,
          data: entityUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
    }

    const signAttempt = generateTransaction({ ...transaction })
    console.log('🚀 ~ MultisigWallet ~ signTransaction ~ signAttempt:', signAttempt)
    for (const [index, error] of Object.entries(signAttempt.errors)) {
      if (!signatures[index]) {
        signatures[index] = {}
      }
      const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
      const signatureKey = Object.keys(signerResolvedVariables)[0]
      const signatureValue = Object.values(signerResolvedVariables)[0]
      signatures[index][signatureKey] = signatureValue
    }
    Object.keys(signatures).forEach((inputIndex) => {
      Object.keys(signatures[inputIndex]).forEach((signatureKey) => {
        signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(signatures[inputIndex][signatureKey]))
      })
    })
    this.metadata.status = MultisigTransactionStatus.PARTIALLY_SIGNED
    console.log('🚀 ~ MultisigTransaction ~ Object.keys ~ signatures:', signatures)
    const finalizationResult = this.finalize({
      template: multisigWallet.template,
      lockingData: multisigWallet.lockingData,
      cashAddressNetworkPrefix: multisigWallet.network
    })
    this.metadata.finalized = finalizationResult.success
    console.log('🚀 ~ MultisigTransaction ~ signTransaction ~ finalizationResult:', finalizationResult)
    return this
  }

  getSignatureCount (multisigWallet) {
    const signersWithoutSignatures = this.identifySignersWithoutSignatures({
      template: multisigWallet.template,
      lockingData: multisigWallet.lockingData,
      cashAddressNetworkPrefix: multisigWallet.network
    })

    const missingSignatures = Array.from(signersWithoutSignatures.missingSignersEntityIdSet || [])
    return Number(multisigWallet.n) - missingSignatures.length
  }

  identifySignersWithoutSignatures ({
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

    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(
      JSON.parse(JSON.stringify(this.transaction))
    )

    const sourceOutputs = [] // will be used for verification
    const unlockingScriptIds = Object.keys(template.scripts).filter(scriptId => scriptId !== 'lock')
    const missingSigners = {}
    const missingSignersEntityIdSet = new Set()
    unlockingScriptIds.forEach((unlockingScriptId) => {
      for (const [inputIndex, input] of transaction.inputs.entries()) {
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
              ...this.signatures[inputIndex]
            }
          }
          console.log('🚀 ~ MultisigTransaction ~ unlockingScriptId ~ unlockingScriptId:', unlockingScriptId)
          input.unlockingBytecode = {
            // ...input.unlockingBytecode,
            compiler: compiler,
            data: inputUnlockingData,
            valueSatoshis: sourceOutput.valueSatoshis,
            script: unlockingScriptId,
            token: sourceOutput.token
          }
        }
        sourceOutputs.push(sourceOutput)
      }

      const finalCompilation = generateTransaction({
        ...transaction
      })

      // const missingSignerSignatures = {} // Same schema as signatures
      if (!finalCompilation.success) {
        const missingSignerVariables = extractMissingVariables({ ...finalCompilation })
        console.log('🚀 ~ MultisigTransaction ~ missingSignerVariables:', missingSignerVariables)
        missingSigners[unlockingScriptId] = missingSignerVariables
        if (missingSignerVariables) {
          for (const signerEntityId of Object.values(missingSignerVariables)) {
            console.log('ADDING', signerEntityId)
            missingSignersEntityIdSet.add(signerEntityId)
            console.log('AFTER ADDING', missingSignersEntityIdSet)
          }
        }
      }
    })
    return {
      missingSigners,
      missingSignersEntityIdSet
    }
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
    // console.log('🚀 ~ MultisigTransaction ~ unlockingScriptId:', unlockingScriptId)
    const transaction = this.transaction
    const sourceOutputs = [] // will be used for verification
    for (const [inputIndex, input] of transaction.inputs.entries()) {
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
            ...this.signatures[inputIndex]
          }
        }
        const unlockingScriptId = MultisigTransaction.getUnlockingScriptId({
          signatures: this.signatures, template, inputIndex
        })

        console.log('🚀 ~ MultisigTransaction ~ unlockingScriptId ~ unlockingScriptId:', unlockingScriptId)
        input.unlockingBytecode = {
          // ...input.unlockingBytecode,
          compiler: compiler,
          data: inputUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
      sourceOutputs.push(sourceOutput)
    }

    const finalCompilation = generateTransaction({
      ...transaction
    })

    // const missingSignerSignatures = {} // Same schema as signatures
    if (!finalCompilation.success) {
      // const signersWithoutSignatures =
      this.identifySignersWithoutSignatures({
        template,
        lockingData,
        cashAddressNetworkPrefix,
        lockingScriptId
      })
      console.log('🚀 ~ MultisigTransaction ~ signersWithoutSignatures:', signersWithoutSignatures)
      // this.metadata.signersWithoutSignatures = signersWithoutSignatures
      this.metadata.finalized = finalCompilation.success
      this.metadata.status = MultisigTransactionStatus.FULLY_SIGNED
      return finalCompilation
    }

    console.log('🚀 ~ MultisigTransaction ~ finalCompilation:', finalCompilation)
    const vm = createVirtualMachineBch()

    const verificationResult = vm.verify({
      sourceOutputs: sourceOutputs, transaction: finalCompilation.transaction
    })

    console.log('🚀 ~ Pst ~ finalize ~ verificationResult:', verificationResult)
    console.log('signatures', stringify(this.signatures))
    if (verificationResult !== true) {
      throw new Error('Transaction failed local vm verification')
    }
    console.log('🚀 ~ Pst ~ finalize ~ verificationResult:', verificationResult)
    Object.keys(this.signatures).forEach((inputIndex) => {
      Object.keys(this.signatures[inputIndex]).forEach((signatureKey) => {
        this.signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(this.signatures[inputIndex][signatureKey]))
      })
    })
    const encodedTransaction = encodeTransactionCommon(finalCompilation.transaction)
    this.metadata.signedTransaction = binToHex(encodedTransaction)
    this.metadata.signedTransactionTxid = binToHex(hashTransactionUiOrder(this.signTransaction))
    return finalCompilation
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
    try {
      this.metadata.isBroadcasting = true
      const watchtower = new Watchtower(network === 'chipnet')
      await watchtower.subscribe({
        address: this.metadata.walletAddress
      })
      return await watchtower.broadcastTx(
        this.metadata.signedTransaction
      )
    } catch (error) {
      console.log(error)
    } finally {
      this.metadata.isBroadcasting = false
    }
  }

  exportPST ({ signers, format = 'base64' }) {
    // const includeSourceOutputs = this.transaction.inputs.some((input) => !input.sourceOutput)
    const { wcSessionRequest, ...otherMetadata } = this.metadata
    const pst = {
      transaction: binToHex(encodeTransactionCommon(this.transaction)),
      sourceOutputs: this.sourceOutputs,
      signatures: this.signatures,
      metadata: {
        v: 1,
        signers,
        ...otherMetadata
      }
    }
    // if (includeSourceOutputs) {
    //   // EMBED
    //   pst.sourceOutputs = this.sourceOutputs
    // }
    if (format === 'json') return stringify(pst)
    if (format === 'electron-cash') throw new Error('Not yet implemented')
    const bin = utf8ToBin(JSON.stringify(pst))
    return binToBase64(bin)
  }

  static removeTransactionCompilationData (transaction) {
    const clone = JSON.parse(JSON.stringify(transaction))
    clone.inputs.forEach((input) => {
      if (input.unlockingBytecode?.compiler) {
        delete input.unlockingBytecode
      }
    })
    return clone
  }

  static removeTransactionSourceOutput (transaction) {
    const clone = JSON.parse(JSON.stringify(transaction))
    clone.inputs.forEach((input) => {
      delete input.sourceOutput
    })
    return clone
  }

  static importPST ({ pst }) {
    if (typeof pst === 'string') {
      const bin = base64ToBin(pst)
      const parsed = JSON.parse(binToUtf8(bin))
      const decoded = decodeTransactionCommon(hexToBin(parsed.transaction))
      parsed.transaction = MultisigTransaction.transactionBinObjectsToUint8Array(
        decoded
      )
      if (parsed.sourceOutputs) {
        parsed.transaction.inputs.forEach((input) => {
        // embedding sourceOutput to input
          input.sourceOutput = parsed.sourceOutputs.find((sourceOutput) => {
            return Number(sourceOutput.outpointIndex) === Number(input.outpointIndex) &&
            binToHex(Uint8Array.from(Object.values((sourceOutput.outpointTransactionHash)))) ===
              binToHex(Uint8Array.from(Object.values((input.outpointTransactionHash))))
          })
        })
      }
      parsed.transaction.outputs.forEach((output) => {
        // inserting address to output
        output.address = lockingBytecodeToCashAddress({ bytecode: output.lockingBytecode }).address
      })
      return parsed
    }
  }

  static getUnlockingScriptId ({ signatures, template, inputIndex }) {
    const scriptIdentifierTemplateScriptMap = Object.keys(template.scripts).map((scriptId) => {
      return { [scriptId]: template.scripts[scriptId].script }
    })
    const foundscriptIdentifierTemplateScriptMapping =
      scriptIdentifierTemplateScriptMap.find((scriptIdentifierAndScript) => {
      // ['key1.schnorr_signature.all_outputs', 'key3.schnorr_signature.all_outputs', ...].every()
        return Object.keys(signatures[inputIndex]).every((signatureIdentifier) => {
          const scriptId = Object.keys(scriptIdentifierAndScript)[0]
          return scriptIdentifierAndScript[scriptId].includes(signatureIdentifier)
        })
      })
    return Object.keys(foundscriptIdentifierTemplateScriptMapping)[0]
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
    const transaction = JSON.parse(JSON.stringify(transactionObject))

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
