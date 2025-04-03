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
  binToUtf8,
  hexToBin,
  stringify,
  decodeTransactionCommon
} from 'bitauth-libauth-v3'

export class Pst {
  /**
   * Optional - signatures, template, unsignedTransaction, sourceOutputs, metadata
   */
  constructor ({ lockingData, network, signatures, template, unsignedTransaction, sourceOutputs, metadata }) {
    this.lockingData = lockingData
    this.network = network || CashAddressNetworkPrefix.mainnet
    this.signatures = signatures
    this.sourceOutputs = sourceOutputs
    this.metadata = metadata
    this.template = template
    if (unsignedTransaction) {
      const transaction = decodeTransactionCommon(hexToBin(unsignedTransaction))
      this.setTransaction(transaction)
    }
  }

  get id () {
    if (!this.unsignedTransaction) return
    return hashTransaction(hexToBin(this.unsignedTransaction))
  }

  get m () {
    if (!this.template) return
    const ops = this.template.scripts[this.lockingScriptId].script.split('\n')
    return Number(ops[0].split('_')[1])
  }

  get n () {
    if (!this.template) return
    const ops = this.template.scripts[this.lockingScriptId].script.split('\n')
    return Number(ops[ops.length - 2].split('_')[1])
  }

  get lockingScriptId () {
    return 'lock'
  }

  get compiler () {
    if (!this.template) return
    return walletTemplateToCompilerBCH(this.template)
  }

  /**
   * Derived from locking bytecode of this locking data and template
   */
  get address () {
    if (!this.compiler) return ''
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
    if (!this.template) return {}
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
      signersInfo[signerEntityKey] = structuredClone(this.template.entities[signerEntityKey])
      signersInfo[signerEntityKey].hdPublicKey = signerHdPubKey
      if (signerSignature) {
        signersInfo[signerEntityKey].signature = Object.fromEntries([signerSignature])
      }
    }
    return signersInfo
  }

  get transaction () {
    return {
      version: this.version,
      inputs: this.inputs,
      outputs: this.outputs,
      locktime: this.locktime
    }
  }

  get unsignedTransaction () {
    if (!this.inputs && !this.outputs) return ''
    return binToHex(encodeTransactionCommon(Pst.transactionBinObjectsToUint8Array(this.transaction)))
  }

  get totalSatoshiValue () {
    console.log('OUTPUTS', this.outputs)
    return this.outputs?.reduce((total, currentOutput) => {
      total += Number(currentOutput.valueSatoshis)
      return total
    }, 0)
  }

  get totalBchValue () {
    return this.totalSatoshiValue / 1e8
  }

  get numberOfRecipients () {
    const recipients = new Set()
    this.outputs.forEach(output => {
      const { address } = lockingBytecodeToCashAddress({ bytecode: output.lockingBytecode })
      recipients.add(address)
    })
    return recipients.size
  }

  setVersion (version) {
    this.version = version || 2
    return this
  }

  setLocktime (locktime) {
    this.locktime = locktime || 0
    return this
  }

  addInput (input, sourceOutput) {
    const _input = structuredClone(input)
    const _sourceOutput = structuredClone(sourceOutput)
    if (!_input.sourceOutput) {
      _input.sourceOutput = sourceOutput
    }
    if (_input.outpointTransactionHash && !(_input?.outpointTransactionHash instanceof Uint8Array)) {
      _input.outpointTransactionHash = Uint8Array.from(Object.values((_input.outpointTransactionHash)))
    }
    if (_input.unlockingBytecode && !(_input?.unlockingBytecode instanceof Uint8Array)) {
      _input.unlockingBytecode = Uint8Array.from(Object.values((_input.unlockingBytecode)))
    }
    this.inputs.push(structuredClone(_input))
    this.sourceOutputs.push(_sourceOutput)
    return this
  }

  addOutput (output) {
    const _output = structuredClone(output)
    if (_output.lockingBytecode && !(_output?.lockingBytecode instanceof Uint8Array)) {
      _output.lockingBytecode = Uint8Array.from(Object.values(_output.lockingBytecode))
    }
    this.outputs.push(_output)
    return this
  }

  setTemplate (template) {
    this.template = template
    return this
  }

  setTransaction (transaction) {
    const t = Pst.transactionBinObjectsToUint8Array(structuredClone(transaction))
    this.inputs = t.inputs
    this.outputs = t.outputs
    this.version = t.version
    this.locktime = t.locktime
    return this
  }

  setSourceOutputs (sourceOutputs) {
    const _sourceOutputs = structuredClone(sourceOutputs)
    _sourceOutputs.forEach((utxo) => {
      utxo.outpointTransactionHash = Uint8Array.from(Object.values(utxo.outpointTransactionHash))
      utxo.lockingBytecode = Uint8Array.from(Object.values(utxo.lockingBytecode))
    })
    this.sourceOutputs = _sourceOutputs
    return this
  }

  setMetadata (metadata) {
    this.metadata = metadata
    return this
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
          script: unlockingScriptId,
          token: sourceOutput.token
          // TODO: token: sourceOutput.token test utxo with a token
        }
      }
    }
    transaction.inputs.forEach(i => delete i.sourceOutput)
    const signAttempt = generateTransaction({ ...transaction })
    window.signAttempt = signAttempt // TODO: delete
    window.hexToBin = hexToBin
    window.binToHex = binToHex
    const signerResolvedVariables = extractResolvedVariables(signAttempt)
    this.signatures = {
      ...this.signatures,
      ...signerResolvedVariables
    }
    return this
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
    store(structuredClone(this.toJSON()))
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
    const signatures = structuredClone(this.signatures)
    Object.keys(signatures).forEach((key) => {
      signatures[key] = binToHex(Uint8Array.from(Object.values(signatures[key])))
    })
    return {
      id: this.id,
      lockingData: this.lockingData,
      template: this.template,
      network: this.network,
      unsignedTransaction: this.unsignedTransaction,
      signatures: this.signatures,
      metadata: this.metadata,
      signersInfo: this.signersInfo,
      sourceOutputs: this.sourceOutputs
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
