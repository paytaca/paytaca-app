/**
 * ============================================================================
 * MULTISIG WALLET - Core Wallet Implementation
 * ============================================================================
 * 
 * @fileoverview MultisigWallet class and related utilities for managing 
 * multi-signature Bitcoin Cash wallets with coordination server support.
 * 
 * @module multisig/wallet
 * @version 2.0.0
 * @author Paytaca Team
 * @license MIT
 * 
 * ============================================================================
 * ARCHITECTURE DECISION
 * ============================================================================
 * 
 * This file is intentionally monolithic (~2058 lines) for the following reasons:
 * 
 * 1. STATE ENCAPSULATION
 *    - Wallet maintains complex internal state (addresses, UTXOs, indices)
 *    - Splitting would require exposing internal state or creating tight coupling
 *    - Single class ensures state consistency and atomic operations
 * 
 * 2. ATOMIC OPERATIONS
 *    - Transaction creation spans multiple responsibilities:
 *      * Address derivation → UTXO selection → Fee calculation → Proposal creation
 *    - Keeping these together ensures atomic, consistent operations
 * 
 * 3. DEPENDENCY MANAGEMENT
 *    - Single file avoids circular dependencies
 *    - Simplifies import graph and module boundaries
 *    - Reduces bundle splitting complexity
 * 
 * 4. CODE NAVIGATION
 *    - Modern IDEs with "Go to Definition" and outline view
 *    - Section markers provide clear organization
 *    - JSDoc enables intelligent code navigation
 * 
 * ============================================================================
 * FILE ORGANIZATION
 * ============================================================================
 * 
 * SECTION 1: TYPE DEFINITIONS (lines 1-150)
 *   - MultisigWalletSigner, MultisigWalletConfig, etc.
 *   - Callback types for async operations
 * 
 * SECTION 2: IMPORTS & CONSTANTS (lines 111-150)
 *   - External dependencies (bitauth-libauth-v3, big.js)
 *   - Internal module imports
 *   - Module constants
 * 
 * SECTION 3: UTILITY FUNCTIONS (lines 151-375)
 *   - getLockingData, getCompiler, getLockingBytecode
 *   - getMultisigCashAddress, generateFilename
 *   - sortPublicKeysBip67, derivePublicKey, derivePublicKeys
 *   - getAddress, createWallet, getWalletUUID, getWalletHash
 *   - getDepositAddress, getChangeAddress, isValidAddress
 *   - generateRedeemScript, getMasterFingerprint
 * 
 * SECTION 4: PRICE ORACLE CLASS (lines 376-385)
 *   - PriceOracle.fetchPrice()
 * 
 * SECTION 5: MULTISIG WALLET CLASS (lines 387-2058)
 *   5.1 Constructor & Configuration (lines 387-430)
 *   5.2 Getters & Properties (lines 431-461)
 *   5.3 Address Methods (lines 463-525)
 *   5.4 UTXO Management (lines 536-714)
 *   5.5 Balance & Asset Methods (lines 716-826)
 *   5.6 Address Subscription (lines 828-884)
 *   5.7 UTXO Selection (lines 909-1127)
 *   5.8 Transaction Creation (lines 1129-1278)
 *   5.9 WalletConnect Integration (lines 1280-1400)
 *   5.10 Coordination Server Methods (lines 1401-1600)
 *   5.11 Serialization & Export (lines 1601-1850)
 *   5.12 Import & Deserialization (lines 1851-2058)
 * 
 * ============================================================================
 * PLANNED ORGANIZATIONAL IMPROVEMENTS
 * ============================================================================
 * 
 * PHASE 1: Documentation Enhancement (Current)
 *   ✓ Add comprehensive JSDoc to all methods
 *   ✓ Add section markers for navigation
 *   ✓ Document architecture decisions
 *   - Add inline comments for complex logic
 * 
 * PHASE 2: Utility Extraction (Future - Q2 2026)
 *   - Extract address derivation utilities → wallet-address-utils.js
 *   - Extract UTXO selection algorithms → wallet-utxo-selector.js
 *   - Extract serialization logic → wallet-serializer.js
 *   - Keep core wallet class intact
 * 
 * PHASE 3: Helper Classes (Future - Q3 2026)
 *   - Create WalletAddressManager class
 *   - Create WalletUtxoManager class
 *   - Create WalletTransactionBuilder class
 *   - Use composition pattern in main Wallet class
 * 
 * PHASE 4: Module Split (Future - Q4 2026)
 *   - Split if file exceeds 3000 lines
 *   - Maintain backward compatibility
 *   - Use re-export pattern for unified imports
 * 
 * ============================================================================
 * MAINTENANCE GUIDELINES
 * ============================================================================
 * 
 * WHEN ADDING NEW FUNCTIONALITY:
 * 1. Identify which section it belongs to
 * 2. Add JSDoc documentation with @category tag
 * 3. Update table of contents if adding new section
 * 4. Consider if logic should be extracted to utility
 * 
 * WHEN REFACTORING:
 * 1. Maintain section organization
 * 2. Update documentation
 * 3. Run full test suite
 * 4. Check for circular dependencies
 * 
 * ============================================================================
 * @see ./ARCHITECTURE.md - Detailed design documentation
 * @see ./pst.js - Partially Signed Transaction implementation
 * @see ./network.js - Coordination server communication
 * ============================================================================
 */

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/**
 * @typedef {('ecdsa' | 'schnorr')} SignatureAlgorithm
 */

/**
 * @typedef {Object} MultisigWalletSigner
 * @property {string} xpub - The extended public key of the signer
 * @property {string} name - The name of the signer
 * @property {string} [publicKey] - The public key derived from the xpub
 * @property {string} [authPublicKey] - The public key derived from the signer's xpub at the relative path defined in SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH, used for signing authentication messages with ECIES to wallet connect peers
 */

/**
 * @typedef {Object} MultisigWalletWcPeer
 * @property {string} publicKey - The hexadecimal public key of the peer.
 * @property {Object} metadata - Information describing the WalletConnect peer/client.
 * @property {string} metadata.name - The display name of the peer.
 * @property {string} metadata.description - A brief description of the peer.
 * @property {string} metadata.url - Website or endpoint associated with the peer.
 * @property {string[]} metadata.icons - Array of icon URLs representing the peer.
 * @property {number} addressIndex - The address index last associated with the peer.
 */


/**
* @typedef {Object} MultisigWalletNetworkData
* @property {number} [lastIssuedDepositAddressIndex=0] - The last generated external address index, shown to the user to receive coins, or derived and stored locally
* @property {number} [lastUsedDepositAddressIndex]  - The last used address, received funds or was used in a transaction input (spent), on chain
* @property {number} [lastUsedChangeAddressIndex]  - The last used change address on-chain.
*/

/**
 * @typedef {Object} MultisigWalletConfig
 * @property {number} m - The required number of signatures
 * @property {MultisigWalletSigner[]} signers - The allowed signers
 * @property {number|string} [id] - The unique identifier of the wallet. If value is string it's the locking bytecode of the first address (address 0). If number it's the synced wallet id
 * @property {number} [n] - The total number of signers
 * @property {{[Network]: MultisigWalletNetworkData }} [networks] - Network specific state
 * @property {MultisigWalletWcPeer} [wcPeers] - The wallet connect peers associated with particular address index of the MultisigWallet.
 * /

/**
 * @typedef {Object} MultisigWalletOptions
 * @property {NetworkProvider} provider
 * @property {CoordinationServer} [coordinationServer]
 * @property {Network} [network='mainnet']
 * @property {Object} [store] - Optional Vuex-style store.
 * @property {(type: string, payload?: any) => Promise<any>} [store.dispatch]
 * @property {(type: string, payload?: any) => void} [store.commit]
 * @property {Object.<string, any>} [store.state]
 * @property {Object.<string, any>} [store.getters]
 * @property {(param: { xpub: string }) => Promise<string>} [resolveXprvOfXpub] - Function that resolves to xprv given an xpub
 * @property {(param: { xpub: string }) => Promise<string>} [resolveMnemonicOfXpub] - Function that resolves to wallet's mnemonic given an xpub
 * 
 */
 
/**
 * @typedef {Object} TemplateCreatorParams
 * @property {number} m - The required number of signatures
 * @property {{Omit<MultisigWalletSigner, 'publicKey'> & { publicKey: string }}[]} signers - The signers with public keys derived from xpubs
 * @property {string} [$schema] - The schema URL for the template
 * @property {string} [name] - The name of the wallet
 * @property {SignatureAlgorithm} [signatureFormat='schnorr'] - The format of the signatures
 * @property {string[]} [supported] - The supported VMs 
 */

/**
 * Fetches utxos of given address
 * @callback GetAddressUtxos
 * @param {string} address
 * @returns {Promise<CommonUtxo[]>}
 */

