/**
 * ============================================================================
 * READ-ONLY WALLET - Single-sig watch-only wallet (XPub)
 * ============================================================================
 *
 * A ReadOnlyWallet watches a single extended public key (xpub) so the owner
 * can build unsigned transactions (PSBTs) and track balances/history without
 * ever holding the private key material.
 *
 * Design notes:
 *  - It mirrors the MultisigWallet surface (address/utxo/balance/history/
 *    subscribe/proposal) but is single-sig (one signer, m = 1).
 *  - All key derivation and scripting uses @bitauth/libauth (bitauth-libauth-v3).
 *    No @psf/bch-js dependency.
 *  - Transactions are BUILD-ONLY: createProposal() returns an unsigned PSBT
 *    (base64) encoded with src/lib/multisig/psbt.js. Nothing is signed or
 *    broadcast from here.
 *  - Storage differs from mnemonic wallets: only { name, xpub, networks,
 *    settings } is persisted (see toJSON/export/import).
 */

import {
  decodeHdPublicKey,
  deriveHdPathRelative,
  binToHex,
  hexToBin,
  utf8ToBin,
  cashAddressToLockingBytecode,
  sha256,
  hash160,
  encodeTransactionCommon,
  getMinimumFee,
  binToBase64,
  CashAddressNetworkPrefix
} from 'bitauth-libauth-v3'
import Watchtower from 'watchtower-cash-js'
import { ElectrumNetworkProvider } from 'cashscript'
import { pubkeyToAddress } from 'src/utils/crypto'
import { Psbt, PsbtInput, PsbtOutput } from 'src/lib/multisig/psbt'

export const BCH_DERIVATION_PATH = "m/44'/145'/0'"

export const ReadOnlyNetwork = Object.freeze({
  mainnet: 'mainnet',
  chipnet: 'chipnet'
})

const projectId = {
  mainnet: process.env.WATCHTOWER_PROJECT_ID,
  chipnet: process.env.WATCHTOWER_CHIP_PROJECT_ID
}

const DEFAULT_SEQUENCE = 0xfffffffe
const FEE_RATE_SAT_PER_KB = 1500n

/**
 * Derive the raw public key at a relative BIP32 path (e.g. '0/3').
 * @param {string} xpub
 * @param {string} relativePath
 * @returns {import('bitauth-libauth-v3').HdPublicKey} Uint8Array public key
 */
export function derivePublicKeyFromXpub (xpub, relativePath) {
  const decoded = decodeHdPublicKey(xpub)
  if (typeof decoded === 'string') throw new Error(decoded)
  const childNode = deriveHdPathRelative(decoded.node, relativePath)
  return childNode.publicKey
}

/**
 * Validate an xpub string.
 * @param {string} xpub
 * @returns {boolean}
 */
export function isValidXpub (xpub) {
  if (typeof xpub !== 'string' || !xpub) return false
  const decoded = decodeHdPublicKey(xpub)
  return typeof decoded !== 'string' && Boolean(decoded?.node?.publicKey)
}

/**
 * Master fingerprint stand-in for an xpub.
 * The true master fingerprint is not derivable from an xpub alone, so we use
 * the first 4 bytes of HASH160 of the xpub node's public key as a stable
 * identifier for PSBT BIP32 derivation fields.
 * @param {string} xpub
 * @returns {string} 8 hex chars
 */
export function getXpubFingerprint (xpub) {
  const decoded = decodeHdPublicKey(xpub)
  if (typeof decoded === 'string') throw new Error(decoded)
  return binToHex(hash160(decoded.node.publicKey).slice(0, 4))
}

/**
 * Map an address-path relative index to the BCH BIP44 account path.
 * Example: '0/3' -> "m/44'/145'/0'/0/3"
 * @param {string} relativePath
 * @param {string} [derivationPath="m/44'/145'/0'"]
 * @returns {string}
 */
export function toFullDerivationPath (relativePath, derivationPath = BCH_DERIVATION_PATH) {
  return `${derivationPath}/${String(relativePath).replace(/^\//, '')}`
}

