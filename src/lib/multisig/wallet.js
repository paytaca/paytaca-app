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
  binToHex,
  hexToBin,
  sha256
} from 'bitauth-libauth-v3'
import { createTemplate } from './template.js'

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

// export const getLockingData = ({ signers, addressIndex }) => {
//   return {
//     hdKeys: getHdKeys({ signers, addressIndex })
//   }
// }

export const getLockingData = ({ signers, addressDerivationPath }) => {
  const signersWithPublicKeys = derivePublicKeys({ signers, addressDerivationPath })
  const lockingData = {
    bytecode: {}
  }
  for (const index in signersWithPublicKeys) {
    let publicKey = signersWithPublicKeys[index].publicKey 
    if (typeof(publicKey) === 'string') {
      publicKey = hexToBin(publicKey)
    }
    lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
  }
  return lockingData
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
// export const getWalletHash = ({ lockingData, template }) => {
//   return getLockingBytecode({ lockingData, template, hex: true }).bytecode
// }

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
  // if (!multisigWallet.id) {
  //   multisigWallet.id = generateTempId({
  //     template: multisigWallet.template, lockingData: multisigWallet.lockingData
  //   })
  // }
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
  if (multisigWallet.name) {
    return `${multisigWallet.name}.pmwif`
  }
  return `${multisigWallet.m}-of-${multisigWallet.signers.length}-multisig-wallet.pmwif`
}

// Bip67

/**
 * @param {Object} params
 * @param {MultisigWalletSigner[]} params.signers
 * @param {string} [params.addressDerivationPath='0/0']
 * @returns {MultisigWalletSigner[]} The multisig wallet signers with publicKey at `addressDerivationPath` set
 */
export const derivePublicKeys = ({ signers, addressDerivationPath = '0/0', bip67Sort = true }) => {
  const _signers = structuredClone(signers)
  const signersWithPublicKeys = _signers.map(signer => {
    const decodedHdPublicKey = decodeHdPublicKey(signer.xpub, addressDerivationPath)
    const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, addressDerivationPath)
    signer.publicKey = binToHex(publicKey)
    return signer
  })

  if (!bip67Sort) return signersWithPublicKeys

  signersWithPublicKeys.sort((signerA, signerB) => {
    return signerA.publicKey.localeCompare(signerB.publicKey)
  })
  return signersWithPublicKeys
}

export const getAddress = ({ lockingData, compiler, prefix = CashAddressNetworkPrefix.mainnet }) => {
    const lockingBytecode = compiler.generateBytecode({
      data: lockingData,
      scriptId: 'lock',
      debug: true
    })

    const address = lockingBytecodeToCashAddress({
      bytecode: lockingBytecode.bytecode,
      prefix: prefix
    });
    return address.address
}

export const createWallet = ({ name, m, signers }) => {
  // const lockingData = getLockingData({ signers, addressDerivationPath: '0/0' })
  // const template = createTemplate({ name, m, signers })
  // const id = generateTempId({ lockingData, template })
  return {
    // id,
    name, 
    m, 
    signers
  }
}

/**
 * Uses the wallet's locking bytecode at 0/0 as UUID 
 * @param {MultisigWallet}
 * @returns {string} - Locking bytecode at 0/0 in hex
 */
export const getWalletUUID = multisigWallet => {
  const lockingData = getLockingData({ signers: multisigWallet.signers, addressDerivationPath: '0/0' })
  const template = createTemplate({ ...multisigWallet })
  const lockingBytecode = getLockingBytecode({ lockingData, template, hex: true })
  return lockingBytecode.bytecode
}

/**
 * Sha256 hash of the UUID
 */
export const getWalletHash = multisigWallet => {
  const uuid = getWalletUUID(multisigWallet)
  const hash = sha256.hash(hexToBin(uuid))
  return binToHex(hash)
}

export const getDepositAddress = ({ multisigWallet, addressIndex = 0, prefix = CashAddressNetworkPrefix.mainnet }) => {
    const template = createTemplate({ ...multisigWallet })
    const lockingData = getLockingData({ signers: multisigWallet.signers, addressDerivationPath: `0/${addressIndex}` })
    const compiler = getCompiler({ template })
    return getAddress({ lockingData, compiler, prefix })
    
} 

export const getChangeAddress = ({ multisigWallet, addressIndex = 0, prefix = CashAddressNetworkPrefix.mainnet }) => {
    const template = createTemplate({ ...multisigWallet })
    const lockingData = getLockingData({ signers: multisigWallet.signers, addressDerivationPath: `1/${addressIndex}` })
    const compiler = getCompiler({ template })
    return getAddress({ lockingData, compiler, prefix })
}

export const issueNewChangeAddress = ({ multisigWallet, addressIndex = 0, prefix = CashAddressNetworkPrefix.mainnet }) => {
  // TODO: enable this when we add a bit of privacy and implement auto issuance of change address
  // let lastIssuedChangeAddress = multisigWallet.lastIssuedChangeAddress || 0
  // lastIssuedChangeAddress++ 
  // changeAddress = getChangeAddress({ multisigWallet, addressIndex: lastIssuedChangeAddress, prefix })
  // MUST: Watch the multisigWallet and save the lastIssuedChangeAddress
  
  // For Now: We'll use the deposit address index 0 as change address
  return getDepositAddress({ multisigWallet, addressIndex: 0 })
}




