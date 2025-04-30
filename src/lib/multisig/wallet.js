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
  generateTransaction,
  encodeTransactionCommon,
  CashAddressNetworkPrefix
} from 'bitauth-libauth-v3'
import { createTemplate } from './template.js'
import { MultisigTransaction } from './transaction.js'

const getHdKeys = ({ signers, addressIndex = 0 /* { [signerIndex: number]: { xpub: string, name: string ...} } */ }) => {
  console.log('🚀 ~ getHdKeys ~ signers:', signers)
  const hdKeys = {
    addressIndex,
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

export const getLockingData = ({ signers, addressIndex }) => {
  return {
    hdKeys: getHdKeys({ signers, addressIndex })
  }
}

/**
 * m: number
 * n: number
 * signers: { [signerIndex: number]: { xpub: string, name: string, derivationPath: string } }
 */
export class MultisigWallet {
  constructor ({ m, n, signers, name, network }) {
    this.m = m
    this.n = n
    this.name = name
    this.signers = signers
    // this.network = network
    // this.lockingData = getLockingData({ signers: this.signers })
  }

  createTemplate (signatureFormat) {
    let signerNames = Object.entries(this.signers).map((entry) => {
      const key = entry[0]
      const value = entry[1]
      return [key, value.name]
    })
    signerNames = Object.fromEntries(signerNames)
    this.template = createTemplate({
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat,
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

  get lockingData () {
    return getLockingData({ signers: this.signers })
  }

  get signersSafe () {
    const signers = structuredClone(this.signers)
    for (const k of Object.keys(signers)) {
      delete signers[k].xprv
    }
    return signers
  }

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

  getSignerNames () {
    const signerNames = Object.entries(this.signers).map((entry) => {
      const key = entry[0]
      const value = entry[1]
      return [key, value.name]
    })
    return Object.fromEntries(signerNames)
  }

  getTemplate ({ signatureFormat = 'schnorr' }) {
    const signerNames = this.getSignerNames()
    return createTemplate({
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat,
      signerNames
    })
  }

  getCompiler ({ signatureFormat = 'schnorr' }) {
    const signerNames = this.getSignerNames()
    const template = createTemplate({
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat,
      signerNames
    })
    const parsedTemplate = importWalletTemplate(template)
    if (typeof parsedTemplate === 'string') {
      throw new Error('Failed creating multisig wallet template.')
    }
    return walletTemplateToCompilerBch(parsedTemplate)
  }

  getLockingData ({ addressIndex = 0 }) {
    return getLockingData({ signers: this.signers, addressIndex })
  }

  getLockingBytecode ({ addressIndex = 0 }) {
    const lockingData = this.getLockingData({ addressIndex })
    const lockingBytecode = this.compiler.generateBytecode({
      data: lockingData,
      scriptId: this.lockingScriptId
    })
    return lockingBytecode
  }

  getAddress ({ cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet, addressIndex = 0 /* CashAddressNetworkPrefix */ }) {
    const lockingBytecode = this.getLockingBytecode({ addressIndex })
    const { address } = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: cashAddressNetworkPrefix
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

  /**
   * @param {function} getSignerXPrv Function that returns the private key given an xpub
   */
  async loadSignerXprivateKeys (getSignerXPrv) {
    for (const signerEntityIndex of Object.keys(this.signers || {})) {
      const xprv = await getSignerXPrv({ xpub: this.signers[signerEntityIndex].xpub })
      this.signers[signerEntityIndex].xprv = xprv
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
      // network: this.network,
      signers: this.signers
      // address: this.address,
      // template: this.template, // REMOVE THIS
      // addressIndex: this.addressIndex
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
