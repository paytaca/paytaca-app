import {
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBCH,
  assertSuccess,
  decodeHdPublicKey,
  publicKeyToP2pkhCashAddress,
  deriveHdPathRelative,
  deriveHdPrivateNodeFromBip39Mnemonic,
  deriveHdPath,
  deriveHdPublicKey,
  encodeHdPrivateKey
} from 'bitauth-libauth-v3'
import { createTemplate } from './template.js'

const getHdKeys = ({ signers /* { [signerIndex: number]: { xPubKey: string, publicKey: Uint8Array , signerName: string ...} } */ }) => {
  const hdKeys = {
    addressIndex: 0,
    hdPublicKeys: {}
  }
  Object.entries(signers).forEach(([signerIndex, signer]) => {
    const name = `signer_${signerIndex}`
    // hdKeys.hdPublicKeys[name] = signers[signerIndex].publicKey --> error
    hdKeys.hdPublicKeys[name] = signers[signerIndex].xPubKey // we're supposed to provide the xPubKey to lockingData not public key derived from it
  })
  return hdKeys
}

/**
 * Not used on this module just here for reference
 */
export const derivePubKeyFromXPubKey = ({ xPubKey, addressIndex /* ?: e.g. '0/0' */ }) => {
  // NOTE: We can get the fingerprint from node
  const { node, ...rest } = assertSuccess(decodeHdPublicKey(xPubKey))
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
  return {
    hdKeys: getHdKeys({ signers })
  }
}

/**
 * m: number
 * n: number
 * signers: { [signerIndex: number]: { xPubKey: string, signerName: string } }
 */
export class MultisigWallet {
  constructor ({ m, n, signers, signatureFormat, name, network, createTemplate }) {
    this.m = m
    this.n = n
    this.name = name
    this.signers = signers
    this.signatureFormat = signatureFormat || 'ecdsa'
    this.network = network
    if (createTemplate) {
      this.createTemplate()
    }
  }

  createTemplate () {
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
      signatureFormat: this.signatureFormat,
      signerNames
    })
  }

  get lockingScriptId () {
    return 'lock'
  }

  get compiler () {
    const parsedTemplate = importWalletTemplate(this.template)
    if (typeof parsedTemplate === 'string') {
      throw new Error('Failed creating multisig wallet template.')
    }
    const compiler = walletTemplateToCompilerBCH(parsedTemplate)
    return compiler
  }

  get lockingData () {
    return getLockingData({ signers: this.signers })
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

  deriveHdKeysFromMnemonic ({ mnemonic, network, hdPath }) {
    return MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic, network, hdPath })
  }

  toJSON () {
    return {
      name: this.name,
      m: this.m,
      n: this.n,
      signatureFormat: this.signatureFormat,
      network: this.network,
      signers: this.signers,
      template: this.template,
      lockingData: this.lockingData,
      lockingBytecode: this.lockingBytecode,
      address: this.address
    }
  }

  static fromJSON (stringifiedWallet) {
    const parsed = JSON.parse(stringifiedWallet)
    return new MultisigWallet({
      m: parsed.m,
      n: parsed.n,
      signatureFormat: parsed.signatureFormat,
      network: parsed.network,
      signers: parsed.signers,
      createTemplate: true
    })
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