/**
 * Fetches balance of the given address
 * @callback GetAddressBalance
 * @param {string} address
 * @returns {Promise<number>}
 */

/**
 * Fetches utxos of given wallet configuration
 * @callback GetWalletBalance
 * @param {MultisigWallet} wallet
 * @returns {Promise<number>}
 */


/**
 * Fetches utxos of given wallet configuration
 * @callback GetWalletHashUtxos
 * @param {MultisigWallet} wallet
 * @returns {Promise<CommonUtxo[]>}
 */

/**
 * Fetches utxos of given wallet configuration
 * @callback GetWalletHashBalance
 * @param {MultisigWallet} wallet
 * @returns {Promise<number>}
 */

// ============================================================================
// SECTION 2: IMPORTS & CONSTANTS
// ============================================================================

import {
  importWalletTemplate,
  lockingBytecodeToCashAddress,
  walletTemplateToCompilerBch,
  decodeHdPublicKey,
  decodeHdPrivateKey,
  deriveHdPathRelative,
  utf8ToBin,
  base64ToBin,
  binToUtf8,
  CashAddressNetworkPrefix,
  binToHex,
  hexToBin,
  sha256,
  cashAddressToLockingBytecode,
  compileScript,
  base58AddressToLockingBytecode,
  secp256k1,
  deriveHdPublicNode,
  deriveSeedFromBip39Mnemonic,
  deriveHdPrivateNodeFromSeed,
  hash160,
  bigIntToVmNumber,
  SigningSerializationTypeBch,
  readBytes,
  binsAreEqual,
} from 'bitauth-libauth-v3'
import Big from 'big.js'
import { createTemplate } from './template.js'
import { commonUtxoToLibauthInput, commonUtxoToLibauthOutput, selectUtxos, watchtowerWalletHashUtxoToCommonUtxo } from './utxo.js'
import { estimateFee, getMofNDustThreshold, recipientsToLibauthTransactionOutputs } from './transaction-builder.js'
import { Pst } from './pst.js'
import { PsbtWallet, WALLET_MAGIC } from './psbt-wallet.js'
import { retryWithBackoff } from './utils.js'
import { encryptECIES, generateAES256GCMKey } from './encryption.js'
import { BsmsDescriptor, BsmsKeyRecord } from './bsms.js'
import { generateCoordinationServerCosignerCredentialsFromMnemonic, generateCoordinationServerCredentialsFromMnemonic, generateCoordinatorServerIdentityFromMnemonic } from './coordination.js'
import { deriveHdKeysFromMnemonic } from './utils.js'

export const SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH = '999/0'

// ============================================================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================================================

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

export const generateFilename = multisigWallet => {
  if (multisigWallet.name) {
    return `${multisigWallet.name}.pmwif`
  }
  return `${multisigWallet.m}-of-${multisigWallet.signers.length}-multisig-wallet.pmwif`
}


export const sortPublicKeysBip67 = (publicKeys) => {
  return publicKeys.sort((publicKeyA, publicKeyB) => {
    return binToHex(publicKeyA).localeCompare(binToHex(publicKeyB))
  })
}

/** 
* @param {string} xpub
* @param {string} relativeDerivationPath Example: '0/1' 
* @returns {Uint8Array} The public key at the provided Bip32 relative derivation path. 
*/
export const derivePublicKey = (xpub, relativeDerivationPath) => {
  const decodedHdPublicKey = decodeHdPublicKey(xpub, relativeDerivationPath)
  const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, relativeDerivationPath)
  return publicKey
}

export const derivePrivateKey = (xprv, relativeDerivationPath) => {
  const decodedHdPrivateKey = decodeHdPrivateKey(xprv, relativeDerivationPath)
  const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, relativeDerivationPath)
  return privateKey
}

/**
 * @param {Object} params
 * @param {MultisigWalletSigner[]} params.signers
 * @param {string} [params.addressDerivationPath='0/0']
 * @returns {MultisigWalletSigner[]} The multisig wallet signers with publicKey at `addressDerivationPath` set
 */