export default class ReadOnlyWallet {
  /**
   * @param {Object} config
   * @param {string} [config.id]
   * @param {string} [config.name]
   * @param {string} config.xpub - The extended public key
   * @param {string} [config.derivationPath="m/44'/145'/0'"]
   * @param {Object} [config.networks] - { mainnet, chipnet } address index state
   * @param {Object} [config.settings]
   * @param {Object} options
   * @param {'mainnet'|'chipnet'} [options.network='mainnet'] - Active network
   */
  constructor (config = {}, options = {}) {
    this.id = config?.id
    this.name = config?.name
    this.xpub = config?.xpub
    this.derivationPath = config?.derivationPath || BCH_DERIVATION_PATH
    this.networks = config?.networks || {
      mainnet: {},
      chipnet: {}
    }
    this.settings = config?.settings || {}
    this.options = options || {}
    this._xpubNode = null
    this._walletHashes = {}
    this._wallets = {}
  }

  get network () {
    return this.options?.network || ReadOnlyNetwork.mainnet
  }

  set network (value) {
    this.options = this.options || {}
    this.options.network = value
  }

  get cashAddressNetworkPrefix () {
    return this.network === ReadOnlyNetwork.chipnet
      ? CashAddressNetworkPrefix.testnet
      : CashAddressNetworkPrefix.mainnet
  }

  get isChipnet () {
    return this.network === ReadOnlyNetwork.chipnet
  }

  /**
   * Watchtower client for the currently active network.
   */
  get watchtower () {
    return this.watchtowerFor(this.network)
  }

  watchtowerFor (network = this.network) {
    if (!this._wallets[network]) {
      this._wallets[network] = new Watchtower(network === ReadOnlyNetwork.chipnet)
    }
    return this._wallets[network]
  }

  getXPubNode () {
    if (!this._xpubNode) {
      const decoded = decodeHdPublicKey(this.xpub)
      if (typeof decoded === 'string') throw new Error(`Invalid xpub: ${decoded}`)
      this._xpubNode = decoded.node
    }
    return this._xpubNode
  }

  /**
   * Upper-case hex locking bytecode of the first address (0/0).
   * @param {'mainnet'|'chipnet'} [network]
   * @returns {string}
   */
  getWalletUUID (network = this.network) {
    const address = this.getAddressAt('0/0', network)
    const lockingBytecode = cashAddressToLockingBytecode(address)
    if (typeof lockingBytecode === 'string') throw new Error(lockingBytecode)
    return binToHex(lockingBytecode.bytecode)
  }

  /**
   * Stable watchtower wallet hash derived from the first address locking
   * bytecode. Mirrors MultisigWallet.getWalletHash().
   * @returns {string}
   */
  getWalletHash () {
    if (!this._walletHashes[this.network]) {
      this._walletHashes[this.network] = binToHex(sha256.hash(hexToBin(this.getWalletUUID(this.network))))
    }
    return this._walletHashes[this.network]
  }

  /**
   * Wallet hash for a specific network.
   * @param {'mainnet'|'chipnet'} network
   * @returns {string}
   */
  walletHashFor (network) {
    if (!this._walletHashes[network]) {
      this._walletHashes[network] = binToHex(sha256.hash(hexToBin(this.getWalletUUID(network))))
    }
    return this._walletHashes[network]
  }

  /**
   * @returns {string} hexadecimal public key at a relative path
   */
  getPubkeyAt (relativePath) {
    return binToHex(derivePublicKeyFromXpub(this.xpub, relativePath))
  }

  /**
   * @returns {string} cash address at a relative BIP32 path
   */
  getAddressAt (relativePath, network = this.network) {
    return pubkeyToAddress(this.getPubkeyAt(relativePath), network === ReadOnlyNetwork.chipnet)
  }

