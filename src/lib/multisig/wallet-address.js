import { 
    hexToBin,
    cashAddressToLockingBytecode,
    base58AddressToLockingBytecode,
    binToHex,
    lockingBytecodeToCashAddress,
    compileScript
} from 'bitauth-libauth-v3'
import {
    derivePublicKeys,
    sortPublicKeysBip67
} from './wallet-keys.js'

import {
    createTemplate,
    getCompiler
} from './template.js'


/**
 * Derives public keys from signers and creates locking bytecode data for script compilation.
 * @param {Object} params
 * @param {Array<{xpub: string, name?: string}>} params.signers - The signers with extended public keys
 * @param {string} params.addressDerivationPath - The relative derivation path (e.g., '0/0')
 * @returns {Object} Locking data with bytecode containing derived public keys
 */
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

/**
 * Generates a cash address from locking data and compiler.
 * @param {Object} params
 * @param {Object} params.lockingData - The locking bytecode data
 * @param {Object} params.compiler - The script compiler
 * @param {string} [params.prefix=CashAddressNetworkPrefix.mainnet] - Network prefix
 * @returns {string} The cash address
 */
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

/**
 * Generates a deposit (receiving) address for the multisig wallet.
 * @param {Object} params
 * @param {MultisigWalletConfig} params.multisigWallet - The multisig wallet configuration
 * @param {number} [params.addressIndex=0] - The address index
 * @param {string} [params.prefix=CashAddressNetworkPrefix.mainnet] - Network prefix
 * @returns {string} The deposit cash address
 */
export const getDepositAddress = ({ multisigWallet, addressIndex = 0, prefix = CashAddressNetworkPrefix.mainnet }) => {
    const template = createTemplate({ ...multisigWallet })
    const lockingData = getLockingData({ signers: multisigWallet.signers, addressDerivationPath: `0/${addressIndex}` })
    const compiler = getCompiler({ template })
    return getAddress({ lockingData, compiler, prefix })
    
} 

/**
 * Generates a change address for the multisig wallet.
 * @param {Object} params
 * @param {MultisigWalletConfig} params.multisigWallet - The multisig wallet configuration
 * @param {number} [params.addressIndex=0] - The address index
 * @param {string} [params.prefix=CashAddressNetworkPrefix.mainnet] - Network prefix
 * @returns {string} The change cash address
 */
export const getChangeAddress = ({ multisigWallet, addressIndex = 0, prefix = CashAddressNetworkPrefix.mainnet }) => {
    const template = createTemplate({ ...multisigWallet })
    const lockingData = getLockingData({ signers: multisigWallet.signers, addressDerivationPath: `1/${addressIndex}` })
    const compiler = getCompiler({ template })
    return getAddress({ lockingData, compiler, prefix })
}

/**
 * Validates a cash address or base58 address.
 * @param {string} address - The address to validate
 * @returns {[boolean, any]} Tuple of [isValid, error]
 */
export const isValidAddress = (address) => {
  let lockingBytecodeOrError = cashAddressToLockingBytecode(address)
  if (typeof(lockingBytecodeOrError) !== 'string' && lockingBytecodeOrError.bytecode) {
    return [true]
  }
  lockingBytecodeOrError = base58AddressToLockingBytecode(address)
  if (typeof(lockingBytecodeOrError) !== 'string' && lockingBytecodeOrError.bytecode) {
    return [true]
  }
  return [false, lockingBytecodeOrError]
}

/**
 * Generates the locking bytecode for a multisig wallet.
 * @param {Object} params
 * @param {Object} params.lockingData - The locking bytecode data
 * @param {Object} params.template - The wallet template
 * @param {boolean} [params.hex=false] - If true, returns bytecode as hex string
 * @returns {Object} The locking bytecode result
 */
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
 * Generates the redeem script for a multisig wallet.
 * @param {number} m - The required number of signatures
 * @param {Array<Uint8Array|string>} publicKeys - Array of public keys (hex string or Uint8Array)
 * @returns {Uint8Array} The compiled redeem script bytecode
 */
export const generateRedeemScript = (m, publicKeys) => {
  const sortedPublicKeys = sortPublicKeysBip67(publicKeys)
  const lockingData = {
    bytecode: {}
  }
  for (const index in sortedPublicKeys) {
    let publicKey = sortedPublicKeys[index]
    if (typeof(publicKey) === 'string') {
      publicKey = hexToBin(publicKey)
    }
    lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
  }

  const template = createTemplate({ m, signers: sortedPublicKeys.map((p) => ({ publicKey: p })) })
  const compiler = getCompiler({ template })
  const script = compileScript('lock', lockingData, compiler.configuration)
  return script.reduce.bytecode
}