export const derivePublicKeys = ({ signers, addressDerivationPath, bip67Sort = true }) => {
  const _signers = structuredClone(signers)
  const signersWithPublicKeys = _signers.map(signer => {
    signer.publicKey = binToHex(derivePublicKey(signer.xpub, addressDerivationPath))
    signer.addressDerivationPath = addressDerivationPath
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
  return {
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
 * @param {Object} wallet 
 * @param {number} m 
 * @param {Array<{ publicKey: string, name?: string }>} signers Signers with public keys 
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

  const template = createTemplate({ m, signers: sortedPublicKeys.map((p) => ({ publicKey: p })) }) // Create template for public key set
  const compiler = getCompiler({ template })
  const script = compileScript('lock', lockingData, compiler.configuration)
  // const lockingScript = script.bytecode
  return script.reduce.bytecode
}

/**
 * @returns 1st 4 bytes of the hash160 of the master public key
 */
export const getMasterFingerprint = (mnemonic) => {
  return hash160(
    deriveHdPublicNode(
      deriveHdPrivateNodeFromSeed(
        deriveSeedFromBip39Mnemonic(mnemonic)
      )).publicKey
    ).slice(0, 4)
}

/**
 * @returns {Uint8Array} 1st 4 bytes of the hash160 of the master public key in UintLE 
 */
export const getMasterFingerprintUintLE = (mnemonic) => {
  return bigIntToVmNumber(
    BigInt(
        parseInt(
          binToHex(getMasterFingerprint(mnemonic)), 
          16
        )
      )
  )
}

// ============================================================================
// SECTION 4: PRICE ORACLE CLASS
// ============================================================================

export class PriceOracle {
  /**
   * @param {string} asset - 'bch' or token id (token id not yet implemented, need cauldron)
   * @param {string[]} currencySymbols - Example: ['php','usd']
   */
  static async fetchPrice(asset, currencySymbols) {
    const url = `https://watchtower.cash/api/market-prices/?coin_ids=${asset}&currencies=${currencySymbols.join(',')}`
    return await fetch(url)
  }
}

const ADDRESS_SCAN_BUFFER = 20

// TODO: Refactor split into smaller, focused modules:
// - `wallet-manager.js` - Wallet CRUD operations
// - `wallet-address.js` - Address derivation
// - `wallet-utxo.js` - UTXO management
// - `wallet-transaction.js` - Transaction creation

// ============================================================================
// SECTION 5: MULTISIG WALLET CLASS
// ============================================================================

export class MultisigWallet {
  /**
   * Creates a new MultisigWallet instance.
   * @param {MultisigWalletConfig} config - Wallet configuration options.
   * @param {MultisigWalletOptions} options - Wallet options.
   */
  // ----- 5.1 Constructor & Configuration -----
  constructor (config, options) {
    this.id = config?.id
    this.name = config?.name
    this.m = config?.m
    this.signers = config?.signers
    this.networks = config?.networks || {
      mainnet: {},
      chipnet: {}
    }
    this.settings = config.settings || {}

    if (config?.enabled) {
      this.enabled = config.enabled
    }
    
    this.options = options || {}
      
  }

  setStore(store) {
    this.options.store = store
  }

  setProvider(provider) {
    this.options.provider = provider
  }

  set utxos(utxos) {
    this._utxos = utxos
  }

  get utxos() {
    return this._utxos
  }

  get n() {
    return this.signers?.length
  }

  get cashAddressNetworkPrefix() {
    if (this.options?.provider?.network === 'chipnet' || this.options?.provider?.network === 'testnet') {
      return CashAddressNetworkPrefix.testnet 
    }
    return CashAddressNetworkPrefix.mainnet
  }

  get walletHash() {
    if (!this._walletHash) {
      this._walletHash = getWalletHash(this)
    }
    return this._walletHash
  }

  getSigners() {
    return [...this.signers].sort((a, b) => (a.xpub || '').localeCompare(b.xpub || ''))
  }

  getLastIssuedDepositAddressIndex(network) {
    return this.networks?.[network]?.lastIssuedDepositAddressIndex ?? -1
  }

  getLastUsedDepositAddressIndex(network) {
    return this.networks?.[network]?.lastUsedDepositAddressIndex ?? -1
  }

  getLastUsedChangeAddressIndex(network) {
    return this.networks?.[network]?.lastUsedChangeAddressIndex ?? -1
  }

  // ----- 5.3 Address Methods -----
  
  /**
   * Returns a deposit address from the wallet.
   *
   * If an `addressIndex` is provided, it returns the address derived at that specific index
   * If no index is provided, it returns the next unissued address (without altering internal state).
   *
   * @param {import('@bitauth/libauth').CashAddressNetworkPrefix} [prefix=import('@bitauth-libauth').CashAddressNetworkPrefix.mainnet] 
   * @param {number} [addressIndex] - Optional index of the address to derive. If omitted, the next unissued address is returned.
   
  * @returns {{ addressIndex: number, address: string }} The index and derived address. The derived deposit address at the given index, or the next unissued address if no index is given.
  *
  * @example
  * wallet.getDepositAddress();       // Returns next unissued address (e.g., m/44'/145'/0'/0/5)
  * wallet.getDepositAddress(0);      // Returns address at index 0 (e.g., m/44'/145'/0'/0/0)
  */
  getDepositAddress(addressIndex, prefix) {
    let _addressIndex = addressIndex

    if (_addressIndex === undefined || _addressIndex < 0) {
      if (this.networks[this.options.provider.network].lastIssuedDepositAddressIndex === undefined) {
        _addressIndex = 0
      } else {
        _addressIndex = this.networks[this.options.provider.network].lastIssuedDepositAddressIndex + 1
      }
    }

    const address = getDepositAddress({ multisigWallet: this, addressIndex: _addressIndex, prefix: prefix || this.cashAddressNetworkPrefix || CashAddressNetworkPrefix.mainnet })
    return {
      addressIndex: _addressIndex,
      address
    }
  }

  /**
   * Gets a change address from the wallet.
   *
   * If an `addressIndex` is provided, returns the change address at that index (without altering internal state).
   * If no index is provided, returns the next unissued change address.
   *
   * @param {number} [addressIndex] - Optional index of the change address to derive.
   * @returns {{ addressIndex: number, address: string }} The index and derived change address.
   *
   * @example
   * wallet.getChangeAddress();        // Returns next unissued change address (e.g., m/44'/145'/0'/1/5)
   * wallet.getChangeAddress(0);      // Returns change address at index 0 (e.g., m/44'/145'/0'/1/0)
   */
  getChangeAddress(addressIndex, prefix) {

      let _addressIndex = addressIndex

      if (_addressIndex === undefined || _addressIndex < 0) {
        if (this.networks[this.options.provider.network].lastUsedChangeAddressIndex === undefined) {
          _addressIndex = 0
        } else {
          _addressIndex = this.networks[this.options.provider.network].lastUsedChangeAddressIndex + 1
        }
      }

    const address = getChangeAddress({ multisigWallet: this, addressIndex: _addressIndex, prefix: prefix || this.cashAddressNetworkPrefix || CashAddressNetworkPrefix.testnet })
    return {
        addressIndex: _addressIndex,
        address
    }
  }

  getWalletHash() {
    return getWalletHash(this)
  }

  /**
   * @param {string} address - The cashaddress
   * @param {string} addressPath - The bip32 relative derivation path. 
   * Example: 0/0 for deposit address at index 0, 1/0 for change address at address 0
   */
  // ----- 5.4 UTXO Management -----
  async getAddressUtxos(address, addressPath) {
    return await this.options?.provider?.getAddressUtxos(address, addressPath)
  }

  async updateAddressIndicesFromUtxos(utxos) {
    const highestUsedDepositAddressIndex = utxos.reduce((highest, u) => {
      if (u.addressPath?.startsWith('0/')) {
        const index = Number(u.addressPath.split('/')[1])
        if (index > highest) return index
      }
      return highest
    }, -1)

    const highestUsedChangeAddressIndex = utxos.reduce((highest, u) => {
      if (u.addressPath?.startsWith('1/')) {
        const index = Number(u.addressPath.split('/')[1])
        if (index > highest) return index
      }
      return highest
    }, -1)

    if (highestUsedDepositAddressIndex >= (this.networks[this.options.provider.network].lastUsedDepositAddressIndex || -1)) {
      this.networks[this.options.provider.network].lastUsedDepositAddressIndex = highestUsedDepositAddressIndex
      this.options?.store?.commit?.('multisig/updateWalletLastUsedDepositAddressIndex', { wallet: this, lastUsedDepositAddressIndex: highestUsedDepositAddressIndex, network: this.options.provider.network })
    }

    if (highestUsedChangeAddressIndex >= (this.networks[this.options.provider.network].lastUsedChangeAddressIndex || -1)) {
      this.networks[this.options.provider.network].lastUsedChangeAddressIndex = highestUsedChangeAddressIndex      
      this.options?.store?.commit?.('multisig/updateWalletLastUsedChangeAddressIndex', { wallet: this, lastUsedChangeAddressIndex: highestUsedChangeAddressIndex, network: this.options.provider.network }) 
    }

    if (highestUsedDepositAddressIndex >= (this.networks[this.options.provider.network].lastIssuedDepositAddressIndex || -1)) {
      this.networks[this.options.provider.network].lastIssuedDepositAddressIndex = highestUsedDepositAddressIndex
      this.options?.store?.commit?.('multisig/updateWalletLastIssuedDepositAddressIndex', { wallet: this, lastIssuedDepositAddressIndex: highestUsedDepositAddressIndex, network: this.options.provider.network})  
    }
  }

  async getWalletHashUtxos(includeNfts) {

    if (!this.options?.provider) throw new Error('Missing provider') 

    const r1 = this.options?.provider?.getWalletHashUtxos(this.getWalletHash())
    const r2 = this.options?.provider?.getWalletHashUtxos(this.getWalletHash(), 'cashtoken', 'ft')
    let requests = [r1, r2]
    if (includeNfts) {
      const r3 = this.options?.provider?.getWalletHashUtxos(this.getWalletHash(), 'cashtoken', 'nft')
      requests.push(r3)
    }
    const responses = await Promise.allSettled(requests)
    let utxos = []
    const errors = []

    for (const r of responses) {
      if (r.status === 'fulfilled') {
        utxos = utxos.concat(r?.value?.data?.utxos ?? [])
      } else {
        errors.push(r.reason)
        console.error('Failed to fetch UTXOs:', r.reason)
      }
    }

    if (errors.length > 0 && utxos.length === 0) {
      // Silently fail and return empty array if all requests failed,
      // Function is re-invokable no need to break the app if the request fails.
      console.log('Failed to fetch any UTXOs')
      return []
    }

    const seen = new Set()
    utxos = utxos.filter(u => {
      const key = `${u.txid}:${u.vout}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    utxos = utxos?.map(u => {
        return {
          ...u,
          ...watchtowerWalletHashUtxoToCommonUtxo(u)
        }
      })

    utxos?.forEach((u) => {
      const addressPaths = u.address_path?.split('/') 
      if (addressPaths.length === 2 && addressPaths.every(p => /^\d+$/.test(p))) {
        u.addressPath = u.address_path
        const [ addressType, addressIndex ] = addressPaths.map(p => Number(p)) 
        if (addressType === 0) {
          u.address = this.getDepositAddress(addressIndex, this.cashAddressNetworkPrefix).address
        }
        if (addressType === 1) {
          u.address = this.getChangeAddress(addressIndex, this.cashAddressNetworkPrefix).address
        }
      }
    })
      
    this.updateAddressIndicesFromUtxos(utxos)
    this._utxos = utxos
    return this._utxos
  }

  async getAddressBalance(address) {
    return await this.options?.provider?.getAddressBalance(address)
  }

  /**
   * @param {'bch'|string} [asset='bch'] - If not present assumed as 'bch', asset is a token category
   * @param {number} [decimals=0] - The asset decimals, defaults to 0 if asset is present and is not 'bch'
   */
  async getWalletBalance(asset, decimals) {
    const utxos = (await this.getWalletHashUtxos())
    if (!asset || asset === 'bch') {
      const balance = utxos.filter(u=> !u.token).reduce((b, u) => b += u.satoshis, 0)
      return balance / 1e8
    }
    const balance = utxos.filter(u=> u.token && u.token.category === asset).reduce((b, u) => b += u.token.amount, 0)
    return balance / `1e${decimals || 0}`
  }

  /**
   * @param {'bch'|string} [asset='bch']
   * @param {number} balance - Should be a decimal value. Example: 1.2 (BCH)
   * @param {string[]} [currencySymbols] - The currency symbols, Example: 'php','usd'
   */
  async convertBalanceToCurrencies(asset, balance, currencySymbols) {
    const response = await PriceOracle.fetchPrice(asset, currencySymbols)
    if (response?.ok) {
      const priceData = await response.json()
      return priceData?.map((price) => {
        const p = Big(balance).mul(price.price_value).toString()
        price[`assetPriceIn${price.currency}Text`] = `${p} ${price.currency}`
        price['assetPrice'] = p
        return price
      })
    }
    return []
  }

  async getWalletBalances() {
    const assetsBalances = {}
    const utxos = await this.getWalletHashUtxos() 
    
    utxos.forEach((u) => {
      if (!u.token) {
        if (!assetsBalances['bch']) {
          assetsBalances['bch'] = Number(u.satoshis)
          return
        }
        assetsBalances['bch'] += Number(u.satoshis)
        return
      }
      if(!assetsBalances[u.token.category]) {
        assetsBalances[u.token.category] = BigInt(u.token.amount)
        return
      }
      assetsBalances[u.token.category] += BigInt(u.token.amount)
      
    })
    return assetsBalances
  }

  async getWalletHashBalance() {
    return await this.options?.provider?.getWalletHashBalance(this.getWalletHash())
  }

  async getWalletTokenBalance(tokenCategory, decimals = 0) {
    const balance = 
      (await this.getWalletHashUtxos() || [])
        .filter((u)=>{
          return u.token.category === tokenCategory
        })
        .reduce((b, u) => b += u.satoshis, 0)
    return balance / `1e${decimals || 0}`
  }

  async subscribeWalletAddress(address) {
    return retryWithBackoff(async () => {
      return await this.options?.store?.dispatch(
        'multisig/subscribeWalletAddress',
        address
      )},
      2,
      1000
    ).catch((e) => e)
  }

  async subscribeWalletAddressIndex(addressIndex, type) {
    const receiveAddress = this.getDepositAddress(addressIndex, this.cashAddressNetworkPrefix).address
    const changeAddress = this.getChangeAddress(addressIndex, this.cashAddressNetworkPrefix).address
    const addresses = {
      receiving: receiveAddress,
      change: changeAddress
    }
    return retryWithBackoff(async () => {
      return await this.options?.provider?.subscribeWalletAddressIndex(
        { walletHash: this.walletHash, addresses, addressIndex: addressIndex, type: type }
      )},
      2,
      1000
    ).catch((e) => e)
  }

  async getWalletTransactionHistory({walletHash, type, all, tokenCategory, page }) {
    return await this.options?.provider?.getWalletTransactionHistory({walletHash, type, all, tokenCategory, page })
  }

  /**
   * Marks the address at addressIndex as issued.
   * 
   * @param {number} addressIndex - Index of the address to mark as issued.
   */
  async issueDepositAddress(addressIndex) {
      
      
    if (!this.options?.store?.dispatch) return

    this.options?.store?.commit(
      'multisig/updateWalletLastIssuedDepositAddressIndex', 
      { wallet: this, lastIssuedDepositAddressIndex: addressIndex, network: this.options.provider.network }
    ) 
    await this.subscribeWalletAddressIndex(addressIndex, 'deposit')
    

  }

  /**
   * Marks the address at addressIndex as issued.
   * 
   * @param {number} addressIndex - Index of the address to mark as issued.
   */
  async issueChangeAddress(addressIndex) {

      if (!this.options?.store?.commit) return

      this.options?.store?.commit(
        'multisig/updateWalletLastUsedChangeAddressIndex', 
        { wallet: this, lastUsedChangeAddressIndex: addressIndex, network: this.options.provider.network }
      ) 
      await this.subscribeWalletAddressIndex(addressIndex, 'change')
  }

  async selectUtxos(proposal, source) {

    if (!proposal?.recipients?.every(r=> r.asset === proposal.recipients[0].asset)) {
      throw new Error('Sending mixed assets is not yet supported!')
    }

    let utxos = source 

    if (!utxos) {
      utxos = await this.getWalletHashUtxos()
    }

    let targetBch = 
      proposal.recipients
        ?.filter(r => r.asset === 'bch')
        .reduce((total, nextR) => {
          total = Big(total).add(nextR.amount || 0)
          return total}, '0'
        )
    
    let targetSatoshis = Big(targetBch).mul(1e8)

    /**
     * @type {{Object.<string, bigint>}} - Key is the asset which is the token category
     */
    let targetTokens = {}
    // Get target token amount of each asset(token category), convert decimal amount to vm number
    for (const r of proposal.recipients) {
      if (r.asset === 'bch') continue
      let tokenAmountInVmNumber = BigInt(Big(r.amount).mul(`1e${r.decimals || 0}`).toString())
      if (!targetTokens[r.asset]) {
        targetTokens[r.asset] = tokenAmountInVmNumber
        continue
      }
      targetTokens[r.asset] = BigInt(Big(targetTokens[r.asset]).add(tokenAmountInVmNumber))
    }

    
    let satoshiUtxos = null
    if (Number(targetSatoshis) > 0) {
      // trying to send bch
      satoshiUtxos = selectUtxos(utxos?.filter(u => !u.token), { targetSatoshis })
      if (!satoshiUtxos.satoshisSatisfied) {
        throw new Error('Insufficient BCH balance!')
      }
    }

    let tokenUtxos = null
    if (Object.keys(targetTokens).length > 0) {
      // trying to send tokens
      tokenUtxos = selectUtxos(utxos?.filter(u => Boolean(u.token)), { targetTokens })
      if (!tokenUtxos.tokensSatisfied) {
        throw new Error('Insufficient token balance!')
      }
    }

    let selectedUtxos = []

    if (satoshiUtxos) {
      selectedUtxos = selectedUtxos.concat(satoshiUtxos.selectedUtxos)
    }

    if (tokenUtxos) {
      selectedUtxos = selectedUtxos.concat(tokenUtxos.selectedUtxos)
    }

    let inputs = selectedUtxos?.map((u) => {
      return {
        ...commonUtxoToLibauthInput(u, []),
        sourceOutput: commonUtxoToLibauthOutput(u, cashAddressToLockingBytecode(u.address).bytecode),
      }
    })

    let outputs = recipientsToLibauthTransactionOutputs(proposal.recipients, this.m, this.n)

    const lastUsedChangeAddressIndex = this.getLastUsedChangeAddressIndex(this.options.provider.network)
    const changeAddressIndex = lastUsedChangeAddressIndex === undefined ? 0 : lastUsedChangeAddressIndex + 1
    const changeAddress = this.getChangeAddress(changeAddressIndex, this.cashAddressNetworkPrefix)


    const satoshisChangeOutput = {
      lockingBytecode: cashAddressToLockingBytecode(changeAddress.address).bytecode,
      valueSatoshis: 0n
    }

    const satoshisChangeOutputDustThreshold = 
      getMofNDustThreshold(
        this.m, this.n, 
        satoshisChangeOutput
      )

    const estimatedFee = estimateFee(structuredClone(inputs), structuredClone(outputs), createTemplate(this))
    
    let totalSatoshisInputsAmount = 
      inputs
        .reduce((target, nextInput) => target += nextInput.sourceOutput.valueSatoshis, 0n)

    const totalSatoshiOutputsAmount = 
      outputs
        .reduce((target, nextOutput) => target += nextOutput?.valueSatoshis, 0n)

    let totalSatoshisChangeAmount = totalSatoshisInputsAmount - totalSatoshiOutputsAmount

    let funderUtxos = null

    if (totalSatoshisChangeAmount < estimatedFee) {

      const selectedTxids = new Set(selectedUtxos.map(u => `${u.txid}:${u.vout}`))
        funderUtxos = selectUtxos(utxos?.filter(u => !u.token && !selectedTxids.has(`${u.txid}:${u.vout}`)), { targetSatoshis: estimatedFee + satoshisChangeOutputDustThreshold })

      if (!funderUtxos.satoshisSatisfied) {
        throw new Error('Insufficient BCH balance for fee!')
      }

      selectedUtxos = 
        selectedUtxos.concat(
            funderUtxos.selectedUtxos
        )
    }

    return selectedUtxos
  }

  async selectNftUtxos(proposal, source) {

    if (!proposal?.recipients?.every(r=> r.asset === proposal.recipients[0].asset)) {
      throw new Error('Sending mixed assets is not yet supported!')
    }

    let utxos = source 
    
    if (!utxos) {
      utxos = await this.getWalletHashUtxos()
    }
    
    /**
     * @type {{Object.<string, Token>}} - Key is the asset which is the token category
     */
    let targetNfts = {}
    let targetTokens = {}
    // Get target token amount of each asset(token category), convert decimal amount to vm number
    for (const r of proposal.recipients) {
      if (r.asset === 'bch') continue
      if (r.targetNftUtxo) {
        targetNfts[r.asset] = r.targetNftUtxo
        continue
      }
      let tokenAmountInVmNumber = BigInt(Big(r.amount).mul(`1e${r.decimals || 0}`).toString())
      if (!targetTokens[r.asset]) {
        targetTokens[r.asset] = tokenAmountInVmNumber
        continue
      }
      targetTokens[r.asset] = BigInt(Big(targetTokens[r.asset]).add(tokenAmountInVmNumber))
    }
    
    let selectedUtxos = []
    for (const category of Object.keys(targetNfts || {})) {
      const nftUtxo = utxos.find(u => {
        return (
          u.vout === targetNfts[category].vout &&
          u.txid === targetNfts[category].txid
        )
      })
      if (!nftUtxo) continue

      selectedUtxos.push(nftUtxo)
    }

    const selectedTxids = new Set(selectedUtxos.map(u => `${u.txid}:${u.vout}`))
    let funderUtxos = utxos.filter(u => !u.token && !selectedTxids.has(`${u.txid}:${u.vout}`))
    let inputs = selectedUtxos?.map((u) => {
      return {
        ...commonUtxoToLibauthInput(u, []),
        sourceOutput: commonUtxoToLibauthOutput(u, cashAddressToLockingBytecode(u.address).bytecode),
      }
    })
    
    let outputs = recipientsToLibauthTransactionOutputs(proposal.recipients, this.m, this.n)

    const lastUsedChangeAddressIndex = this.getLastUsedChangeAddressIndex(this.options.provider.network)
    const changeAddressIndex = lastUsedChangeAddressIndex === undefined ? 0 : lastUsedChangeAddressIndex + 1
    const changeAddress = this.getChangeAddress(changeAddressIndex, this.cashAddressNetworkPrefix)

    const satoshisChangeOutput = {
      lockingBytecode: cashAddressToLockingBytecode(changeAddress.address).bytecode,
      valueSatoshis: 0n
    }

    const satoshisChangeOutputDustThreshold = 
      getMofNDustThreshold(
        this.m, this.n, 
        satoshisChangeOutput
      )

    const estimatedFee = estimateFee(structuredClone(inputs), structuredClone(outputs), createTemplate(this))
    
    let totalSatoshisInputsAmount = 
      inputs
        .reduce((target, nextInput) => target += nextInput.sourceOutput.valueSatoshis, 0n)

    const totalSatoshiOutputsAmount = 
      outputs
        .reduce((target, nextOutput) => target += nextOutput?.valueSatoshis, 0n)

    let totalSatoshisChangeAmount = totalSatoshisInputsAmount - totalSatoshiOutputsAmount

    if (totalSatoshisChangeAmount < estimatedFee) {

      funderUtxos = selectUtxos(funderUtxos,  { targetSatoshis: estimatedFee + satoshisChangeOutputDustThreshold })
      if (!funderUtxos.satoshisSatisfied) {
        throw new Error('Insufficient BCH balance for fee!')
      }
      
      selectedUtxos = 
        selectedUtxos.concat(
            funderUtxos.selectedUtxos
        )
    }
    return selectedUtxos
  }
  
  // ----- 5.8 Transaction Creation -----
  async createProposal(proposal, transactionType = 'send-fungible-assets') {

    if (!proposal?.recipients?.every(r=> r.asset === proposal.recipients[0].asset)) {
      throw new Error('Sending mixed assets is not yet supported!')
    }

    let utxos = []
    let selectedUtxos = []
    if (transactionType === 'send-non-fungible-assets') {
      utxos = await this.getWalletHashUtxos(true)
      if (proposal.reserveWcAccountUtxos) {
        utxos = utxos.filter(u => u.addressPath !== '0/0' && u.address_path !== '0/0')
      }

      selectedUtxos = await this.selectNftUtxos(proposal, utxos)
    } else {
      utxos = await this.getWalletHashUtxos()
      if (proposal.reserveWcAccountUtxos) {
        utxos = utxos.filter(u => u.addressPath !== '0/0' && u.address_path !== '0/0')
      }
      
      selectedUtxos = await this.selectUtxos(proposal, utxos.filter(u => !u.token?.nft))
    }

    let inputs = selectedUtxos?.map((u) => {
        const signersWithPublicKeys = derivePublicKeys({ signers: this.signers, addressDerivationPath: u.addressPath })
        const bip32Derivation = Object.assign({}, ...signersWithPublicKeys.map((s) => {
          const fullDerivationPath = (this.derivationPath || `m/44'/145'/0'/`) + u.addressPath
          return {
            [s.publicKey]: {
              path: fullDerivationPath,
              masterFingerprint: s.masterFingerprint
            }
          }
        }))
      
      return {
        ...commonUtxoToLibauthInput(u, []),
        sourceOutput: commonUtxoToLibauthOutput(u, cashAddressToLockingBytecode(u.address).bytecode),
        sigHash: SigningSerializationTypeBch.allOutputs,
        bip32Derivation,
        redeemScript: generateRedeemScript(this.m, signersWithPublicKeys.map(s => hexToBin(s.publicKey)))
      }
    })

    let outputs = recipientsToLibauthTransactionOutputs(proposal.recipients, this.m, this.n)
    const lastUsedChangeAddressIndex = this.getLastUsedChangeAddressIndex(this.options.provider.network)
    const changeAddressIndex = lastUsedChangeAddressIndex === undefined ? 0 : lastUsedChangeAddressIndex + 1
    const changeAddress = this.getChangeAddress(changeAddressIndex, this.cashAddressNetworkPrefix)
    const changeAddressPublicKeySet = derivePublicKeys({ 
      signers: this.signers, 
      addressDerivationPath: `1/${changeAddressIndex}` 
    })
    const changeAddressRedeemScript = generateRedeemScript(this.m, changeAddressPublicKeySet.map(s=> hexToBin(s.publicKey)))
    const changeAddressBip32Derivation = changeAddressPublicKeySet.reduce((acc, nextSigner) => {
      acc[nextSigner.publicKey] = {
        path: (this.derivationPath || `m/44'/145'/0'/`) +  `1/${changeAddressIndex}`,
        masterFingerprint: nextSigner.masterFingerprint
      }
      return acc
    }, {})


    const satoshisChangeOutput = {
      lockingBytecode: cashAddressToLockingBytecode(changeAddress.address).bytecode,
      valueSatoshis: 0n
    }

    const satoshisChangeOutputDustThreshold = 
      getMofNDustThreshold(
        this.m, this.n, 
        satoshisChangeOutput
      )

    let tokenChangeOutput = null

    if (selectedUtxos?.find(utxo => Boolean(utxo.token))) {

      const tokenInputsTotalTokensValue = 
        inputs
          .filter(i=> Boolean(i.sourceOutput.token))
          .reduce((target, nextInput) => target += nextInput.sourceOutput.token.amount, 0n)

      const tokenOutputsTotalTokensValue = 
        outputs
          .filter(o=> Boolean(o.token))
          .reduce((target, nextInput) => target += nextInput.token.amount, 0n)
      
      let tokensChangeAmount = tokenInputsTotalTokensValue - tokenOutputsTotalTokensValue

      if (tokensChangeAmount > 0) {  
        tokenChangeOutput =  {
          lockingBytecode: cashAddressToLockingBytecode(changeAddress.address).bytecode,
          valueSatoshis: 0n, //temporary
          token: {
            ...outputs[0].token,
            amount: tokensChangeAmount,
          }
        }

        let requiredSatoshisForTokenChange = getMofNDustThreshold(this.m, this.n, tokenChangeOutput)

        tokenChangeOutput.valueSatoshis = requiredSatoshisForTokenChange
        outputs.push({ 
          ...tokenChangeOutput,
          bip32Derivation: changeAddressBip32Derivation,
          redeemScript: changeAddressRedeemScript,
          purpose: 'token-self-internal' 
        })
        await this.issueChangeAddress(changeAddressIndex)
      } 
    }

    const estimatedFee = estimateFee(structuredClone(inputs), structuredClone(outputs), createTemplate(this))

    let totalSatoshisInputsAmount = 
      inputs
        .reduce((target, nextInput) => target += nextInput.sourceOutput.valueSatoshis, 0n)

    const totalSatoshiOutputsAmount = 
      outputs
        .reduce((target, nextOutput) => target += nextOutput?.valueSatoshis, 0n)

    
    let totalSatoshisChangeAmount = totalSatoshisInputsAmount - (totalSatoshiOutputsAmount + estimatedFee)

    satoshisChangeOutput.valueSatoshis = totalSatoshisChangeAmount
    if (satoshisChangeOutput.valueSatoshis > satoshisChangeOutputDustThreshold) {
      outputs.push({
        ...satoshisChangeOutput,
        bip32Derivation: changeAddressBip32Derivation,
        redeemScript: changeAddressRedeemScript,
        purpose: 'sats-self-internal'
      })
      await this.issueChangeAddress(changeAddressIndex)
    }
    
    const pst = new Pst()
    pst
      .setOrigin(proposal.origin)
      .setCreator(proposal.creator)
      .setPurpose(proposal.purpose)
      .addInputs(inputs)
      .addOutputs(outputs)
      .setWallet(this)
      .setStore(this.options?.store)
      .setProvider(this.options?.provider)
      .setCoordinationServer(this.options?.coordinationServer)
    return pst
  }

  // ----- 5.9 WalletConnect Integration -----
  async wcCreateProposal(sessionRequest) {
    const proposal = new Pst()
    const inputs = sessionRequest.params.request.params.transaction.inputs?.map((input) => {
      const mappedInput = JSON.parse(JSON.stringify(input, Pst.exportSafeJSONReplacer), Pst.importSafeJSONReviver)
      if (input?.sourceOutput?.unlockingBytecode && input?.sourceOutput?.contract?.redeemScript) {
        mappedInput.redeemScript = input.sourceOutput.contract.redeemScript
        mappedInput.scriptSig = input.sourceOutput.unlockingBytecode
        return mappedInput
      }

      const wcExpectedLockingBytecode = cashAddressToLockingBytecode(this.getDepositAddress(0).address)
      if (
          mappedInput.sourceOutput.lockingBytecode && 
          binsAreEqual(mappedInput.sourceOutput.lockingBytecode, wcExpectedLockingBytecode.bytecode)
        ) {
        const signersWithPublicKeys = derivePublicKeys({ signers: this.signers, addressDerivationPath: '0/0' })
        const bip32Derivation = Object.assign({}, ...signersWithPublicKeys.map((s) => {
        const fullDerivationPath = (this.derivationPath || `m/44'/145'/0'/`) + '0/0'
            return {
              [s.publicKey]: {
                path: fullDerivationPath,
                masterFingerprint: s.masterFingerprint
              }
            }
          }))
        
        mappedInput.sigHash = SigningSerializationTypeBch.allOutputs
        mappedInput.bip32Derivation = bip32Derivation
        mappedInput.redeemScript = generateRedeemScript(this.m, signersWithPublicKeys.map(s => hexToBin(s.publicKey)))
      }
      return mappedInput
    })

    const outputs = sessionRequest.params.request.params.transaction.outputs.map(output => {
      const wcExpectedLockingBytecode = cashAddressToLockingBytecode(this.getDepositAddress(0).address)
      const mappedOutput = JSON.parse(JSON.stringify(output, Pst.exportSafeJSONReplacer), Pst.importSafeJSONReviver)
      if (mappedOutput.lockingBytecode && binsAreEqual(mappedOutput.lockingBytecode, wcExpectedLockingBytecode.bytecode)) {
        const signersWithPublicKeys = derivePublicKeys({ signers: this.signers, addressDerivationPath: '0/0' })
        const bip32Derivation = Object.assign({}, ...signersWithPublicKeys.map((s) => {
        const fullDerivationPath = (this.derivationPath || `m/44'/145'/0'/`) + '0/0'
            return {
              [s.publicKey]: {
                path: fullDerivationPath,
                masterFingerprint: s.masterFingerprint
              }
            }
          }))
        
        mappedOutput.purpose = 'self-external'
        mappedOutput.bip32Derivation = bip32Derivation
        mappedOutput.redeemScript = generateRedeemScript(this.m, signersWithPublicKeys.map(s => hexToBin(s.publicKey)))
      }
      return mappedOutput
    })

    proposal
      .setOrigin(sessionRequest.session.peer.metadata.url || "")
      .setPurpose(sessionRequest.params.request.params.userPrompt || "Not Specified")
      .addInputs(inputs)
      .addOutputs(outputs)
      .setLocktime(sessionRequest.params.request.params.transaction.locktime)
      .setTxVersion(sessionRequest.params.request.params.transaction.version)
      .setWallet(this)
      .setStore(this.options?.store)
      .setProvider(this.options?.provider)
      .setCoordinationServer(this.options?.coordinationServer)

    const cosignerAuthCredentials = await this.generateCosignerAuthCredentials()

    if (cosignerAuthCredentials && cosignerAuthCredentials["X-Auth-Cosigner-Auth-PubKey"]) {
      proposal.setCreator(cosignerAuthCredentials["X-Auth-Cosigner-Auth-PubKey"])
    }
    return proposal
  }

  async wcSaveSession(session) {
    const sanitizedSession = {
        wallet: this.id,
        topic: session.topic,
        accounts: session.namespaces?.bch?.accounts,
        peerName: session.peer?.metadata?.name || '',
        peerUrl: session.peer?.metadata?.url || '',
        originName: session.self?.metadata?.name || '',
        originUrl: session.self?.metadata?.url || '',
        expiry: session.expiry,
    }

    if (!this.wcSessions) {
      this.wcSessions = []
    }
    
    try {
      const authCosignerAuthCredentials = await this.generateCosignerAuthCredentials()
      const responseData = await this.options?.coordinationServer?.uploadWalletWcSession({
        walletIdentifier: this.id,
        payload: sanitizedSession,
        authCosignerAuthCredentials
      })
      if (responseData.id) {
        // To save space, only save topic if already saved online
        this.wcSessions.push({ topic: session.topic })
      }

    } catch (error) {
      if (!this.wcSessions.find(s => s.topic === session.topic)) {
        this.wcSessions.push(sanitizedSession)      
      } 
    } finally {
      this.save()
    }
  }

  async wcForgetSession(topic) {
    const i = this.wcSessions.findIndex(s => topic)
    if (i !== -1) {
      this.wcSessions.splice(i, 1)
    }
    this.updateWallet()
  }

  async wcForgetAllSessions() {
    this.wcSessions = null
    this.save()
  }

  wcGetDefaultAddress() {
    return this.getDepositAddress(0).address
  }

  async fetchProposals(status='pending') {
    if (!this.options?.coordinationServer) return 
    return await this.options.coordinationServer.getWalletProposals(this.generateBsmsDescriptorId(), status)
  }

  isOnline() {
    if(this.id && /^[0-9]+$/.test(this.id)) return true 
    return false
  }

  /**
   * @param {object} saveOptions
   * @param {boolean} saveOptions.sync - If true, wallet will be synced with watchtower
   */
  async save(saveOptions) {
    if (this.options?.store ) {
      if (this.options?.store?.commit) {
        this.options.store.commit('multisig/saveWallet', this.toJSON())
      }
      if (this.options?.store?.dispatch && saveOptions?.sync) {
        return await this.upload()
      }
    }
  }

  async create(saveOptions) {

    if (this.options?.store) {
      if (this.options?.store?.commit) {
        this.options.store.commit('multisig/saveWallet', this)
      }
      if (this.options?.store?.dispatch && saveOptions?.sync) {
        const onlineWallet = await this.options?.coordinationServer?.uploadWallet(this)
        if (onlineWallet?.id && /^[0-9]+$/.test(onlineWallet.id)) {
          Object.assign(this, onlineWallet)
          this.save()
        }
      }
    }
  }

  merge(otherWallet) {
    if (otherWallet.version < (this.version ?? 0)) return this
    if (this.isOnline() && otherWallet.id !== this.id) return this
    if (this.walletHash !== otherWallet.walletHash) return this
    if (!this.isOnline()) {
      this.id = otherWallet.id
    }
    this.name = otherWallet.walletName || otherWallet.name
    this.version = otherWallet.version
  }

  /**
   * @param {object} saveOptions
   */
  async upload(enablePrivacy = true) {

    if (!this.options?.resolveMnemonicOfXpub) return
    if (!this.options?.coordinationServer) return

    const wallet = structuredClone(this.toJSON())

    wallet.walletDescriptorId = this.generateBsmsDescriptorId()
    wallet.walletHash = this.getWalletHash()

    const symmetricKey = await generateAES256GCMKey(true)

    const encryptedWalletDescriptor = 
      await this.generateBsmsDescriptor().encrypt(
        binToHex(new Uint8Array(symmetricKey))
      )

    wallet.walletDescriptor = encryptedWalletDescriptor.combinedIvAndEncryptedData
    
    let coordinator = null
    for (const signer of wallet.signers) {
      // Elect first found signer with private key on this device as coordinator
      if (!coordinator) {
        const mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub: signer.xpub })
        if (mnemonic) {
          coordinator = signer 
          coordinator.mnemonic = mnemonic 
        }
      }
      if (enablePrivacy) {
        
        signer.derivationPath = signer.path || signer.derivationPath || `m/44'/145'/0'`
        signer.publicKey = binToHex(MultisigWallet.extractRawPublicKeyFromXpub(signer.xpub))

        const walletDescriptorWrappedDek = await encryptECIES(
          MultisigWallet.extractRawPublicKeyFromXpub(signer.xpub),
          new Uint8Array(symmetricKey)
        )
        signer.walletDescriptorWrappedDek = walletDescriptorWrappedDek

        signer.authPublicKey = binToHex(derivePublicKey(signer.xpub, SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH))
        if (coordinator && signer.xpub === coordinator.xpub) {
          signer.coordinator = true
        }
        delete signer.xpub
      }
    }

    if (!coordinator) {
      throw new Error('You must be a cosigner with a private key on this device to upload the multisig wallet setup!')
    }

    const mnemonic = coordinator.mnemonic
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network: 'mainnet', // This is ok we only use xpub hd prefix even on chipnet 
      hdPath: coordinator.path 
    })

    const decodedHdPrivateKey = decodeHdPrivateKey(hdPrivateKey)
    const coordinatorKeyRecord = new BsmsKeyRecord({
      masterFingerprint: coordinator.masterFingerprint,
      derivationPath: coordinator.path,
      key: coordinator.publicKey 
    })
    coordinatorKeyRecord.sign(decodedHdPrivateKey.node.privateKey)

    for (const s of wallet.signers) {
      delete s.mnemonic 
      s.coordinatorKeyRecord = 
        await coordinatorKeyRecord.toEciesEncryptedString(hexToBin(s.publicKey))
    }
    
    const uploadedWallet = await this.options.coordinationServer.uploadWallet({ 
      wallet, authCredentialsGenerator: this 
    })

    if (uploadedWallet?.id) {
      this.merge(uploadedWallet)
      this.save()
    }
    return this
  }

  /**
   * @param {object} deleteOptions
   * @param {boolean} deleteOptions.sync - If true, wallet will be synced with watchtower
   */
  async delete(deleteOptions) {
    if (this.options?.store) {
      if (this.options?.store?.commit) {
        this.options.store.commit('multisig/deleteWallet', { multisigWallet: this, ...deleteOptions})
      }
    }
  }

  async loadSignersXPrv() {
    if (this.options?.resolveXprvOfXpub) {
      for (const signer of this.getSigners()) {
        signer.xprv = await this.options?.resolveXprvOfXpub({ xpub: signer.xpub})
      }
    }
  } 

  /**
   * Resolve signer's mnemonics from this device
   * if available.
   */
  async loadSignersMnemonic() {
    if (this.options?.resolveMnemonicOfXpub) {
      for (const signer of this.getSigners()) {
        const mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub: signer.xpub})
        if (mnemonic) {
          signer.mnemonic = mnemonic
        } 
      }
    }
  }

  signerCanSign(signerXpub) {
    return this.signers.some(s => s.xpub === signerXpub && Boolean(s.xprv))
  }
  
  // ----- 5.11 Serialization & Export -----
  toJSON() {
    const signers = this.getSigners().map(s => {
      const { xprv, mnemonic, ...safe } = s 
      return safe
    })

    const payload = {
      id: this.id,
      name: this.name,
      m: this.m,
      signers: signers,
      networks: this.networks,
      settings: this.settings 
    }

    if (this.wcSessions && this.wcSessions.length > 0) {
      payload.wcSessions = this.wcSessions
    }

    return payload 
  }

  toString() {
    return utf8ToBin(this.toJSON())
  }

  toValue() {
    return JSON.parse(JSON.stringify(this.toJSON()))
  }

  export() {
    const j = structuredClone(this.toJSON())

    delete j.id
    
    if (Object.keys(j.networks || {}).length === 0) {
      delete j.networks
    }

    if (Object.keys(j.networks?.chipnet || {}).length === 0) {
      delete j.networks?.chipnet
    }

    if (Object.keys(j.networks?.mainnet || {}).length === 0) {
      delete j.networks?.mainnet
    }

    if (j.networks?.chipnet?.lastUsedDepositAddressIndex !== undefined) {
      j.networks.chipnet.di = j.networks?.chipnet?.lastUsedDepositAddressIndex
      delete j.networks?.chipnet?.lastUsedDepositAddressIndex
    }
    if (j.networks?.chipnet?.lastUsedChangeAddressIndex !== undefined) {
      j.networks.chipnet.ci = j.networks?.chipnet?.lastUsedChangeAddressIndex
      delete j.networks?.chipnet?.lastUsedChangeAddressIndex
    }

    if (j.networks?.mainnet?.lastUsedDepositAddressIndex !== undefined) {
      j.networks.mainnet.di = j.networks?.mainnet?.lastUsedDepositAddressIndex
      delete j.networks?.mainnet?.lastUsedDepositAddressIndex
    }

    if (j.networks?.mainnet?.lastUsedChangeAddressIndex !== undefined) {
      j.networks.mainnet.ci = j.networks?.mainnet?.lastUsedChangeAddressIndex
      delete j.networks?.mainnet?.lastUsedChangeAddressIndex
    }
    
    return j
  }

  static import(wallet) {
    // Clone the wallet to avoid mutating the input
    const imported = structuredClone(wallet)
    
    // Restore network property names from shortened versions
    // export() converts: lastUsedDepositAddressIndex → di, lastUsedChangeAddressIndex → ci
    if (imported.networks) {
      if (imported.networks.chipnet) {
        if (imported.networks.chipnet.di !== undefined) {
          imported.networks.chipnet.lastUsedDepositAddressIndex = imported.networks.chipnet.di
          delete imported.networks.chipnet.di
        }
        if (imported.networks.chipnet.ci !== undefined) {
          imported.networks.chipnet.lastUsedChangeAddressIndex = imported.networks.chipnet.ci
          delete imported.networks.chipnet.ci
        }
      }
      
      // Handle mainnet
      if (imported.networks.mainnet) {
        if (imported.networks.mainnet.di !== undefined) {
          imported.networks.mainnet.lastUsedDepositAddressIndex = imported.networks.mainnet.di
          delete imported.networks.mainnet.di
        }
        if (imported.networks.mainnet.ci !== undefined) {
          imported.networks.mainnet.lastUsedChangeAddressIndex = imported.networks.mainnet.ci
          delete imported.networks.mainnet.ci
        }
      }
    }
    
    // Create MultisigWallet instance with restored data
    const mofn = new MultisigWallet({
      id: imported.id,
      name: imported.name,
      m: imported.m,
      signers: imported.signers,
      networks: imported.networks || {
        mainnet: {},
        chipnet: {}
      }
    })
    
    return mofn
  }