  /**
   * Get a deposit (receiving, 0/i) address.
   * @param {number} [addressIndex] - If omitted, next unissued address.
   * @param {string} [network=this.network]
   * @returns {{ addressIndex: number, address: string }}
   */
  getDepositAddress (addressIndex, network = this.network) {
    let _addressIndex = addressIndex
    if (_addressIndex === undefined || _addressIndex < 0) {
      const last = this.networks?.[network]?.lastIssuedDepositAddressIndex
      _addressIndex = last === undefined || last === null ? 0 : last + 1
    }
    return {
      addressIndex: _addressIndex,
      address: this.getAddressAt(`0/${_addressIndex}`, network)
    }
  }

  /**
   * Get a change address (1/i).
   * @param {number} [addressIndex] - If omitted, next unissued change address.
   * @param {string} [network=this.network]
   * @returns {{ addressIndex: number, address: string }}
   */
  getChangeAddress (addressIndex, network = this.network) {
    let _addressIndex = addressIndex
    if (_addressIndex === undefined || _addressIndex < 0) {
      const last = this.networks?.[network]?.lastUsedChangeAddressIndex
      _addressIndex = last === undefined || last === null ? 0 : last + 1
    }
    return {
      addressIndex: _addressIndex,
      address: this.getAddressAt(`1/${_addressIndex}`, network)
    }
  }

  /**
   * Derive the receiving + change address pair at an index.
   * @param {number} addressIndex
   * @param {string} [network=this.network]
   * @returns {{ receiving: string, change: string }}
   */
  getAddressSet (addressIndex, network = this.network) {
    return {
      receiving: this.getAddressAt(`0/${addressIndex}`, network),
      change: this.getAddressAt(`1/${addressIndex}`, network)
    }
  }

  getLastIssuedDepositAddressIndex (network = this.network) {
    return this.networks?.[network]?.lastIssuedDepositAddressIndex ?? -1
  }

  getLastUsedDepositAddressIndex (network = this.network) {
    return this.networks?.[network]?.lastUsedDepositAddressIndex ?? -1
  }

  getLastUsedChangeAddressIndex (network = this.network) {
    return this.networks?.[network]?.lastUsedChangeAddressIndex ?? -1
  }

  /**
   * Marks an address as issued and subscribes it to watchtower.
   * @param {number} addressIndex
   * @param {'mainnet'|'chipnet'} [network]
   */
  async issueDepositAddress (addressIndex, network = this.network) {
    if (!this.networks[network]) this.networks[network] = {}
    this.networks[network].lastIssuedDepositAddressIndex = addressIndex
    await this.subscribeWalletAddressIndex(addressIndex, 'deposit', network).catch(() => {})
  }

  /**
   * Marks a change address as used and subscribes it to watchtower.
   * @param {number} addressIndex
   * @param {'mainnet'|'chipnet'} [network]
   */
  async issueChangeAddress (addressIndex, network = this.network) {
    if (!this.networks[network]) this.networks[network] = {}
    this.networks[network].lastUsedChangeAddressIndex = addressIndex
    await this.subscribeWalletAddressIndex(addressIndex, 'change', network).catch(() => {})
  }

  /**
   * Subscribe the receive (and optionally change) address at an index.
   * @param {number} addressIndex
   * @param {'pair'|'deposit'|'change'} [type='pair']
   * @param {'mainnet'|'chipnet'} [network]
   */
  async subscribeWalletAddressIndex (addressIndex, type = 'pair', network = this.network) {
    const addresses = {
      receiving: this.getAddressAt(`0/${addressIndex}`, network),
      change: this.getAddressAt(`1/${addressIndex}`, network)
    }
    if (type === 'deposit') delete addresses.change
    if (type === 'change') delete addresses.receiving

    const data = {
      addresses,
      projectId: projectId[network],
      walletHash: this.walletHashFor(network),
      addressIndex
    }
    return this.watchtowerFor(network).subscribe(data)
  }

