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
  extractMissingVariables
} from 'bitauth-libauth-v3'

import Watchtower from '../watchtower'
import { getLockingBytecode, getCompiler, getMultisigCashAddress, signerCanSign } from './wallet'
import { getAddress } from 'src/store/global/getters'

export const MultisigTransactionStatus = Object.freeze({
  PENDING_UNSIGNED: 0,
  PENDING_PARTIALLY_SIGNED: 1,
  PENDING_FULLY_SIGNED: 2,
  BROADCASTED: 3,
  CONFIRMED: 4
})

export const MultisigTransactionStatusText = Object.freeze({
  [MultisigTransactionStatus.PENDING_UNSIGNED]: 'Pending, unsigned',
  [MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED]: 'Pending, partially signed',
  [MultisigTransactionStatus.PENDING_FULLY_SIGNED]: 'Pending, fully signed',
  [MultisigTransactionStatus.BROADCASTED]: 'Broadcasted',
  [MultisigTransactionStatus.CONFIRMED]: 'Confirmed'
})

export class MultisigTransaction {
  constructor ({ transaction, sourceOutputs, signatures, metadata, multisigWallet }) {
    this.transaction = transaction
    this.sourceOutputs = sourceOutputs
    this.signatures = signatures || {}
    this.metadata = metadata || {
      status: MultisigTransactionStatus.PENDING_UNSIGNED, /* Partially Signed | Fully Signed | Broadcasted | Confirmed */
      finalized: false
    }
    this.multisigWallet = multisigWallet
  }

  get lockingScriptId () {
    return 'lock'
  }

  get isFinalized () {
    return this.metadata.finalized
  }

  get status () {
    return MultisigTransactionStatusText[this.metadata?.status]
  }

  get unsignedTransactionHash () {
    return hashTransaction(this.transaction)
  }

  requireMultisigWallet () {
    if (!this.multisigWallet || !(this.multisigWallet instanceof MultisigWallet)) {
      throw new Error('Missing wallet!')
    }
  }

  signerHasSignature ({ signerEntityId, addressIndex = 0, signatureFormat = 'schnorr' }) {
    this.requireMultisigWallet()
    const template = this.multisigWallet.getTemplate({ signatureFormat })
    const lockingData = this.multisigWallet.getLockingData({ addressIndex })
    const signersWithoutSignatures = this.identifySignersWithoutSignatures({
      template: template,
      lockingData: lockingData
    })
    return !Array.from(signersWithoutSignatures.missingSignersEntityIdSet)?.includes(signerEntityId)
  }