/**
 * Asynchronously generates authentication credentials for a signer.
 *
 * If no `xpub` is provided, the function will automatically select
 * the first available xpub that has a corresponding private key on the device.
 *
 * @async
 * @function generateAuthCredentials
  * @param {string} [xpub] - Optional extended public key (xpub) to identify which signer to use.
  * @returns {Promise<import('./network.js').WatchtowerMultisigCoordinationServerAuthCredentials|null>} 
  * Resolves with authentication credentials including the signed message and xpub used.
  */
 // ----- 5.10 Coordination Server Methods -----
 async generateAuthCredentials(xpub) {
  if (xpub) {
    const mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub })
    if (!mnemonic) return null
    return generateCoordinationServerCredentialsFromMnemonic({ mnemonic })
  }
  for (const signer of this.getSigners()) {
    let mnemonic = ''
    if (signer.mnemonic) {
      mnemonic = signer.mnemonic
    } else {
      mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub: signer.xpub })
    }
    if (mnemonic) {
      return generateCoordinationServerCredentialsFromMnemonic({ mnemonic })
    }
  }
  return null
}

async generateCosignerAuthCredentials(xpub) {
  if (xpub) {
    const mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub })
    if (!mnemonic) return null
    return generateCoordinationServerCosignerCredentialsFromMnemonic({ mnemonic })
  }
  for (const signer of this.getSigners()) {
    let mnemonic = ''
    if (signer.mnemonic) {
      mnemonic = signer.mnemonic
    } else {
      mnemonic = await this.options?.resolveMnemonicOfXpub({ xpub: signer.xpub })
    }
    if (mnemonic) {
      return generateCoordinationServerCosignerCredentialsFromMnemonic({ mnemonic })
    }
  }
  return null
}

