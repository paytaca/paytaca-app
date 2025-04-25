import {
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBch,
  assertSuccess,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
  deriveHdPathRelative,
  deriveHdPrivateNodeFromBip39Mnemonic,
  deriveHdPath,
  deriveHdPublicKey,
  encodeHdPrivateKey,
  stringify,
  utf8ToBin,
  binToBase64,
  base64ToBin,
  binToUtf8,
  binToHex,
  extractResolvedVariables,
  generateTransaction
} from 'bitauth-libauth-v3'
import { createTemplate } from './template.js'
import { MultisigTransaction } from './transaction.js'

const getHdKeys = ({ signers /* { [signerIndex: number]: { xpub: string, signerName: string ...} } */ }) => {
  console.log('🚀 ~ getHdKeys ~ signers:', signers)
  const hdKeys = {
    addressIndex: 0,
    hdPublicKeys: {}
  }
  Object.entries(signers).forEach(([signerIndex, signer]) => {
    const name = `signer_${signerIndex}`
    // hdKeys.hdPublicKeys[name] = signers[signerIndex].publicKey --> error
    hdKeys.hdPublicKeys[name] = signers[signerIndex].xpub // we're supposed to provide the xpub to lockingData not public key derived from it
  })
  return hdKeys
}

/**
 * Not used on this module just here for reference
 */
export const derivePubKeyFromXPubKey = ({ xpub, addressIndex /* ?: e.g. '0/0' */ }) => {
  // NOTE: We can get the fingerprint from node
  const { node, ...rest } = assertSuccess(decodeHdPublicKey(xpub))
  const { publicKey } = deriveHdPathRelative(node, addressIndex || '0')
  const { address } = publicKeyToP2pkhCashAddress({ publicKey })
  return {
    publicKey,
    address,
    node,
    rest
  }
}

export const getLockingData = ({ signers }) => {
  console.log('🚀 ~ getLockingData ~ signers:', signers)
  return {
    hdKeys: getHdKeys({ signers })
  }
}

/**
 * m: number
 * n: number
 * signers: { [signerIndex: number]: { xpub: string, signerName: string, derivationPath: string } }
 */
export class MultisigWallet {
  constructor ({ m, n, signers, signatureFormat, name, network }) {
    this.m = m
    this.n = n
    this.name = name
    this.signers = signers
    this.signatureFormat = signatureFormat || 'schnorr'
    this.network = network
    this.lockingData = getLockingData({ signers: this.signers })
  }

  createTemplate (signatureFormat) {
    let signerNames = Object.entries(this.signers).map((entry) => {
      const key = entry[0]
      const value = entry[1]
      return [key, value.signerName]
    })
    signerNames = Object.fromEntries(signerNames)
    this.template = createTemplate({
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat: signatureFormat || this.signatureFormat,
      signerNames
    })
    return this
  }

  get lockingScriptId () {
    return 'lock'
  }

  get compiler () {
    const parsedTemplate = importWalletTemplate(this.template)
    if (typeof parsedTemplate === 'string') {
      throw new Error('Failed creating multisig wallet template.')
    }
    const compiler = walletTemplateToCompilerBch(parsedTemplate)
    return compiler
  }

  // get lockingData () {
  //   return getLockingData({ signers: this.signers })
  // }

  get lockingBytecode () {
    const lockingBytecode = this.compiler.generateBytecode({
      data: this.lockingData,
      scriptId: this.lockingScriptId
    })
    return lockingBytecode
  }

  get address () {
    const { address } = lockingBytecodeToCashAddress({
      bytecode: this.lockingBytecode.bytecode,
      prefix: this.network
    })
    return address
  }

  signerCanSign ({ signerEntityIndex }) {
    return Boolean(this.signers[signerEntityIndex].xprv)
  }