  signTransaction ({
    signerEntityIndex,
    addressIndex = 0,
    signatureFormat = 'schnorr'
  }) {
    this.requireMultisigWallet()
    if (!this.multisigWallet.signers[signerEntityIndex].xprv) {
      throw new Error(`Missing private key of ${signerEntityIndex}`)
    }
    const signatures = this.signatures
    const sourceOutputs = this.sourceOutputs
    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(this.transaction)
    const lockingData = this.multisigWallet.getLockingData({ addressIndex })
    const entityUnlockingData = {
      hdKeys: {
        addressIndex,
        hdPublicKeys: lockingData.hdKeys.hdPublicKeys,
        hdPrivateKeys: {
          [`signer_${signerEntityIndex}`]: this.multisigWallet.signers[signerEntityIndex].xprv
        }
      }
    }

    const template = this.multisigWallet.getTemplate({ signatureFormat })
    const unlockingScriptId = template.entities[`signer_${signerEntityIndex}`].scripts.filter((scriptId) => scriptId !== 'lock')[0]
    const multisigWalletLockingBytecode = this.multisigWallet.getLockingBytecode({ addressIndex, signatureFormat })
    for (const input of transaction.inputs) {
      let sourceOutput = input.sourceOutput

      if (!sourceOutput) {
        sourceOutput = sourceOutputs.find((utxo) => {
          return utxo.outpointIndex ===
            input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
            binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      const sourceOutputLockingBytecodeHex = binToHex(Uint8Array.from(Object.values(sourceOutput.lockingBytecode)))
      if (sourceOutputLockingBytecodeHex === binToHex(multisigWalletLockingBytecode.bytecode)) {
        const compiler = this.multisigWallet.getCompiler({ template })
        input.unlockingBytecode = {
          compiler,
          data: entityUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
    }

    const signAttempt = generateTransaction({ ...transaction })
    for (const [inputIndex, error] of Object.entries(signAttempt.errors)) {
      if (!signatures[inputIndex]) {
        signatures[inputIndex] = {}
      }
      const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
      const signatureKey = Object.keys(signerResolvedVariables)[0]
      const signatureValue = Object.values(signerResolvedVariables)[0]
      signatures[inputIndex][signatureKey] = signatureValue
    }
    Object.keys(signatures).forEach((inputIndex) => {
      Object.keys(signatures[inputIndex]).forEach((signatureKey) => {
        signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(signatures[inputIndex][signatureKey]))
      })
    })
    this.metadata.status = MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED
    const finalizationResult = this.finalize({
      addressIndex,
      signatureFormat
    })
    this.metadata.finalized = finalizationResult.success
    return this
  }

  getSignatureCount ({ addressIndex = 0, signatureFormat = 'schnorr' } = {}) {
    this.requireMultisigWallet()
    const template = this.multisigWallet.getTemplate({ signatureFormat })
    const lockingData = this.multisigWallet.getLockingData({ addressIndex })
    const signersWithoutSignatures = this.identifySignersWithoutSignatures({
      template,
      lockingData
    })

    const missingSignatures = Array.from(signersWithoutSignatures.missingSignersEntityIdSet || [])
    return Number(this.multisigWallet.n) - missingSignatures.length
  }

  getStatusUrl ({ isChipnet }) {
    const unsignedTransactionHash =
      hashTransaction(MultisigTransaction.transactionBinObjectsToUint8Array(this.transaction))
    return `https://${isChipnet ? 'chipnet.' : ''}watchtower.cash/api/multisig/transaction-proposals?unsignedHash=${unsignedTransactionHash}`
  }

  async refreshStatus ({ addressIndex = 0, signatureFormat = 'schnorr', cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet } = {}) {
    this.requireMultisigWallet()
    try {
      if (!this.metadata) {
        this.metadata = {}
      }
      this.metadata.isRefreshingStatus = true
      await new Promise((resolve) => {
        setTimeout(() => { resolve() }, 3000)
      })
      if (this.metadata.status === MultisigTransactionStatus.CONFIRMED) return
      if (!this.metadata.status || this.metadata.status < MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
        const signatureCount = this.getSignatureCount({ addressIndex, signatureFormat, cashAddressNetworkPrefix })
        if (signatureCount === 0) {
          this.metadata.status = MultisigTransactionStatus.PENDING_UNSIGNED
        }
        if (signatureCount > 0 && signatureCount < this.multisigWallet.m) {
          this.metadata.status = MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED
        }
        if (signatureCount >= this.multisigWallet.m) {
          this.metadata.status = MultisigTransactionStatus.PENDING_FULLY_SIGNED
        }
      }
      if (this.metadata.status === MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
        // TODO: check if submitted or confirmed then update
      }
      if (this.metadata.status === MultisigTransactionStatus.BROADCASTED) {
        // TODO: check if confirmed, then update
      }
    } catch (error) {} finally {
      // console.log('🚀 ~ MultisigTransaction ~ refreshStatus ~ metadata:', this.metadata)
      if (this.metadata?.isRefreshingStatus) {
        delete this.metadata.isRefreshingStatus
      }
    }
  }

  identifySignersWithoutSignatures ({
    addressIndex = 0,
    signatureFormat = 'schnorr'
  }) {
    this.requireMultisigWallet()
    const signatures = structuredClone(this.signatures)
    // Sanitize
    Object.entries(signatures).forEach((signatureEntry) => {
      const [key, value] = signatureEntry
      signatures[key] =
        typeof value === 'string' ? hexToBin(value) : Uint8Array.from(Object.values(value))
    })

    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(
      JSON.parse(JSON.stringify(this.transaction))
    )

    const template = this.multisigWallet.getTemplate({ signatureFormat })
    const compiler = this.multisigWallet.getCompiler({ template })
    const lockingData = this.multisigWallet.getLockingData({ addressIndex })
    const unlockingScriptIds = Object.keys(template.scripts).filter(scriptId => scriptId !== 'lock')
    const sourceOutputs = [] // will be used for verification
    const missingSigners = {}
    const missingSignersEntityIdSet = new Set()
    const multisigWalletLockingBytecode = this.multisigWallet.getLockingBytecode({ addressIndex, signatureFormat })
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

        if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
          const inputUnlockingData = {
            ...lockingData,
            bytecode: {
              ...this.signatures[inputIndex]
            }
          }
          input.unlockingBytecode = {
            compiler,
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
        missingSigners[unlockingScriptId] = missingSignerVariables
        if (missingSignerVariables) {
          for (const signerEntityId of Object.values(missingSignerVariables)) {
            missingSignersEntityIdSet.add(signerEntityId)
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
    addressIndex = 0,
    signatureFormat = 'schnorr'
  }) {
    this.requireMultisigWallet()

    const signatures = structuredClone(this.signatures)
    Object.entries(signatures).forEach((signatureEntry) => {
      const [key, value] = signatureEntry
      signatures[key] =
        typeof value === 'string' ? hexToBin(value) : Uint8Array.from(Object.values(value))
    })
    const template = this.multisigWallet.getTemplate({ signatureFormat })
    const compiler = this.multisigWallet.getCompiler({ template })
    const lockingData = this.multisigWallet.getLockingData({ addressIndex })
    const multisigWalletLockingBytecode = this.multisigWallet.getLockingBytecode({ addressIndex, signatureFormat })
    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(this.transaction)
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
      if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
        const inputUnlockingData = {
          ...lockingData,
          bytecode: {
            ...this.signatures[inputIndex]
          }
        }
        const unlockingScriptId = MultisigTransaction.getUnlockingScriptId({
          signatures: this.signatures, template, inputIndex
        })

        input.unlockingBytecode = {
          compiler,
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
    if (!finalCompilation.success) {
      const signersWithoutSignatures =
        this.identifySignersWithoutSignatures({
          addressIndex,
          signatureFormat
        })
      this.metadata.signersWithoutSignatures = signersWithoutSignatures
      return finalCompilation
    }

    this.metadata.finalized = finalCompilation.success
    const vm = createVirtualMachineBch()

    const verificationResult = vm.verify({
      sourceOutputs: sourceOutputs, transaction: finalCompilation.transaction
    })

    if (verificationResult !== true) {
      throw new Error('Transaction failed local vm verification')
    }
    Object.keys(this.signatures).forEach((inputIndex) => {
      Object.keys(this.signatures[inputIndex]).forEach((signatureKey) => {
        this.signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(this.signatures[inputIndex][signatureKey]))
      })
    })
    const encodedTransaction = encodeTransactionCommon(finalCompilation.transaction)
    this.signedTransaction = binToHex(encodedTransaction)
    this.signedTransactionComputedTxid = hashTransaction(this.signedTransaction)
    if (this.metadata.status < MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
      this.metadata.status = MultisigTransactionStatus.PENDING_FULLY_SIGNED
    }
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

  async broadcast ({ network, addressIndex = 0 }) {
    this.requireMultisigWallet()
    if (!this.signedTransaction) return
    try {
      this.metadata.isBroadcasting = true
      const isChipnet = network === 'chipnet' || network === 'testnet'
      const watchtower = new Watchtower(isChipnet)
      const cashAddressNetworkPrefix = isChipnet ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
      await watchtower.subscribe({
        address: this.multisigWallet.getAddress({ addressIndex, cashAddressNetworkPrefix })
      })
      const response = await watchtower.broadcastTx(
        this.signedTransaction
      )
      this.signedTransactionId = response.txid
      this.metadata.status = MultisigTransactionStatus.BROADCASTED
      return response
    } catch (error) {
      console.log(error)
    } finally {
      delete this.metadata.isBroadcasting
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
        // return Object.keys(signatures[inputIndex]).every((signatureIdentifier) => {
        // const scriptId = Object.keys(scriptIdentifierAndScript)[0]
        // return scriptIdentifierAndScript[scriptId].includes(signatureIdentifier)
        // })
        return signatures
		      .filter((signature) => Number(signature.inputIndex) === Number(inputIndex))
          .every((signature) => {
            const scriptId = Object.keys(scriptIdentifierAndScript)[0]
            return scriptIdentifierAndScript[scriptId].includes(signature.sigKey)
          })
      })
    return Object.keys(foundscriptIdentifierTemplateScriptMapping)[0]
  }

  static createInstanceFromWCSessionRequest ({ sessionRequest }) {
    const address =
      sessionRequest.session.namespaces.bch.accounts[0].replace('bch:', '')

    const metadata = {
      origin: sessionRequest.verifyContext?.verified?.origin,
      prompt: sessionRequest.params?.request?.params?.userPrompt,
      wcSessionRequest: sessionRequest,
      address,
      status: MultisigTransactionStatus.PENDING_UNSIGNED
    }

    return new MultisigTransaction({
      transaction: MultisigTransaction.transactionBinObjectsToUint8Array(
        sessionRequest.params.request.params.transaction
      ),
      sourceOutputs: sessionRequest.params.request.params.sourceOutputs,
      metadata
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

export const getUnsignedTransactionHash = ({ multisigTransaction, hex = true }) => {
  const transaction = encodeTransactionCommon(multisigTransaction.transaction)
  if (hex) {
    return binToHex(transaction)
  }
  return transaction
}

export const getStatusUrl = ({ unsignedTransactionHash, chipnet = false }) => {
  return `https://${chipnet ? 'chipnet.' : ''}watchtower.cash/api/multisig/transaction-proposals?unsignedHash=${unsignedTransactionHash}`
}

export const getUnlockingScriptId = ({ signatures, template, inputIndex }) => {
  const scriptIdentifierTemplateScriptMap = Object.keys(template.scripts).map((scriptId) => {
    return { [scriptId]: template.scripts[scriptId].script }
  })
  const foundscriptIdentifierTemplateScriptMapping =
    scriptIdentifierTemplateScriptMap.find((scriptIdentifierAndScript) => {
    // ['key1.schnorr_signature.all_outputs', 'key3.schnorr_signature.all_outputs', ...].every()
      // return Object.keys(signatures[inputIndex]).every((signatureIdentifier) => {
      // const scriptId = Object.keys(scriptIdentifierAndScript)[0]
      // return scriptIdentifierAndScript[scriptId].includes(signatureIdentifier)
      // })

      return signatures
        .filter((signature) => Number(signature.inputIndex) === Number(inputIndex))
        .every((signature) => {
          const scriptId = Object.keys(scriptIdentifierAndScript)[0]
          return scriptIdentifierAndScript[scriptId].includes(signature.sigKey)
        })
    })
  return Object.keys(foundscriptIdentifierTemplateScriptMapping)[0]
}

export const transactionBinObjectsToUint8Array = (transactionObject) => {
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

export const createMultisigTransactionFromWCSessionRequest = ({ sessionRequest, addressIndex }) => {
  const address =
    sessionRequest.session.namespaces.bch.accounts[0].replace('bch:', '')

  const metadata = {
    origin: sessionRequest.verifyContext?.verified?.origin,
    prompt: sessionRequest.params?.request?.params?.userPrompt,
    status: MultisigTransactionStatus.PENDING_UNSIGNED,
    wcSessionRequest: sessionRequest,
    address,
    addressIndex
  }

  return {
    transaction: sessionRequest.params.request.params.transaction,
    sourceOutputs: sessionRequest.params.request.params.sourceOutputs,
    signatures: [],
    metadata
  }
}

export const identifySignersWithoutSignatures = ({
  multisigWallet,
  multisigTransaction
}) => {
  const { template, lockingData: lockingDataFromWallet } = multisigWallet
  const lockingData = structuredClone(lockingDataFromWallet)
  delete lockingData.hdKeys.hdPrivateKeys
  const signatures = structuredClone(multisigTransaction.signatures)
  // Sanitize
  // Object.keys(signatures).forEach((inputIndex) => {
  //   Object.keys(signatures[inputIndex]).forEach((signatureKey) => {
  //     if (typeof signatures[inputIndex][signatureKey] === 'string') {
  //       signatures[inputIndex][signatureKey] = hexToBin(signatures[inputIndex][signatureKey])
  //     } else {
  //       signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(signatures[inputIndex][signatureKey]))
  //     }
  //   })
  // })

  signatures.forEach((signature) => {
    if (typeof signature.sigValue === 'string') {
      signature.sigValue = hexToBin(signature.sigValue)
    } else {
      signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))
    }
  })
  // Object.entries(signatures).forEach((signatureEntry) => {
  // const [inputIndex, signature] = signatureEntry
  // console.log('signature Entry', signatureEntry)
  // const signatureK
  // signatures[inputIndex] =
  // typeof value === 'string' ? hexToBin(value) : Uint8Array.from(Object.values(value))
  // })

  const transaction = transactionBinObjectsToUint8Array(
    JSON.parse(JSON.stringify(multisigTransaction.transaction))
  )
  const compiler = getCompiler({ template })
  const unlockingScriptIds = Object.keys(template.scripts).filter(scriptId => scriptId !== 'lock')
  const sourceOutputs = [] // will be used for verification
  const missingSigners = {}
  const missingSignersEntityIdSet = new Set()
  const pureLockingData = {
    hdKeys: {
      addressIndex: lockingData.hdKeys.addressIndex,
      hdPublicKeys: lockingData.hdKeys.hdPublicKeys
    }
  }
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData: pureLockingData, template })
  unlockingScriptIds.forEach((unlockingScriptId) => {
    for (const [inputIndex, input] of transaction.inputs.entries()) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = multisigTransaction.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex &&
                binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
                binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
      const inputSignatures = {}

      signatures.forEach((sig) => {
        // eslint-disable-next-line eqeqeq
        if (sig.inputIndex == inputIndex) {
          inputSignatures[sig.sigKey] = sig.sigValue
        }
      })
      if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
        // console.log('signature input', signatures[inputIndex])
        const inputUnlockingData = {
          ...lockingData,
          bytecode: {
            // ...signatures[inputIndex]
            ...inputSignatures
          }
        }
        input.unlockingBytecode = {
          compiler,
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
    if (!finalCompilation.success) {
      const missingSignerVariables = extractMissingVariables({ ...finalCompilation })
      missingSigners[unlockingScriptId] = missingSignerVariables
      if (missingSignerVariables) {
        for (const signerEntityId of Object.values(missingSignerVariables)) {
          missingSignersEntityIdSet.add(signerEntityId)
        }
      }
    }
  })
  return {
    missingSigners,
    missingSignersEntityIdSet
  }
}

export const getSignatureCount = ({ multisigWallet, multisigTransaction } = {}) => {
  const signersWithoutSignatures = identifySignersWithoutSignatures({
    multisigWallet,
    multisigTransaction
  })
  const missingSignatures = Array.from(signersWithoutSignatures.missingSignersEntityIdSet || [])
  const signatureCount = Object.keys(multisigWallet.template.entities).length - missingSignatures.length
  if (signatureCount < 0) return 0
  return signatureCount
}

export const signerHasSignature = ({ signerEntityKey, multisigWallet, multisigTransaction }) => {
  const signersWithoutSignatures = identifySignersWithoutSignatures({
    multisigWallet,
    multisigTransaction
  })
  const hasSig = !Array.from(signersWithoutSignatures.missingSignersEntityIdSet)?.includes(signerEntityKey)
  return hasSig
}

export const finalizeTransaction = ({
  multisigWallet,
  multisigTransaction
}) => {
  const { template, lockingData } = multisigWallet

  const signatures = structuredClone(multisigTransaction.signatures)
  // Object.entries(signatures).forEach((signatureEntry) => {
  //   const [key, value] = signatureEntry
  //   signatures[key] =
  //     typeof value === 'string' ? hexToBin(value) : Uint8Array.from(Object.values(value))
  // })
  signatures.forEach((signature) => {
    if (typeof signature.sigValue === 'string') {
      signature.sigValue = hexToBin(signature.sigValue)
    } else {
      signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))
    }
  })
  const pureLockingData = {
    hdKeys: {
      addressIndex: lockingData.hdKeys.addressIndex,
      hdPublicKeys: lockingData.hdKeys.hdPublicKeys
    }
  }
  const compiler = getCompiler({ template })
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData: pureLockingData, template })
  const transaction = transactionBinObjectsToUint8Array(multisigTransaction.transaction)
  const sourceOutputs = [] // will be used for verification
  for (const [inputIndex, input] of transaction.inputs.entries()) {
    let sourceOutput = input.sourceOutput
    if (!sourceOutput) {
      sourceOutput = multisigTransaction.sourceOutputs.find((utxo) => {
        return utxo.outpointIndex === input.outpointIndex &&
              binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
              binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
      })
    }

    sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
    const inputSignatures = {}
    signatures.forEach((sig) => {
      // eslint-disable-next-line eqeqeq
      if (sig.inputIndex == inputIndex) {
        inputSignatures[sig.sigKey] = sig.sigValue
      }
    })
    if (binToHex(sourceOutput.lockingBytecode) === binToHex(multisigWalletLockingBytecode.bytecode)) {
      const inputUnlockingData = {
        ...lockingData,
        bytecode: {
          // ...multisigTransaction.signatures[inputIndex]
          ...inputSignatures
        }
      }
      const unlockingScriptId = getUnlockingScriptId({
        signatures: multisigTransaction.signatures, template, inputIndex
      })
      input.unlockingBytecode = {
        compiler,
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
  if (!finalCompilation.success) {
    const signersWithoutSignatures =
      identifySignersWithoutSignatures({
        multisigWallet,
        multisigTransaction
      })
    multisigTransaction.metadata.signersWithoutSignatures = signersWithoutSignatures
    return finalCompilation
  }

  multisigTransaction.metadata.finalized = finalCompilation.success
  const vm = createVirtualMachineBch()

  const verificationResult = vm.verify({
    sourceOutputs: sourceOutputs, transaction: finalCompilation.transaction
  })

  if (verificationResult !== true) {
    throw new Error('Transaction failed local vm verification')
  }
  // Object.keys(multisigTransaction.signatures).forEach((inputIndex) => {
  //   Object.keys(multisigTransaction.signatures[inputIndex]).forEach((signatureKey) => {
  //     multisigTransaction.signatures[inputIndex][signatureKey] = Uint8Array.from(Object.values(multisigTransaction.signatures[inputIndex][signatureKey]))
  //   })
  // })
  const encodedTransaction = encodeTransactionCommon(finalCompilation.transaction)
  multisigTransaction.signedTransaction = binToHex(encodedTransaction)
  multisigTransaction.signedTransactionComputedTxid = hashTransaction(multisigTransaction.signedTransaction)
  if (multisigTransaction.metadata.status < MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
    multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_FULLY_SIGNED
  }
  return finalCompilation
}

export const signTransaction = ({
  multisigWallet,
  multisigTransaction,
  signerEntityKey
}) => {
  const { lockingData, template } = multisigWallet
  if (!lockingData.hdKeys.hdPrivateKeys?.[signerEntityKey]) {
    throw new Error(`Missing private key of ${signerEntityKey}`)
  }
  const signatures = multisigTransaction.signatures
  signatures.forEach((s) => {
    s.sigValue = Uint8Array.from(Object.values(s.sigValue))
  })
  const sourceOutputs = multisigTransaction.sourceOutputs
  const transaction = transactionBinObjectsToUint8Array(multisigTransaction.transaction)
  // const lockingData = this.multisigWallet.getLockingData({ addressIndex })
  const entityUnlockingData = {
    hdKeys: {
      addressIndex: lockingData.hdKeys.addressIndex,
      hdPublicKeys: lockingData.hdKeys.hdPublicKeys,
      hdPrivateKeys: {
        [signerEntityKey]: lockingData.hdKeys.hdPrivateKeys?.[signerEntityKey]
      }
    }
  }
  const pureLockingData = {
    hdKeys: {
      addressIndex: lockingData.hdKeys.addressIndex,
      hdPublicKeys: lockingData.hdKeys.hdPublicKeys
    }
  }
  const unlockingScriptId = multisigWallet.template.entities[signerEntityKey].scripts.filter((scriptId) => scriptId !== 'lock')[0]
  const multisigWalletLockingBytecode = getLockingBytecode({ lockingData: pureLockingData, template })
  for (const input of transaction.inputs) {
    let sourceOutput = input.sourceOutput

    if (!sourceOutput) {
      sourceOutput = sourceOutputs.find((utxo) => {
        return utxo.outpointIndex ===
          input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) ===
          binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
      })
    }
    const sourceOutputLockingBytecodeHex = binToHex(Uint8Array.from(Object.values(sourceOutput.lockingBytecode)))
    if (sourceOutputLockingBytecodeHex === binToHex(multisigWalletLockingBytecode.bytecode)) {
      const compiler = getCompiler({ template })
      input.unlockingBytecode = {
        compiler,
        data: entityUnlockingData,
        valueSatoshis: sourceOutput.valueSatoshis,
        script: unlockingScriptId,
        token: sourceOutput.token
      }
    }
  }

  const signAttempt = generateTransaction({ ...transaction })
  const signerSignatures = []
  for (const [inputIndex, error] of Object.entries(signAttempt.errors)) {
    const signerResolvedVariables = extractResolvedVariables({ ...signAttempt, errors: [error] })
    const sigKey = Object.keys(signerResolvedVariables)[0]
    const sigValue = Object.values(signerResolvedVariables)[0]
	  
    const sigDoesNotYetExist = signatures.findIndex((sig) => {
      // eslint-disable-next-line eqeqeq
      return sig.inputIndex == inputIndex && sig.sigKey === sigKey
    }) === -1

    const signerSignatureForInput = { inputIndex, sigKey, sigValue: Uint8Array.from(Object.values(sigValue))}
    if (sigDoesNotYetExist) {
      signatures.push(signerSignature)
    }
    signerSignatures.push(signerSignatureForInput)
  }
  multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED
  const finalizationResult = finalizeTransaction({
    multisigWallet,
    multisigTransaction
  })
  multisigTransaction.metadata.finalized = finalizationResult.success
  return { signer: signerEntityKey, signatures: signerSignatures }
}

export const broadcastTransaction = async ({ multisigTransaction, multisigWallet, chipnet = false }) => {
  try {
    if (!multisigTransaction.signedTransaction) return
    const watchtower = new Watchtower(chipnet)
    const cashAddressNetworkPrefix = chipnet ? CashAddressNetworkPrefix.testnet : CashAddressNetworkPrefix.mainnet
    await watchtower.subscribe({
      address: getMultisigCashAddress({
        lockingData: multisigWallet.lockingData,
        template: multisigWallet.template,
        cashAddressNetworkPrefix
      })
    })
    const response = await watchtower.broadcastTx(
      multisigTransaction.signedTransaction
    )
    multisigTransaction.signedTransactionId = response.txid
    multisigTransaction.txid = response.txid
    multisigTransaction.metadata.status = MultisigTransactionStatus.BROADCASTED
    return response
  } catch (error) {
    console.log(error)
    throw error
  } finally {
    delete multisigTransaction.metadata?.isBroadcasting
  }
}

export const refreshTransactionStatus = async ({ multisigWallet, multisigTransaction } = {}) => {
  try {
    if (!multisigTransaction.metadata) {
      multisigTransaction.metadata = {}
    }
    multisigTransaction.metadata.isRefreshingStatus = true
    await new Promise((resolve) => {
      setTimeout(() => { resolve() }, 3000)
    })
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.CONFIRMED) return
    if (!multisigTransaction.metadata.status || multisigTransaction.metadata.status < MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
      const signatureCount = getSignatureCount({ multisigWallet, multisigTransaction })
      if (signatureCount === 0) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_UNSIGNED
      }
      if (signatureCount > 0 && signatureCount < multisigWallet.requiredSignatures) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_PARTIALLY_SIGNED
      }
      if (signatureCount >= multisigWallet.requiredSignatures) {
        multisigTransaction.metadata.status = MultisigTransactionStatus.PENDING_FULLY_SIGNED
      }
    }
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.PENDING_FULLY_SIGNED) {
      // TODO: check if submitted or confirmed then update
    }
    if (multisigTransaction.metadata.status === MultisigTransactionStatus.BROADCASTED) {
      // TODO: check if confirmed, then update
    }	  
  } catch (error) {} finally {
      delete multisigTransaction.metadata?.isRefreshingStatus
  }
}

export const signatureValuesToUint8Array = ({ signatures }) => {
  signatures.forEach((signature) => {
    if (typeof(signature.sigValue) === 'string') {
     signature.sigValue = hexToBin(signature.sigValue)
    }
    signature.sigValue = Uint8Array.from(Object.values(signature.sigValue))	  
  })
  return signatures
}

export const sourceOutputsValuesToUint8Array = ({ sourceOutputs }) => {
 sourceOutputs.forEach((sourceOutput) => {
   if (typeof(sourceOutput.lockingBytecode) === 'string') {
     sourceOutput.lockingBytecode = hexToBin(sourceOutput.lockingBytecode)
   }
   if (typeof(sourceOutput.outpointTransactionHash) === 'string') {
     sourceOutput.outpointTransactionHash = hexToBin(sourceOutput.outpointTransactionHash)
   }
     sourceOutput.lockingBytecode = Uint8Array.from(Object.values(sourceOutput.lockingBytecode))
     sourceOutput.outpointTransactionHash = Uint8Array.from(Object.values(sourceOutput.outpointTransactionHash))
 })
 return sourceOutputs
}

export const combinePsts = ({ psts }) => {
 const sameTransactions = psts.every((pst) => {
   hashTransaction(pst.transaction) === hashTransaction(psts[0].transaction)
 })
 const combinedPst = psts[0]
 const otherPsts = psts.slice(1)
 for (let i = 0; i < otherPsts.length; i++) {
   const signatures = otherPsts[i].signatures
   signatures.forEach((signature) => {
     const foundSignature = combinedPst.signatures.find((existingSignature) => {
       return Number(existingSignature.inputIndex) === Number(signature.inputIndex) && 
              existingSignature.sigKey === signature.sigKey && 
	      binToHex(Uint8Array.from(Object.values(existingSignature.sigValue))) === binToHex(Uint8Array.from(Object.values(signature.sigValue)))
     })
     if (!foundSignature) {
      combinedPst.signatures.push(signature)
     }
   })
 }
 console.log('sameTransactions', sameTransactions)
 return combinedPst
}

export const importPst = ({ pst }) => {
  let parsed = pst
  if (typeof pst === 'string') {
    const bin = base64ToBin(pst)
    parsed = JSON.parse(binToUtf8(bin))
  }
    const decoded = decodeTransactionCommon(hexToBin(parsed.transaction))
    parsed.transaction = transactionBinObjectsToUint8Array(
      decoded
    ) 
    parsed.signatures = signatureValuesToUint8Array({ signatures: parsed.signatures })
    parsed.sourceOutputs = sourceOutputsValuesToUint8Array({ sourceOutputs: parsed.sourceOutputs })
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

export const exportPstRaw = ({ multisigTransaction, address, addressIndex = 0, format = 'base64' }) => {
  // const includeSourceOutputs = this.transaction.inputs.some((input) => !input.sourceOutput)
  const { origin, prompt, status } = multisigTransaction.metadata
  const pst = {
    transaction: binToHex(encodeTransactionCommon(transactionBinObjectsToUint8Array(multisigTransaction.transaction))),
    sourceOutputs: multisigTransaction.sourceOutputs,
    signatures: multisigTransaction.signatures,
    metadata: {
      v: 1,
      address,
      addressIndex,
      origin,
      prompt,
      status
    }
  }
  // if (includeSourceOutputs) {
  //   // EMBED
  //   pst.sourceOutputs = this.sourceOutputs
  // }
  if (format === 'json') return JSON.stringify(pst)
  if (format === 'electron-cash') throw new Error('Not yet implemented')
  const bin = utf8ToBin(JSON.stringify(pst))
  return binToBase64(bin)
}


export const exportPst = ({ multisigTransaction, address, addressIndex = 0, format = 'base64' }) => {
  // const includeSourceOutputs = this.transaction.inputs.some((input) => !input.sourceOutput)
  const { origin, prompt, status } = multisigTransaction.metadata
  const sourceOutputs = structuredClone(multisigTransaction.sourceOutputs)
  sourceOutputs.forEach((utxo) => {
    console.log('typeof ', typeof(utxo.outpointTransactionHash))
    if (typeof(utxo.outpointTransactionHash) !== 'string') {
      utxo.outpointTransactionHash = binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash)))
     
    }
    if (typeof(utxo.lockingBytecode) !== 'string') {
      utxo.lockingBytecode = binToHex(Uint8Array.from(Object.values(utxo.lockingBytecode)))
    }
  })
  const signatures = structuredClone(multisigTransaction.signatures)
  signatures.forEach((signature) => {    
    if (typeof(signature.sigValue) !== 'string') {
      signature.sigValue = binToHex(Uint8Array.from(Object.values(signature.sigValue)))
    }
  })
  const pst = {
    transaction: binToHex(encodeTransactionCommon(transactionBinObjectsToUint8Array(multisigTransaction.transaction))),
    sourceOutputs,
    signatures,
    metadata: {
      v: 1,
      address,
      addressIndex,
      origin,
      prompt,
      status
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

// {
//   "topic": "...",
//   "response": {
//     "id": "...",
//     "jsonrpc": "2.0",
//     "result": {
//       "status": "accepted",
//       "message": "Transaction approved. Awaiting other signatures.",
//       "statusUrl": "https://watchtower.cash/multisig/tx/<txid>"
//     }
//   }
// }