async sync() {

  if (this._syncInProgress) {
    return this;
  }
  
  this._syncInProgress = true;

  if (!this.options?.coordinationServer) return

  try {
    const [loadServerIdentityResponse, getWalletResponse] = 
    
    await Promise.allSettled([
      this.loadSignersServerIdentity(), 
      this.options?.coordinationServer?.getWallet({ 
        identifier: this.generateBsmsDescriptorId()
      })
    ])

    if (loadServerIdentityResponse?.status === 'fulfilled' && !loadServerIdentityResponse.value) {
      await this.loadSignersMnemonic()
      const signerWithMnemonic = this.getSigners().find(s => s.mnemonic)
      if (signerWithMnemonic) {
        const serverIdentity = generateCoordinatorServerIdentityFromMnemonic({
          name: signerWithMnemonic.xpub,
          mnemonic: signerWithMnemonic.mnemonic,
          network: this.options?.provider?.network
        })

        await this.options.coordinationServer.createServerIdentity({ 
          serverIdentity, 
          authCredentialsGenerator: this 
        })
      }
    }

    if (getWalletResponse?.status === 'rejected' && getWalletResponse.reason?.response?.status === 404) {
      this.id = ''
    }

    if (getWalletResponse?.status === 'fulfilled') {
      this.id = getWalletResponse.value?.id
    }
    
    this.save()

    return this 
    
  } catch (error) {
    console.error('Error during synchronization:', error);
  } finally {
    this._syncInProgress = false;
  }
  
}


