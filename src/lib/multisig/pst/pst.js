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
    // this.compiler = walletTemplateToCompilerBCH(template)
    this.network = network || CashAddressNetworkPrefix.mainnet
    this.signatures = signatures || {}
    this.transaction = {}
    this.sourceOutputs = {}
    this.metadata = {}
    if (transaction) {
      this.setTransactionData({ transaction, sourceOutputs, metadata })
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

  setTransactionData ({ transaction, sourceOutputs, metadata }) {
    this.transaction = structuredClone(transaction)
    this.sourceOutputs = structuredClone(sourceOutputs)
    this.metadata = structuredClone(metadata)
    this.transaction.inputs.forEach(input => {
      input.outpointTransactionHash = Uint8Array.from(Object.values((input.outpointTransactionHash)))
      input.unlockingBytecode = Uint8Array.from(Object.values((input.unlockingBytecode)))
    })
    if (!this.id) {
      this.id = generateId({ transaction })
    }
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

    // const lockingBytecode = this.compiler.generateBytecode({
    //   data: this.lockingData,
    //   scriptId: this.lockingScriptId
    // })

    // const { address } = lockingBytecodeToCashAddress({
    //   bytecode: lockingBytecode.bytecode,
    //   prefix: this.network
    // })

    const unlockingScriptId = this.template.entities[entity].scripts.filter((scriptId) => scriptId !== 'lock')[0]

    for (const input of this.transaction.inputs) {
      let sourceOutput = input.sourceOutput
      if (!sourceOutput) {
        sourceOutput = this.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(utxo.outpointTransactionHash) === binToHex(input.outpointTransactionHash)
        })
      }
      if (lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network }).address === this.address) {
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

  toBase64 () {
    console.log('THIS', this.toJSON())
    const bin = utf8ToBin(JSON.stringify(this.toJSON()))
    console.log('🚀 ~ Pst ~ toBase64 ~ bin:', bin)
    return binToBase64(bin)
  }

  toBase64FromJsonSafe () {
    const bin = utf8ToBin(stringify(this.toJSON()))
    return binToBase64(bin)
  }

  toJSON () {
    return {
      id: this.id,
      m: this.m,
      n: this.n,
      lockingData: this.lockingData,
      lockingScriptId: this.lockingScriptId,
      template: this.template,
      transaction: this.transaction,
      network: this.network,
      signatures: this.signatures,
      address: this.address
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
    const { transaction, ...rest } = JSON.parse(stringifiedPst)
    const pst = new Pst({ rest })
    pst.setTransactionData(transaction)
    return pst
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
}