  signerSigned ({ multisigTransaction, signerEntityIndex }) {
    const signerSignedOnAllInputs = []
    for (const input of multisigTransaction.transaction.inputs) {
      let sourceOutput = input.sourceOutput

      if (!sourceOutput) {
        sourceOutput = multisigTransaction.sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) === binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      const { address } = lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network })
      if (address === this.address) {
        if (!multisigTransaction.signatures[input.outpointIndex]) return false
        const signerSignedOnInput = Object.keys(multisigTransaction.signatures[input.outpointIndex]).some((signatureKey) => {
          return signatureKey.includes(`key${signerEntityIndex}`)
        })
        signerSignedOnAllInputs.push(signerSignedOnInput)
      }
    }
    return signerSignedOnAllInputs.every(answer => answer === true)
  }

  signTransaction ({ multisigTransaction, signerEntityIndex /* example: 1 */ }) {
    const { sourceOutputs, signatures, metadata } = multisigTransaction
    const transaction = MultisigTransaction.transactionBinObjectsToUint8Array(multisigTransaction.transaction)
    console.log(`Transaction signerIndex ${signerEntityIndex}`, transaction)
    const entityUnlockingData = {
      ...this.lockingData,
      hdKeys: {
        ...this.lockingData.hdKeys,
        hdPrivateKeys: {
          [`signer_${signerEntityIndex}`]: this.signers[signerEntityIndex].xprv
        }
      }
    }

    const unlockingScriptId = this.template.entities[`signer_${signerEntityIndex}`].scripts.filter((scriptId) => scriptId !== 'lock')[0]
    for (const input of transaction.inputs) {
      let sourceOutput = input.sourceOutput

      if (!sourceOutput) {
        sourceOutput = sourceOutputs.find((utxo) => {
          return utxo.outpointIndex === input.outpointIndex && binToHex(Uint8Array.from(Object.values(utxo.outpointTransactionHash))) === binToHex(Uint8Array.from(Object.values(input.outpointTransactionHash)))
        })
      }
      const { address: sourceOutputAddress } = lockingBytecodeToCashAddress({ bytecode: Uint8Array.from(Object.values(sourceOutput.lockingBytecode)), prefix: this.network })
      if (sourceOutputAddress === this.address) {
        input.unlockingBytecode = {
          // ...input.unlockingBytecode,
          compiler: this.compiler,
          data: entityUnlockingData,
          valueSatoshis: sourceOutput.valueSatoshis,
          script: unlockingScriptId,
          token: sourceOutput.token
        }
      }
    }

    const signAttempt = generateTransaction({ ...transaction })

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
    metadata.signatureCount++
    metadata.requiredSignatures = this.m
    return multisigTransaction
  }

  /**
   * @param {function} getSignerXPrv Function that returns the private key given an xpub
   */
  async loadSignerXprivateKeys (getSignerXPrv) {
    // if (!this.lockingData.hdKeys.hdPrivateKeys) {
    //   this.lockingData.hdKeys.hdPrivateKeys = {}
    // }
    for (const signerEntityIndex of Object.keys(this.signers || {})) {
      const xprv = await getSignerXPrv({ xpub: this.signers[signerEntityIndex].xpub })
      this.signers[signerEntityIndex].xprv = xprv
      // this.lockingData.hdKeys.hdPrivateKeys[`signer_${signerEntityIndex}`] = xprv
    }
  }

  deriveHdKeysFromMnemonic ({ mnemonic, network, hdPath }) {
    return MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic, network, hdPath })
  }

  export () {
    console.log('EXPORTING', stringify(this))
    return MultisigWallet.export(this)
  }

  toJSON () {
    return {
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat: this.signatureFormat,
      network: this.network,
      signers: this.signers,
      address: this.address,
      template: this.template
    }
  }

  static export (multisigWallet) {
    const bin = utf8ToBin(stringify(multisigWallet.toJSON()))
    return binToBase64(bin)
  }

  static import (multisigWalletBase64) {
    const bin = base64ToBin(multisigWalletBase64)
    const parsed = JSON.parse(binToUtf8(bin))
    console.log('🚀 ~ MultisigWallet ~ import ~ parsed:', parsed)
    const wallet = MultisigWallet.createInstanceFromObject(parsed)
    wallet.createTemplate()
    return wallet
  }

  static fromJSON (stringifiedWallet) {
    const parsed = JSON.parse(stringifiedWallet)
    const wallet = new MultisigWallet({
      m: parsed.m,
      n: parsed.n,
      signatureFormat: parsed.signatureFormat,
      network: parsed.network,
      signers: parsed.signers
    })
    wallet.createTemplate()
    return wallet
  }

  static createInstanceFromObjects (wallets) {
    const walletInstances = wallets.map((wallet) => {
      return MultisigWallet.createInstanceFromObject(wallet)
    })
    return walletInstances
  }

  static createInstanceFromObject (wallet) {
    const multisigWallet = new MultisigWallet(structuredClone(wallet))
    multisigWallet.createTemplate()
    return multisigWallet
  }

  static deriveHdKeysFromMnemonic ({ mnemonic, network, hdPath }) {
    const node = deriveHdPath(
      deriveHdPrivateNodeFromBip39Mnemonic(
        mnemonic
      ),
      hdPath || "m/44'/145'/0'"
    )
    const { hdPrivateKey } = encodeHdPrivateKey({ network: network || 'mainnet', node })
    const { hdPublicKey } = deriveHdPublicKey(hdPrivateKey)
    return {
      hdPrivateKey,
      hdPublicKey
    }
  }
}