  /**
   * Fetches the last address index watchtower knows about for this wallet.
   * @param {Object} [opts]
   * @param {string} [network=this.network]
   */
  async getLastAddressIndex (opts = {}, network = this.network) {
    const params = {
      with_tx: Boolean(opts?.with_tx),
      exclude_pos: Boolean(opts?.exclude_pos),
      posid: opts?.posid
    }
    const apiResponse = await this.watchtowerFor(network).BCH._api.get(
      `last-address-index/wallet/${this.walletHashFor(network)}/`,
      { params }
    )
    if (Number.isInteger(apiResponse?.data?.address?.address_index)) {
      return apiResponse.data.address.address_index
    }
  }

  /**
   * Fetch all non-token UTXOs associated with this wallet's addresses.
   * @returns {Promise<Object[]>} UTXOs with txid/value/vout/address_path/satoshis
   */
  async getWalletHashUtxos (network = this.network) {
    const apiResponse = await this.watchtowerFor(network).BCH._api.get(
      `utxo/wallet/${this.walletHashFor(network)}/`
    )
    if (!Array.isArray(apiResponse?.data?.utxos)) return []
    return apiResponse.data.utxos
      .filter(u => !u.is_cashtoken && !u.tokenid)
      .map(u => this._normalizeUtxo(u))
  }

  /**
   * Trigger a background UTXO scan for the wallet.
   * @param {Object} [opts]
   * @param {string} [network=this.network]
   */
  async scanUtxos (opts = {}, network = this.network) {
    const queryParams = {}
    if (opts?.background) queryParams.background = true
    return this.watchtowerFor(network).BCH._api.get(
      `utxo/wallet/${this.walletHashFor(network)}/scan/`,
      { params: queryParams }
    )
  }

  _normalizeUtxo (u) {
    return {
      txid: u.txid,
      vout: Number(u.vout),
      value: u.value === undefined ? u.satoshis : u.value,
      satoshis: u.value === undefined ? u.satoshis : u.value,
      height: u.block,
      address_path: u.address_path,
      addressPath: u.address_path
    }
  }

  /**
   * Get UTXOs for a specific address/path.
   * @returns {Promise<Object[]>}
   */
  async getAddressUtxos (address, addressPath) {
    const utxos = await this.getWalletHashUtxos(this.network)
    return utxos
      .filter(u => u.addressPath === addressPath)
      .map(u => ({ ...u, address, addressPath }))
  }

  /**
   * @returns {Promise<bigint>} balance in satoshis
   */
  async getWalletBalance (network = this.network) {
    const utxos = await this.getWalletHashUtxos(network)
    return utxos.reduce((total, u) => total + BigInt(u.satoshis), 0n)
  }

  /**
   * @returns {Promise<Object>} { bch: <number in BCH units> }
   */
  async getWalletBalances (network = this.network) {
    const utxos = await this.getWalletHashUtxos(network)
    const satoshis = utxos.reduce((total, u) => total + BigInt(u.satoshis), 0n)
    return { bch: Number(satoshis) / 1e8 }
  }

  async getWalletTransactionHistory (opts = {}, network = this.network) {
    const walletHash = this.walletHashFor(network)
    return this.watchtowerFor(network).Wallet.getHistory({
      walletHash,
      tokenId: opts?.tokenId,
      page: opts?.page,
      recordType: opts?.recordType,
      txSearchReference: opts?.txSearchReference
    })
  }

  async getBalance (opts = {}, network = this.network) {
    const walletHash = this.walletHashFor(network)
    return this.watchtowerFor(network).Wallet.getBalance({
      walletHash,
      tokenId: opts?.tokenId,
      txid: opts?.txid,
      index: opts?.index
    })
  }

  async getTokenDetails (tokenId, network = this.network) {
    return this.watchtowerFor(network).BCH._api.get(`tokens/${tokenId}/`).then(r => r?.data)
  }

  /**
   * Fetch the raw bytes of a previous transaction (embedded in the PSBT so an
   * external signer can validate the input).
   * @param {string} txid
   * @returns {Promise<Uint8Array>}
   */
  async getRawTransaction (txid) {
    const provider = new ElectrumNetworkProvider(this.network)
    const hex = await provider.getRawTransaction(txid)
    return hexToBin(hex)
  }

