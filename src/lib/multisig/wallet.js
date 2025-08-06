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
  CashAddressNetworkPrefix,
  binToHex
} from 'bitauth-libauth-v3'

export { createTemplate } from './template.js'

const getHdKeys = ({ signers, addressIndex = 0 /* { [signerIndex: number]: { xpub: string, name: string ...} } */ }) => {
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
  constructor ({ m, n, signers, name }) {
    this.m = m
    this.n = n
    this.name = name
    this.signers = signers
  }

  get lockingScriptId () {
    return 'lock'
  }

  get signersSafe () {
    const signers = structuredClone(this.signers)
    for (const k of Object.keys(signers)) {
      delete signers[k].xprv
    }
    return signers
  }

  /**
   * Primary multisig wallet address. Address at index 0.
   * @deprecated Use getAddress({ addressIndex, cashAddressNetworkPrefix }) instead
   * so that cashAddressNetworkPrefix can be removed as class dependency.
   * Need to refactor WalletConnect before removing this.
   */
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

  getCompiler ({ template }) {
    const parsedTemplate = importWalletTemplate(template)
    if (typeof parsedTemplate === 'string') {
      throw new Error('Failed creating multisig wallet template.')
    }
    return walletTemplateToCompilerBch(parsedTemplate)
  }

  getLockingData ({ addressIndex = 0 }) {
    return getLockingData({ signers: this.signers, addressIndex })
  }

  getLockingBytecode ({ addressIndex = 0, signatureFormat = 'schnorr' }) {
    const lockingData = this.getLockingData({ addressIndex })
    const template = this.getTemplate({ signatureFormat })
    const compiler = this.getCompiler({ template })
    const lockingBytecode = compiler.generateBytecode({
      data: lockingData,
      scriptId: this.lockingScriptId
    })
    return lockingBytecode
  }

  /**
   * Resolves and set default address (index 0) as value of address property.
   */
  resolveDefaultAddress ({
    cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
  }) {
    this.address = this.getAddress({
      addressIndex: 0,
      cashAddressNetworkPrefix
    })
    return this
  }

  getAddress ({
    addressIndex = 0 /* CashAddressNetworkPrefix */,
    cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
  }) {
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
    return MultisigWallet.export(this)
  }

  toJSON () {
    return {
      name: this.name,
      m: this.m,
      n: this.n,
      signers: this.signers
    }
  }

  static export (multisigWallet) {
    const bin = utf8ToBin(stringify(multisigWallet.toJSON()))
    return binToBase64(bin)
  }

  static import (multisigWalletBase64) {
    const bin = base64ToBin(multisigWalletBase64)
    const parsed = JSON.parse(binToUtf8(bin))
    const wallet = MultisigWallet.createInstanceFromObject(parsed)
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
    // wallet.createTemplate()
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

  static getAddress ({ multisigWallet, addressIndex, cashAddressNetworkPrefix }) {
    if (multisigWallet instanceof MultisigWallet) {
      return multisigWallet.getAddress({ addressIndex, cashAddressNetworkPrefix })
    }
    const instance = MultisigWallet.createInstanceFromObject(multisigWallet)
    return instance.getAddress({ addressIndex, cashAddressNetworkPrefix })
  }
}

export const getCompiler = ({ template }) => {
  const parsedTemplate = importWalletTemplate(template)
  if (typeof parsedTemplate === 'string') {
    throw new Error('Failed creating multisig wallet template.')
  }
  return walletTemplateToCompilerBch(parsedTemplate)
}

export const getLockingBytecode = ({ lockingData, template, hex = false }) => {
  const compiler = getCompiler({ template })
  const lockingBytecode = compiler.generateBytecode({
    data: lockingData,
    scriptId: 'lock'
  })
  if (hex) {
    lockingBytecode.bytecode = binToHex(lockingBytecode.bytecode)
    return lockingBytecode
  }
  return lockingBytecode
}

/**
 * The locking bytecode hex of the addressIndex 0 locking data
 */
export const getWalletHash = ({ lockingData, template }) => {
  return getLockingBytecode({ lockingData, template, hex: true }).bytecode
}

export const getMultisigCashAddress = ({
  lockingData,
  template,
  cashAddressNetworkPrefix = CashAddressNetworkPrefix.mainnet
}) => {
  const lockingBytecode = getLockingBytecode({ lockingData, template })
  const { address } = lockingBytecodeToCashAddress({
    bytecode: lockingBytecode.bytecode,
    prefix: cashAddressNetworkPrefix
  })
  return address
}

export const signerCanSign = ({ signerEntityKey, lockingData }) => {
  return Boolean(lockingData.hdKeys.hdPrivateKeys?.[signerEntityKey])
}

export const deriveHdKeysFromMnemonic = ({ mnemonic, network, hdPath }) => {
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

/**
 * Populate's the hdPrivateKeys of lockingData
 */
export const populateHdPrivateKeys = async ({
  lockingData, getSignerXPrv /* Function that resolves to xprv given an xpub */
}) => {
  if (!lockingData.hdKeys?.hdPrivateKeys) {
    lockingData.hdKeys = {
      ...lockingData.hdKeys,
      hdPrivateKeys: {}
    }
  }
  for (const signerEntityId of Object.keys(lockingData.hdKeys.hdPublicKeys)) {
    try {
      const xprv = await getSignerXPrv({
        xpub: lockingData.hdKeys.hdPublicKeys[signerEntityId]
      })
      if (!xprv) continue
      lockingData.hdKeys.hdPrivateKeys[signerEntityId] = xprv
    } catch (e) { console.log(e) }
  }
  return lockingData
}

export const removeHdPrivateKeys = ({ lockingData }) => {
  delete lockingData.hdKeys.hdPublicKeys
  return lockingData
}

export const exportMultisigWallet = (multisigWallet) => {
  const bin = utf8ToBin(stringify(multisigWallet))
  return binToBase64(bin)
}

export const generateTempId = ({ template, lockingData }) => {
  return getLockingBytecode({ template, lockingData, hex: true }).bytecode
}

export const importMultisigWallet = (multisigWalletBase64) => {
  const bin = base64ToBin(multisigWalletBase64)
  const multisigWallet = JSON.parse(binToUtf8(bin))
  if (!multisigWallet.id) {
    multisigWallet.id = generateTempId({
      template: multisigWallet.template, lockingData: multisigWallet.lockingData
    })
  }
  return multisigWallet
}

export const getSignerInfos = (multisigWallet) => {
  return Object.keys(multisigWallet.template.entities).map((signerEntityKey) => {
    const signerEntityIndex = signerEntityKey.split('_')[1]
    return {
      signerEntityIndex,
      name: multisigWallet.template.entities[signerEntityKey].name,
      xpub: multisigWallet.lockingData.hdKeys.hdPublicKeys.xpub
    }
  })
}

export const getRequiredSignatures = (template) => {
  return Number(template.scripts.lock.script.match(/OP_\d/)[0].split('_')[1])
}

export const getTotalSigners = (template) => {
  return Object.keys(template.entities).length
}

export const findMultisigWalletByLockingData = ({ multisigWallets, template, lockingData }) => {
  const lockingBytecode = getLockingBytecode({ template, lockingData })
  const lockingBytecodeHex = binToHex(lockingBytecode.bytecode)
  const wallet = multisigWallets.find((wallet) => {
    const existingLockingBytecode = getLockingBytecode({
      template: wallet.template, lockingData: wallet.lockingData
    })
    const existingLockingBytecodeHex = binToHex(existingLockingBytecode.bytecode)
    return lockingBytecodeHex === existingLockingBytecodeHex
  })
  return wallet
}

export const isMultisigWalletSynced = multisigWallet => {
  if (!multisigWallet.id) return false
  if (!/^[0-9]+$/.test(multisigWallet.id)) return false
  return true
}

export const generateFilename = multisigWallet => {
  if (multisigWallet.template?.name) {
    return `${multisigWallet.template.name}.pmwif`
  }
  const m = getRequiredSignatures(multisigWallet.template)
  const n = getTotalSigners(multisigWallet.template)
  return `${m}-of-${n})}-multisig-wallet.pmwif`
}
