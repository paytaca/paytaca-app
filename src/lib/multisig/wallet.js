
/**
 * @typedef {('ecdsa' | 'schnorr')} SignatureAlgorithm
 */

/**
 * @typedef {Object} MultisigWalletSigner
 * @property {string} xpub - The extended public key of the signer
 * @property {string} name - The name of the signer
 * @property {string} [publicKey] - The public key derived from the xpub
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
* @property {number} [lastIssuedChangeAddressIndex]  - The last generated change address index, derived and stored locally doesn't have to be on chain
* @property {number} [lastUsedDepositAddressIndex]  - The last used address, received funds or was used in a transaction input (spent), on chain
* @property {number} [lastUsedChangeAddressIndex]  - The last used change address on-chain.
*/

/**
 * @typedef {Object} MultisigWalletConfig
 * @property {number} m - The required number of signatures
 * @property {MultisigWalletSigner[]} signers - The allowed signers
 * @property {number|string} [id] - The unique identifier of the wallet. If value is string it's the locking bytecode of the first address (address 0). If number it's the synced wallet id
 * @property {number} [n] - The total number of signers
 * @property {number} [lastIssuedDepositAddressIndex=0] - The last generated external address index, shown to the user to receive coins, or derived and stored locally
 * @property {number} [lastIssuedChangeAddressIndex]  - The last generated change address index, derived and stored locally doesn't have to be on chain
 * @property {number} [lastUsedDepositAddressIndex]  - The last used address, received funds or was used in a transaction input (spent), on chain
 * @property {number} [lastUsedChangeAddressIndex]  - The last used change address on-chain.
 * @property {{[Network]: MultisigWalletNetworkData }} [networks] - Network specific state
 * @property {MultisigWalletWcPeer} [wcPeers] - The wallet connect peers associated with particular address index of the MultisigWallet.
 * /

/**
 * @typedef {Object} MultisigWalletOptions
 * @property {NetworkProvider} provider
 * @property {Network} [network='mainnet']
 * @property {Object} [store] - Optional Vuex-style store.
 * @property {(type: string, payload?: any) => Promise<any>} [store.dispatch]
 * @property {(type: string, payload?: any) => void} [store.commit]
 * @property {Object.<string, any>} [store.state]
 * @property {Object.<string, any>} [store.getters]
 * @property {(param: { xpub: string }) => Promise<string>} [resolveXprvOfXpub] - Function that resolves to xprv given an xpub
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
 * @callback GetWalletUtxos
 * @param {MultisigWallet} wallet
 * @returns {Promise<CommonUtxo[]>}
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
  sha256,
  cashAddressToLockingBytecode,
  compileScript,
  base58AddressToLockingBytecode
} from 'bitauth-libauth-v3'
import Big from 'big.js'

import { createTemplate } from './template.js'
import { commonUtxoToLibauthInput, commonUtxoToLibauthOutput, selectUtxos } from './utxo.js'
import { estimateFee, getMofNDustThreshold, MultisigTransactionBuilder, recipientsToLibauthTransactionOutputs } from './transaction-builder.js'
import { Pst } from './pst.js'


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
    signer.addressDerivationPath = addressDerivationPath
    signer.parentFingerPrint = decodeHdPublicKey.parentFingerPrint
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

export const importFromBase64 = (multisigWalletBase64) => {
  const bin = base64ToBin(multisigWalletBase64)
  const multisigWallet = JSON.parse(binToUtf8(bin))
  return multisigWallet 
}

export const exportToBase64 = (multisigWallet) => {
  const bin = utf8ToBin(stringify(multisigWallet))
  return binToBase64(bin)
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

export const getRedeemScript = ({ multisigWallet, addressDerivationPath }) => {
  const sortedSignersWithPublicKeys = derivePublicKeys({ signers: multisigWallet.signers, addressDerivationPath })
  const lockingData = {
    bytecode: {}
  }
  for (const index in sortedSignersWithPublicKeys) {
    let publicKey = sortedSignersWithPublicKeys[index].publicKey 
    if (typeof(publicKey) === 'string') {
      publicKey = hexToBin(publicKey)
    }
    lockingData.bytecode[`key${Number(index) + 1}.public_key`] = publicKey
  }

  const template = createTemplate({ m: multisigWallet.m, signers: sortedSignersWithPublicKeys })
  const compiler = getCompiler({ template })
  const script = compileScript('lock', lockingData, compiler.configuration)
  // const lockingScript = script.bytecode
  const redeemScript = script.reduce.bytecode
  return redeemScript
}

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

export class MultisigWallet {

  /**
   * Creates a new MultisigWallet instance.
   * @param {MultisigWalletConfig} config - Wallet configuration options.
   * @param {MultisigWalletOptions} options - Wallet options.
   */
  constructor (config, options) {
    this.id = config.id
    this.name = config.name
    this.m = config.m
    this.signers = config.signers
    this.networks = config.networks || {
      mainnet: {},
      chipnet: {}
    }
    this.enabled = config.enabled
    if (!config.id) {
      this.id = getWalletHash(this)
    }
    this.options = options
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
      if (this.networks[this.options.provider.network].lastIssuedDepositAddressIndex === undefined) {
        _addressIndex = 0
      } else {
        _addressIndex = this.networks[this.options.provider.network].lastIssuedDepositAddressIndex + 1
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

getRedeemScript(addressDerivationPath) {
  return getRedeemScript({ multisigWallet: this, addressDerivationPath })
}

/**
 * @param {string} address - The cashaddress
 * @param {string} addressPath - The bip32 relative derivation path. 
 * Example: 0/0 for deposit address at index 0, 1/0 for change address at address 0
 */
async getAddressUtxos(address, addressPath) {
  return await this.options?.provider?.getAddressUtxos(address, addressPath)
}

async getWalletUtxos() {

  if (!this.options?.provider) throw new Error('Missing provider')

  let lastDepositAddress = (this.networks[this.options.provider.network].lastIssuedDepositAddressIndex || 0) + 20

  let dCounter = 0

  const utxoPromises = []

  while (dCounter < lastDepositAddress) {
    utxoPromises.push(
      this.getAddressUtxos(
        this.getDepositAddress(dCounter, this.cashAddressNetworkPrefix).address, `0/${dCounter}`
      )
    )
    dCounter++
  }

  let lastChangeAddress = (this.networks[this.options.provider.network].lastIssuedChangeAddressIndex || 0) + 20

  let cCounter = 0

  while (cCounter < lastChangeAddress) {
    utxoPromises.push(
      this.getAddressUtxos(
        this.getChangeAddress(cCounter, this.cashAddressNetworkPrefix).address, `1/${cCounter}`
      )
    )
    cCounter++
  }

  const utxos = await Promise.all(utxoPromises)

  const highestUsedDepositAddressIndex = utxos.flat().reduce((highest, u) => {
    if (u.addressPath?.startsWith('0/')) {
      const index = Number(u.addressPath.split('/')[1])
      if (index > highest) return index
    }
    return highest
  }, -1)

  const highestUsedChangeAddressIndex = utxos.flat().reduce((highest, u) => {
    if (u.addressPath?.startsWith('1/')) {
      const index = Number(u.addressPath.split('/')[1])
      if (index > highest) return index
    }
    return highest
  }, -1)

  if (highestUsedDepositAddressIndex >= (this.networks[this.options.provider.network].lastUsedDepositAddressIndex || -1)) {
    this.networks[this.options.provider.network].lastUsedDepositAddressIndex = highestUsedDepositAddressIndex
      this.options?.store?.dispatch(
        'multisig/updateWalletLastUsedDepositAddressIndex', 
        { wallet: this, lastUsedDepositAddressIndex: highestUsedDepositAddressIndex })
  }

  if (highestUsedChangeAddressIndex >= (this.lastUsedChangeAddressIndex || -1)) {
    this.networks[this.options.provider.network].lastUsedChangeAddressIndex = highestUsedChangeAddressIndex       
      this.options?.store?.dispatch(
        'multisig/updateWalletLastUsedChangeAddressIndex',         
        { wallet: this, lastUsedChangeAddressIndex: highestUsedChangeAddressIndex })
  }

  if (highestUsedDepositAddressIndex >= (this.lastIssuedDepositAddressIndex || -1)) {
    this.networks[this.options.provider.network].lastIssuedDepositAddressIndex = highestUsedDepositAddressIndex
      this.options?.store?.dispatch(
        'multisig/updateWalletLastIssuedDepositAddressIndex', 
        { wallet: this, lastIssuedDepositAddressIndex: highestUsedDepositAddressIndex })
  }

  if (highestUsedChangeAddressIndex >= (this.lastIssuedChangeAddressIndex || -1)) {
    this.networks[this.options.provider.network].lastIssuedChangeAddressIndex = highestUsedChangeAddressIndex       
      this.options?.store?.dispatch(
        'multisig/updateWalletLastIssuedChangeAddressIndex',         
        { wallet: this, lastIssuedChangeAddressIndex: highestUsedChangeAddressIndex })
  }

  this._utxos = utxos?.flat()
  return this._utxos
}

async getWalletHashUtxos() {
  return await this.options?.provider?.getWalletHashUtxos(this.getWalletHash())
}

async getAddressBalance(address) {
  return await this.options?.provider?.getAddressBalance(address)
}

/**
 * @param {'bch'|string} [asset='bch'] - If not present assumed as 'bch', asset is a token category
 * @param {number} [decimals=0] - The asset decimals, defaults to 0 if asset is present and is not 'bch'
 
 */
async getWalletBalance(asset, decimals) {
  const utxos = (await this.getWalletUtxos())
  if (!asset || asset === 'bch') {
    const balance = utxos.filter(u=> !u.token).reduce((b, u) => b += u.satoshis, 0)
    return balance / 1e8
  }
  const balance = utxos.filter(u=> u.token && u.token.category === asset).reduce((b, u) => b += u.token.amount, 0)
  return balance / `1e${decimals || 0}`
}

async scanAddresses() {

  let lastDepositAddress = (this.lastIssuedDepositAddressIndex || 0) + 20

  let dIndex = 0

  const promises = []

  while (dIndex < lastDepositAddress) {
    promises.push(
      (async () => {
        await this.options?.store?.dispatch(
          'multisig/subscribeWalletAddress',
          this.getDepositAddress(cIndex, this.cashAddressNetworkPrefix).address
        )
      })()
    )
    dIndex++
  }

  let lastChangeAddress = (this.lastIssuedChangeAddressIndex || 0) + 20

  let cIndex = 0

  while (cIndex < lastChangeAddress) {
    promises.push(
      (async () => {
          await this.options?.store?.dispatch(
            'multisig/subscribeWalletAddress',
            this.getDepositAddress(cIndex, this.cashAddressNetworkPrefix).address
          )
        })()
    )
    cIndex++
  }
  return await Promise.all(promises)
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
  const utxos = await this.getWalletUtxos() 
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
    (await this.getWalletUtxos() || [])
      .filter((u)=>{
        return u.token.category === tokenCategory
      })
      .reduce((b, u) => b += u.satoshis, 0)
  return balance / `1e${decimals || 0}`
}


/**
 * Marks the address at addressIndex as issued.
 * 
 * @param {number} addressIndex - Index of the address to mark as issued.
 */
 async issueDepositAddress(addressIndex) {
    this.lastIssuedDepositAddressIndex = addressIndex
    if (!this.options?.store?.dispatch) return
    this.options?.store?.dispatch(
      'multisig/updateWalletLastIssuedDepositAddressIndex', 
      { wallet: this, lastIssuedDepositAddressIndex: addressIndex })
    this.options?.store?.dispatch(
      'multisig/subscribeWalletAddress',
      this.getDepositAddress(addressIndex, this.cashAddressNetworkPrefix).address
    )
  }

/**
 * Marks the address at addressIndex as issued.
 * 
 * @param {number} addressIndex - Index of the address to mark as issued.
 */
 async issueChangeAddress(addressIndex) {

    this.lastIssuedChangeAddressIndex = addressIndex
    if (!this.options?.store?.dispatch) return
    this.options?.store?.dispatch(
      'multisig/updateWalletLastIssuedChangeAddressIndex', 
      { wallet: this, lastIssuedChangeAddressIndex: addressIndex })

    this.options?.store?.dispatch(
      'multisig/subscribeWalletAddress',
      this.getChangeAddress(addressIndex, this.cashAddressNetworkPrefix).address
    )
    
 }

  /**
   * Create a transaction proposal to send BCH or CashTokens
   * @param {import('./transaction-builder.js').TransactionProposal} proposal
   * @param {import('./pst.js').PartiallySignedTransactionOptions} options 
   * @returns {Promise<import('./pst.js').Pst>}
   */
  async createPstFromTransactionProposal(proposal, options) {

    if (!proposal?.recipients?.every(r=> r.asset === proposal.recipients[0].asset)) {
      throw new Error('Sending mixed assets is not yet supported!')
    }

    if (!this.utxos) {
      await this.getWalletUtxos()
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
      satoshiUtxos = selectUtxos(this.utxos?.filter(u => !u.token), { targetSatoshis })
      if (!satoshiUtxos.satoshisSatisfied) {
        throw new Error('Insufficient BCH balance!')
      }
    }

    let tokenUtxos = null
    if (Object.keys(targetTokens).length > 0) {
      // trying to send tokens
      tokenUtxos = selectUtxos(this.utxos?.filter(u => Boolean(u.token)), { targetTokens })
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
        addressPath: u.addressPath
      }
    })

    let outputs = recipientsToLibauthTransactionOutputs(proposal.recipients, this.m, this.n)

    const outputsMap = outputs.map(o => ({}))

    let funderUtxos = null
    const changeAddressIndex = this.lastIssuedChangeAddressIndex === undefined ? 0 : this.lastIssuedChangeAddressIndex + 1
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

    let tokenChangeOutput = null

    if (tokenUtxos) {

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
        outputs.push(tokenChangeOutput)
        outputsMap.push({ addressPath: `1/${changeAddressIndex}`, desc: 'token change' })
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

    let totalSatoshisChangeAmount = totalSatoshisInputsAmount - totalSatoshiOutputsAmount

    let additionalFunds = 0

    if (totalSatoshisChangeAmount < estimatedFee) {
      
      if (funderUtxos) { 
        funderUtxos = selectUtxos(funderUtxos.remainingUtxos?.filter(u => !u.token), { targetSatoshis: estimatedFee +  satoshisChangeOutputDustThreshold })
      } else {
        funderUtxos = selectUtxos(this.utxos?.filter(u => !u.token), { targetSatoshis: estimatedFee + satoshisChangeOutputDustThreshold })
      }

      if (!funderUtxos.satoshisSatisfied) {
        throw new Error('Insufficient BCH balance for fee!')
      }

      additionalFunds = 
        funderUtxos.selectedUtxos.filter(u => !u.token).reduce((sats, nextU)=> sats += nextU.satoshis, 0)

      inputs = 
        inputs.concat(
              funderUtxos.selectedUtxos?.map((u) => {
                return {
                  ...commonUtxoToLibauthInput(u, []),
                  sourceOutput: commonUtxoToLibauthOutput(u, cashAddressToLockingBytecode(u.address).bytecode),
                  addressPath: u.addressPath
                }
            })
        )
    }

    if (additionalFunds > 0) {
      // recompute total input sats if new funds are added to the inputs for fee
      totalSatoshisInputsAmount = 
        inputs
          .reduce((target, nextInput) => target += nextInput.sourceOutput.valueSatoshis, 0n)
    }

    totalSatoshisChangeAmount = totalSatoshisInputsAmount - (totalSatoshiOutputsAmount + estimatedFee)

    satoshisChangeOutput.valueSatoshis = totalSatoshisChangeAmount
    if (satoshisChangeOutput.valueSatoshis > satoshisChangeOutputDustThreshold) {
      outputs.push(satoshisChangeOutput)
      outputsMap.push({ addressPath: `1/${changeAddressIndex}`, desc: 'sats change' })
      await this.issueChangeAddress(changeAddressIndex)
    }

    const transaction = new MultisigTransactionBuilder()
    transaction
      .addInputs(inputs)
      .addOutputs(outputs)
    const unsignedTransactionHex = transaction.build()
    inputs.forEach((input) => {
      if (input.addressPath) {
        input.redeemScript = this.getRedeemScript(input.addressPath)
      }
    })
    const pst = new Pst({
      origin: proposal.origin,
      creator: proposal.creator,
      purpose: proposal.purpose,
      unsignedTransactionHex,
      inputs,
      outputs: outputsMap,
      wallet: this
    }, options)

    return pst
  }

  /**
   * @param {object} saveOptions
   * @param {boolean} saveOptions.sync - If true, wallet will be synced with watchtower
   */
  async save(saveOptions) {
    if (this.options?.store) {
      if (this.options?.store?.commit) {
        this.options.store.commit('multisig/saveWallet', this)
      }
      if (this.options?.store?.dispatch && saveOptions?.sync) {
        return await this.options.store.dispatch('multisig/syncWallet', this)
      }
    }
  }

  /**
   * @param {object} saveOptions
   * @param {boolean} saveOptions.sync - If true, wallet will be synced with watchtower
   */
  async sync() {

    if (this.options?.store?.dispatch) {
      return await this.options.store.dispatch('multisig/syncWallet', this)
    }
  }

  /**
   * @param {object} deleteOptions
   * @param {boolean} deleteOptions.sync - If true, wallet will be synced with watchtower
   */
  async delete(deleteOptions) {
    if (this.options?.store) {
      if (this.options?.store?.dispatch) {
        this.options.store.dispatch('multisig/deleteWallet', { multisigWallet: this, ...deleteOptions})
      }
    }
  }

  /**
   * Resolve the xprv of signers that do not have xprv if resolveXPrvOfXpub function is provided in options
   */
  async resolveXprvsOfXpubs() {
    if (this.options?.resolveXprvOfXpub) {
      for (const signer of this.signers) {
        const xprv = await this.options?.resolveXprvOfXpub({ xpub: signer.xpub})
        if (xprv) {
          if (!signer.xprv) {
            signer.xprv = xprv
          }
        } 
      }
    }
  }

  signerCanSign(signerXpub) {
    return this.signers.some(s => s.xpub === signerXpub && Boolean(s.xprv))
  }
  
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      m: this.m,
      signers: this.signers,
      lastIssuedDepositAddressIndex: this.lastIssuedDepositAddressIndex,
      lastIssuedChangeAddressIndex: this.lastIssuedChangeAddressIndex,
      lastUsedDepositAddressIndex: this.lastUsedDepositAddressIndex,
      lastUsedChangeAddressIndex: this.lastUsedChangeAddressIndex,
      networks: this.networks
    }
  }

  exportToBase64() {
    return exportToBase64(this)
  }

  static cashAddressToTokenAddress(cashAddress) {
    return lockingBytecodeToCashAddress({ 
      bytecode: cashAddressToLockingBytecode(cashAddress).bytecode,
      tokenSupport: true 
    })
  }

  static importFromBase64(base64MultisigWallet, options) {
    const object = importFromBase64(base64MultisigWallet)
    return MultisigWallet.importFromObject(object, options)
  }

  static importFromObject(multisigWalletObject, options) {
    return new MultisigWallet(JSON.parse(JSON.stringify(multisigWalletObject)), options)
  }

  static fromObject(multisigWalletObject, options) {
    return MultisigWallet.importFromObject(multisigWalletObject, options) 
  }
}


// const wallet = new MultisigWallet({
//   onStateChange: async ({ key, value }) => {
//     await store.commit('wallet/update', { key, value });
//     await fetch('/api/sync-wallet', {
//       method: 'POST',
//       body: JSON.stringify({ key, value }),
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }
// });