  /**
   * Select non-token UTXOs to cover an amount (satoshis) plus fee.
   * @returns {{ selectedUtxos: Object[], changeAmount: bigint, inputSum: bigint, fee: bigint, satoshisSatisfied: boolean }}
   */
  async selectUtxos (targetSatoshis, opts = {}) {
    const utxos = await this.getWalletHashUtxos(opts.network || this.network)
    const sorted = [...utxos].sort((a, b) => BigInt(b.satoshis) - BigInt(a.satoshis))

    const selectedUtxos = []
    let inputSum = 0n

    for (const utxo of sorted) {
      const candidateSize = 10 + (selectedUtxos.length + 1) * 180 + 2 * 34
      const candidateFee = getMinimumFee(BigInt(candidateSize), FEE_RATE_SAT_PER_KB)
      if (inputSum + BigInt(utxo.satoshis) >= targetSatoshis + candidateFee) {
        selectedUtxos.push(utxo)
        inputSum += BigInt(utxo.satoshis)
        break
      }
      if (inputSum >= targetSatoshis) break
      selectedUtxos.push(utxo)
      inputSum += BigInt(utxo.satoshis)
    }

    const fee = getMinimumFee(BigInt(10 + selectedUtxos.length * 180 + 2 * 34), FEE_RATE_SAT_PER_KB)
    const changeAmount = inputSum - targetSatoshis - fee

    return {
      selectedUtxos,
      changeAmount,
      inputSum,
      fee,
      satoshisSatisfied: inputSum >= targetSatoshis + fee
    }
  }

  /**
   * Build an UNSIGNED BCH transaction proposal and encode it as a PSBT.
   * This is a BUILD-ONLY operation: nothing is signed or broadcast.
   *
   * @param {Object} opts
   * @param {Array<{ address: string, satoshis: bigint }>} opts.outputs - Desired outputs
   * @param {string} [opts.origin] - Origin identifier stored in PSBT
   * @param {string} [opts.purpose] - Purpose identifier stored in PSBT
   * @returns {Promise<string>} base64 encoded PSBT
   */
  async createProposal (opts) {
    const network = this.network
    const outputs = (opts?.outputs || []).map(o => ({
      address: o.address,
      valueSatoshis: BigInt(o.satoshis)
    }))

    if (!outputs.length) throw new Error('Must have at least one output')

    const totalSatoshis = outputs.reduce((t, o) => t + o.valueSatoshis, 0n)

    const { selectedUtxos, changeAmount, satoshisSatisfied } =
      await this.selectUtxos(totalSatoshis, { network })

    if (!satoshisSatisfied) {
      throw new Error('Insufficient BCH balance for the requested amount and fee')
    }

    const prevTxHex = await Promise.all(
      selectedUtxos.map(async u => binToHex(await this.getRawTransaction(u.txid)))
    )

    const change = this.getChangeAddress(undefined, network)

    const inputObjects = selectedUtxos.map((u, i) => ({
      outpointIndex: Number(u.vout),
      outpointTransactionHash: hexToBin(u.txid),
      sequenceNumber: DEFAULT_SEQUENCE,
      unlockingBytecode: [],
      _addressPath: u.address_path,
      _prevTxHex: prevTxHex[i]
    }))

    const outputObjects = [
      ...outputs.map(o => ({
        lockingBytecode: cashAddressToLockingBytecode(o.address).bytecode,
        valueSatoshis: o.valueSatoshis,
        _isChange: false,
        _addressPath: null
      })),
      ...(changeAmount > 0n ? [{
        lockingBytecode: cashAddressToLockingBytecode(change.address).bytecode,
        valueSatoshis: changeAmount,
        _isChange: true,
        _addressPath: `1/${change.addressIndex}`
      }] : [])
    ]

    const unsignedTransactionHex = binToHex(
      encodeTransactionCommon({
        version: 2,
        locktime: 0,
        inputs: inputObjects,
        outputs: outputObjects
      })
    )

    const psbt = new Psbt()
    psbt.globalMap.setUnsignedTx(unsignedTransactionHex)
    psbt.globalMap.setTxVersion(2)
    psbt.globalMap.setFallbackLocktime(0)
    psbt.globalMap.setInputCount(inputObjects.length)
    psbt.globalMap.setOutputCount(outputObjects.length)
    psbt.globalMap.setPsbtVersion(145)

    if (opts?.origin) {
      psbt.globalMap.addProprietaryField(
        utf8ToBin('paytaca'),
        utf8ToBin(opts.origin),
        new Uint8Array([]),
        utf8ToBin('origin')
      )
    }

    if (opts?.purpose) {
      psbt.globalMap.addProprietaryField(
        utf8ToBin('paytaca'),
        utf8ToBin(opts.purpose),
        new Uint8Array([]),
        utf8ToBin('purpose')
      )
    }

    inputObjects.forEach((input) => {
      const pubkey = this.getPubkeyAt(input._addressPath)
      const path = toFullDerivationPath(input._addressPath, this.derivationPath)
      const psbtInput = new PsbtInput()
      psbtInput.setOutpointTransaction(input._prevTxHex)
      psbtInput.setOutpointTransactionHash(input.outpointTransactionHash)
      psbtInput.setOutpointIndex(input.outpointIndex)
      psbtInput.setSequenceNumber(input.sequenceNumber)
      psbtInput.addBip32Derivation(pubkey, getXpubFingerprint(this.xpub), path)
      psbt.inputMap.add(psbtInput)
    })

    outputObjects.forEach((output) => {
      const psbtOutput = new PsbtOutput()
      psbtOutput.setAmount(output.valueSatoshis)
      psbtOutput.setOutScript(binToHex(output.lockingBytecode))
      if (output._isChange && output._addressPath) {
        const pubkey = this.getPubkeyAt(output._addressPath)
        const path = toFullDerivationPath(output._addressPath, this.derivationPath)
        psbtOutput.addBip32Derivation(pubkey, getXpubFingerprint(this.xpub), path)
      }
      psbt.outputMap.add(psbtOutput)
    })

    return binToBase64(psbt.serialize())
  }

