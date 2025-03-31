import {
  encodeTransactionCommon,
  hashTransaction,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH,
  CashAddressNetworkPrefix,
  generateTransaction,
  binToHex,
  extractResolvedVariables,
  utf8ToBin,
  binToBase64,
  base64ToBin,
  binToUtf8
} from 'bitauth-libauth-v3'
import { stringify } from 'querystring'

export class Pst {
  /**
   * Optional - id, transaction, sourceOutputs, metadata, signatures
   */
  constructor ({ id, m, n, lockingData, lockingScriptId, template, network, transaction, sourceOutputs, metadata, signatures }) {
    this.id = id
    this.m = m
    this.n = n
    this.lockingData = lockingData
    this.lockingScriptId = lockingScriptId
    this.template = template
    this.network = network || CashAddressNetworkPrefix.mainnet
    this.signatures = signatures || {}
    this.transaction = {}
    this.sourceOutputs = {}
    this.metadata = {}
    if (transaction) {
      this.transaction = Pst.transactionBinObjectsToUint8Array(transaction)
      this.sourceOutputs = sourceOutputs
      this.metadata = metadata
      if (!this.id) {
        this.id = this.transactionHex
      }
    }
  }

  get compiler () {
    return walletTemplateToCompilerBCH(this.template)
  }

  /**
   * Derived from locking bytecode of this locking data and template
   */
  get address () {
    const lockingBytecode = this.compiler.generateBytecode({
      data: this.lockingData,
      scriptId: this.lockingScriptId
    })

    const { address } = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: this.network
    })
    return address
  }

  get signersInfo () {
    const signersLockingData = this.lockingData.hdKeys.hdPublicKeys // { signer_1: xPub..., .... }
    const signersInfo = {}
    for (const signer of Object.entries(signersLockingData)) {
      const [signerEntityKey, signerHdPubKey] = signer
      const template = this.template
      const signerSignature = Object.entries(this.signatures || {}).find((signatureKeyValue) => {
        const [signatureKey/* , signatureValue */] = signatureKeyValue
        const signerEntityVariableKey = signatureKey.split('.')[0]
        return Boolean(template.entities[signerEntityKey].variables[signerEntityVariableKey])
      })
      signersInfo[signerEntityKey] = this.template.entities[signerEntityKey]
      signersInfo[signerEntityKey].hdPublicKey = signerHdPubKey
      if (signerSignature) {
        signersInfo[signerEntityKey].signature = Object.fromEntries([signerSignature])
      }
    }
    return signersInfo
  }

  get transactionHex () {
    return hashTransaction(
      encodeTransactionCommon(Pst.transactionBinObjectsToUint8Array(this.transaction))
    )
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

    const unlockingScriptId = this.template.entities[entity].scripts.filter((scriptId) => scriptId !== 'lock')[0]

    const transaction = structuredClone(this.transaction)
    for (const input of transaction.inputs) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(utxo.outpointTransactionHash) === binToHex(input.outpointTransactionHash)
        })
      }
      const { address: sourceOutputAddress } = lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network })
      if (sourceOutputAddress === this.address) {
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
    transaction.inputs.forEach(i => delete i.sourceOutput)
    const signAttempt = generateTransaction({ ...transaction })
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

    const transaction = structuredClone(this.transaction)
    for (const input of transaction.inputs) {
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
      ...transaction
    })
    return successfulCompilation
  }

  save (store) {
    // TODO: serialize pst before saving?
    store(this)
  }

  toBase64 () {
    const bin = utf8ToBin(JSON.stringify(this.toJSON()))
    return binToBase64(bin)
  }

  toBase64FromJsonSafe () {
    const bin = utf8ToBin(stringify(this.toJSON()))
    return binToBase64(bin)
  }

  toJSON () {
    // TODO: make this leaner
    return {
      id: this.id,
      m: this.m,
      n: this.n,
      lockingData: this.lockingData,
      lockingScriptId: this.lockingScriptId,
      template: this.template,
      transaction: this.transaction,
      network: this.network,
      address: this.address,
      transactionHex: this.transactionHex,
      signatures: this.signatures
    }
  }

  async toPstFile (filename) {
    const jsonString = stringify(this.toJSON(), 0)
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.ppst`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    try {
      const fs = await import('fs')
      fs.writeFileSync(`${filename}.ppst`, jsonString)
    } catch (error) {
      console.error('Environment not supported for file saving')
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

  static createInstanceFromJSON (stringifiedPst) {
    return new Pst(JSON.parse(stringifiedPst))
  }

  static createInstanceFromObject (pstData) {
    if (typeof (pstData) === 'string') { return Pst.fromJSON(pstData) }
    return new Pst(structuredClone(pstData))
  }

  static createInstanceFromBase64 (pstData) {
    if (typeof (pstData) !== 'string') return
    const bin = base64ToBin(pstData)
    const parsed = JSON.parse(binToUtf8(bin))
    return new Pst(parsed)
  }

  /**
   * Transform a transaction's bin values in object forms to Uint8Arrays
   * @return A copy of the transaction object
   */
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
    })
    return {
      version: transaction.version,
      locktime: transaction.locktime,
      inputs: transaction.inputs,
      outputs: transaction.outputs
    }
  }
}