async loadSignersServerIdentity() {
  if (!this.options?.coordinationServer) return
  let modified = false
  for (const signer of this.getSigners()) {
    const authCredentials = await this.generateAuthCredentials(signer.xpub)
    if (!authCredentials) continue
    try {
      const serverIdentity = await this.options.coordinationServer.getServerIdentity({ 
        publicKey: authCredentials['X-Auth-PubKey'], 
        authCredentialsGenerator: this 
      })
      if (serverIdentity) {
        signer.serverIdentityId = serverIdentity.id
        modified = true
      }  
    } catch (error) {
      // ignore unresolved server identity
    }
  }
  if (!modified) return
  this.save()
}

static cashAddressToTokenAddress(cashAddress) {
  return lockingBytecodeToCashAddress({ 
    bytecode: cashAddressToLockingBytecode(cashAddress).bytecode,
    tokenSupport: true 
  })
}

  static fromBase64(base64) {
    
    const bin = base64ToBin(base64)
    const psbtWalletMagicMarker = readBytes(4)
    const psbtWalletMagicMarkerReadResult = psbtWalletMagicMarker({ bin, index: 0 })
    if (binsAreEqual(psbtWalletMagicMarkerReadResult.result, hexToBin(WALLET_MAGIC))) {
      const wallet = new MultisigWallet()
      const psbtWallet = new PsbtWallet()
      psbtWallet.decode(base64, wallet)
      return wallet
    }

    return new MultisigWallet(JSON.parse(binToUtf8(bin)))
  }

  static importFromObject(multisigWalletObject, options) {
    return new MultisigWallet(JSON.parse(JSON.stringify(multisigWalletObject)), options)
  }

  static fromObject(multisigWalletObject, options) {
    return MultisigWallet.importFromObject(multisigWalletObject, options) 
  }

  static generateAuthCredentials({ xprv, xpub }) {
    if (!xprv || !xpub) return null
    const decodedPrivateKey = decodeHdPrivateKey(xprv)
    const decodedPublicKey = decodeHdPublicKey(xpub)
    // Use address index 0 (derivation path '0/0') instead of master key
    const privateKey = deriveHdPathRelative(decodedPrivateKey.node, '0/0')
    const publicKey = deriveHdPathRelative(decodedPublicKey.node, '0/0')
    const rawMessage = `multisig:${Date.now()}`
    const message = utf8ToBin(rawMessage);
    const hash = sha256.hash(message)
    const schnorr = secp256k1.signMessageHashSchnorr(privateKey.privateKey, hash)
    const der = secp256k1.signMessageHashDER(privateKey.privateKey, hash)
    return {
        'X-Auth-PubKey': binToHex(publicKey.publicKey),
        'X-Auth-Signature': `schnorr=${binToHex(schnorr)};der=${binToHex(der)}`,
        'X-Auth-Message': rawMessage
    }
  }

  /**
   * Extracts the compressed raw public key (33 bytes) from a recipient's xpub string.
   * @param {string} xpubString The Base58 encoded xpub.
   * @returns {Uint8Array} The raw compressed public key.
   */
  static extractRawPublicKeyFromXpub(xpubString) {
    if (!xpubString) {
        throw new Error('xpubString is required but was undefined or null');
    }
    const decodeResult = decodeHdPublicKey(xpubString);
    if (typeof decodeResult === 'string') {
        throw new Error(`Failed to decode xpub: ${decodeResult}`);
    }
    if (!decodeResult?.node?.publicKey) {
        throw new Error('Failed to extract public key from decoded xpub');
    }
    return decodeResult.node.publicKey;
  }

  /**
   * Extracts the compressed raw public key (33 bytes) from a recipient's xpub string.
   * Throws an error if the input xpub is undefined, null, or invalid.
   *
   * @param {string} xpubString - The Base58 encoded xpub.
   * @returns {string} The public key hex string.
   * @throws {Error} If the xpubString is not provided or cannot be decoded.
   */
  static extractPublicKeyZeroFromXpub(xpubString) {
    const decodedPublicKey = decodeHdPublicKey(xpubString)
    const publicKey = deriveHdPathRelative(decodedPublicKey.node, '0/0')
    return binToHex(publicKey.publicKey)
  }


  // =============================================================================
  // RECIPIENT SIDE FUNCTIONS
  // (To be used only by the owner of the xprv/xpub pair to decrypt the message)
  // =============================================================================

  /**
  * Extracts the master private key from the owner's xprv string.
  * @param {string} xprvString The Base58 encoded xprv.
  * @returns {Uint8Array} The raw master private key.
  */
  static extractRawPrivateKeyFromXprv(xprvString) {
    const decodeResult = decodeHdPrivateKey(xprvString);
    if (typeof decodeResult === 'string') {
        throw new Error(`Failed to decode xprv: ${decodeResult}`);
    }
    // Note: privateKey might be undefined if you pass in an xpub string accidentally
    if (!decodeResult.node.privateKey) {
        throw new Error("Could not extract private key from provided string.");
    }
    return decodeResult.node.privateKey;
  }



  /**
   * Generate a BSMS 1.0 descriptor record (plain text)
   *
   * @param {Object} options
   * @param {number} options.m - Multisig threshold (e.g., 2 for 2-of-3)
   * @param {Array} options.signers - Array of signer objects
   *   Each: {
   *     masterFingerprint: string,   // 8-character hex 
   *     xpub: string,         // Full xpub string
   *     path: string   // e.g. "44'/145'/0'" hardened path
   *   }
   * @returns {string} Complete BSMS record as multi-line string
   */
  generateBsmsDescriptor() {
      const firstAddress = this.getDepositAddress(0, this.cashAddressNetworkPrefix).address
      const signers = this.getSigners().map(s => {
        const { xprv, mnemonic, ...safe } = s 
        return safe
      })
      const descriptor = new BsmsDescriptor({
        m: this.m,
        signers: signers,
        firstAddress: firstAddress
      })
      return descriptor
  }

  generateBsmsDescriptorId() {
    return binToHex(sha256.hash(utf8ToBin(this.generateBsmsDescriptor().toString())))
  }

  /**
   * Parse a BSMS 1.0 descriptor record (multi-line string)
   *
   * @param {string} bsmsText - The full BSMS record content
   * @returns {Object} Parsed data
   * @throws {Error} If invalid format or version
   */
  static parseBsmsDescriptor(bsmsText) {
    if (typeof bsmsText !== 'string') {
      throw new Error('BSMS record must be a string');
    }

    const lines = bsmsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0); // Remove empty lines

    if (lines.length !== 4) {
      throw new Error(`Invalid BSMS record: expected 4 lines, got ${lines.length}`);
    }

    const [header, descriptor, pathRestrictions, firstAddress] = lines;

    // Line 1: Header
    if (header !== 'BSMS 1.0') {
      throw new Error(`Unsupported BSMS version: ${header} (only BSMS 1.0 supported)`);
    }

    // // Line 4: First address (basic validation)
    // const expectedFirstAddress = this.getDepositAddress(0, this.cashAddressNetworkPrefix).address
    // if (firstAddress !== expectedFirstAddress) {
    //   throw new Error('Address does not match expected first address');
    // }

    // Line 3: Path restrictions
    let normalizedPathRestrictions = pathRestrictions;
    if (pathRestrictions.toLowerCase() === 'no path restrictions') {
      normalizedPathRestrictions = '/*'; // Standard internal form
    }

    // Line 2: Parse the descriptor
    const descriptorTrimmed = descriptor.trim();

    // Match wrapper like sh(...), wsh(...), etc.
    const wrapperMatch = descriptorTrimmed.match(/^([a-z]+)\((.*)\)$/);
    

    const scriptType = wrapperMatch[1]; // e.g., 'sh'
    if (scriptType !== 'sh') {
      throw new Error('Invalid descriptor, must use sh(...) format');
    }
    
    const innerContent = wrapperMatch[2].trim();

    // Match sortedmulti(m, key1, key2, ...)
    const multiMatch = innerContent.match(/^sortedmulti\((\d+),(.*)\)$/);
    if (!multiMatch) {
      throw new Error('Descriptor must use sortedmulti(...)');
    }

    const m = parseInt(multiMatch[1], 10);
    const keyStrings = multiMatch[2]
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keyStrings.length < m) {
      throw new Error('Not enough keys for threshold');
    }

    // Parse each key expression: [fingerprint/path]xpub/branchRange
    const signers = keyStrings.map(keyStr => {
      // Match pattern: [fingerprint/path]xpub/branchRange
      const keyMatch = keyStr.match(/^\[([0-9a-fA-F]{8})\/([^[\]]+)\]([xtyY]pub[^/]+)\/(.+)$/);
      if (!keyMatch) {
        throw new Error(`Invalid key expression: ${keyStr}`);
      }

      const [, masterFingerprint, originPath, xpub, branchRange] = keyMatch;

      return {
        masterFingerprint: masterFingerprint.toLowerCase(),
        path: `m/${originPath.trim().replace(/\/+$/, '')}`,
        xpub: xpub.trim(),
        branchRange: branchRange.trim()
      };
    });

    return {
      version: '1.0',
      scriptType,           // e.g., 'sh'
      m,            // m in m-of-n
      n: signers.length,    // total signers
      signers,              // array of parsed signer objects
      descriptor: descriptorTrimmed,
      pathRestrictions: normalizedPathRestrictions,
      firstAddress
    };
  }
}