  /**
   * Signing/sending methods are intentionally NOT available on a read-only
   * wallet. Anything that would require private keys throws.
   */
  _assertSigningUnavailable () {
    throw new Error('This is a read-only wallet: signing and sending are unavailable')
  }

  getPrivateKey () {
    return this._assertSigningUnavailable()
  }

  signMessage () {
    return this._assertSigningUnavailable()
  }

  sendBch () {
    return this._assertSigningUnavailable()
  }

  // ----- Serialization & Export -----
  toString () {
    return JSON.stringify(this.toJSON())
  }

  toValue () {
    return JSON.parse(JSON.stringify(this.toJSON()))
  }

  toJSON () {
    const payload = {
      id: this.id,
      name: this.name,
      xpub: this.xpub,
      derivationPath: this.derivationPath,
      networks: this.networks,
      settings: this.settings
    }
    const clean = {}
    for (const key of Object.keys(payload)) {
      if (payload[key] !== undefined && payload[key] !== null) clean[key] = payload[key]
    }
    return clean
  }

  export () {
    const j = structuredClone(this.toJSON())
    delete j.id
    if (Object.keys(j.networks || {}).length === 0) delete j.networks
    if (Object.keys(j.networks?.chipnet || {}).length === 0) delete j.networks?.chipnet
    if (Object.keys(j.networks?.mainnet || {}).length === 0) delete j.networks?.mainnet
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

  static import (wallet) {
    const imported = structuredClone(wallet || {})
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
    return new ReadOnlyWallet(imported)
  }

  static fromObject (walletObject) {
    return ReadOnlyWallet.import(walletObject)
  }

  static isValidXpub (xpub) {
    return isValidXpub(xpub)
  }
}