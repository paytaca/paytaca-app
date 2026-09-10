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

import Big from 'big.js'
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
  encodeTransactionOutput,
  getMinimumFee,
  getDustThreshold,
  binToBase64,
  CashAddressNetworkPrefix
} from 'bitauth-libauth-v3'
import Watchtower from 'watchtower-cash-js'
import { ElectrumNetworkProvider } from 'cashscript'
import { pubkeyToAddress } from 'src/utils/crypto'
import { Psbt, PsbtInput, PsbtOutput, ProprietaryFields } from 'src/lib/multisig/psbt'
import {
  selectUtxos,
  commonUtxoToLibauthInput,
  commonUtxoToLibauthOutput,
  watchtowerWalletHashUtxoToCommonUtxo
} from 'src/lib/multisig/utxo'

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
    this.masterFingerprint = config?.masterFingerprint
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
   * Fetch all UTXOs associated with this wallet's addresses, including cash
   * token (fungible + NFT) outputs, normalized to CommonUtxo shape.
   * @returns {Promise<Object[]>} UTXOs with txid/value/vout/address_path/token
   */
  async getWalletHashUtxos (network = this.network) {
    const walletHash = this.walletHashFor(network)
    const api = this.watchtowerFor(network).BCH._api
    const requests = [
      api.get(`utxo/wallet/${walletHash}/`),
      api.get(`utxo/wallet/${walletHash}/cashtoken/ft/`),
      api.get(`utxo/wallet/${walletHash}/cashtoken/nft/`)
    ]
    const responses = await Promise.allSettled(requests)
    const utxos = []
    for (const r of responses) {
      if (r.status === 'fulfilled' && Array.isArray(r.value?.data?.utxos)) {
        utxos.push(...r.value.data.utxos)
      }
    }
    const seen = new Set()
    return utxos
      .filter(u => {
        const key = `${u.txid}:${u.vout}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(u => {
        const common = watchtowerWalletHashUtxoToCommonUtxo(u)
        if (!common.addressPath) common.addressPath = u.address_path || ''
        if (!common.addressPath) common.addressPath = u.addressPath || ''
        return common
      })
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
   * @returns {Promise<bigint>} BCH balance in satoshis (non-token UTXOs)
   */
  async getWalletBalance (network = this.network) {
    const utxos = await this.getWalletHashUtxos(network)
    return utxos
      .filter(u => !u.token)
      .reduce((total, u) => total + BigInt(u.satoshis), 0n)
  }

  /**
   * @returns {Promise<Object>} { bch: <number in BCH units>, [category]: <token units> }
   */
  async getWalletBalances (network = this.network) {
    const utxos = await this.getWalletHashUtxos(network)
    const balances = {}
    for (const u of utxos) {
      if (!u.token) {
        balances.bch = (balances.bch || 0n) + BigInt(u.satoshis)
      } else if (u.token.category && !u.token.nft) {
        const category = String(u.token.category)
        balances[category] = (balances[category] || 0n) + BigInt(u.token.amount || 0)
      }
    }
    const result = {}
    if (balances.bch) result.bch = Number(balances.bch) / 1e8
    for (const category of Object.keys(balances)) {
      if (category === 'bch') continue
      result[category] = Number(balances[category])
    }
    return result
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
   * Build libauth outputs for a list of recipients (single-sig / P2PKH).
   * Supports BCH, fungible tokens, and NFTs.
   * @param {Array<{ address: string, amount: string, asset: string, decimals?: number, targetNftUtxo?: Object }>} recipients
   * @returns {Object[]}
   */
  recipientsToTransactionOutputs (recipients) {
    return recipients.map(r => {
      const output = {
        lockingBytecode: cashAddressToLockingBytecode(r.address).bytecode,
        valueSatoshis: 0n
      }

      if (r.asset === 'bch') {
        output.valueSatoshis = BigInt(Big(r.amount).mul(1e8).toString())
        return output
      }

      output.token = {
        category: hexToBin(r.asset)
      }

      if (r.targetNftUtxo?.token?.nft) {
        output.token.amount = BigInt(r.targetNftUtxo.token.amount ?? (Number(r.amount) || 1))
        output.token.nft = {
          capability: r.targetNftUtxo.token.nft.capability,
          commitment: hexToBin(r.targetNftUtxo.token.nft.commitment)
        }
      } else if (Number(r.amount || 0) > 0) {
        output.token.amount = BigInt(Big(r.amount).mul(`1e${r.decimals || 0}`).toString())
      }

      output.valueSatoshis = getDustThreshold(output)
      return output
    })
  }

  /**
   * Select UTXOs to fund a proposal: BCH, fungible tokens, or NFTs.
   * For NFTs without an explicit targetNftUtxo, the NFT UTXO is resolved by
   * matching the recipient's token category.
   * @param {Array<Object>} recipients
   * @param {'send-fungible-assets'|'send-non-fungible-assets'} transactionType
   * @param {Object[]} utxos
   * @returns {Promise<Object[]>} selected UTXOs with addresses resolved
   */
  async selectProposalUtxos (recipients, transactionType, utxos) {
    const network = this.network
    const asset = recipients[0].asset
    const includeNfts = transactionType === 'send-non-fungible-assets'

    utxos = this._resolvableUtxos(utxos, network)

    let selectedUtxos = []

    if (asset === 'bch') {
      const targetSatoshis = this.recipientsToTransactionOutputs(recipients).reduce((t, o) => t + o.valueSatoshis, 0n)
      const bchUtxos = utxos.filter(u => !u.token)
      if (bchUtxos.length === 0) throw new Error('Insufficient BCH balance!')
      const result = selectUtxos(bchUtxos, { targetSatoshis })
      if (!result.satoshisSatisfied) throw new Error('Insufficient BCH balance!')
      selectedUtxos = result.selectedUtxos
    } else if (includeNfts) {
      const nftUtxos = utxos.filter(u => Boolean(u.token?.nft) && u.token?.category === asset)
      for (const r of recipients) {
        const target = r.targetNftUtxo
          ? nftUtxos.find(u => u.txid === r.targetNftUtxo.txid && u.vout === r.targetNftUtxo.vout)
          : nftUtxos[0]
        if (!target) throw new Error('Insufficient token balance!')
        r.targetNftUtxo = target
        if (!selectedUtxos.some(u => u.txid === target.txid && u.vout === target.vout)) {
          selectedUtxos.push(target)
        }
      }
    } else {
      const targetTokens = {}
      for (const r of recipients) {
        const amount = BigInt(Big(r.amount).mul(`1e${r.decimals || 0}`).toString())
        targetTokens[r.asset] = (targetTokens[r.asset] || 0n) + amount
      }
      const tokenUtxos = utxos.filter(u => Boolean(u.token?.category) && !u.token?.nft)
      if (tokenUtxos.length === 0) throw new Error('Insufficient token balance!')
      const result = selectUtxos(tokenUtxos, { targetTokens })
      const satisfied = Object.keys(targetTokens).every(cat => (result.totalTokens[cat]?.total || 0n) >= targetTokens[cat])
      if (!satisfied) throw new Error('Insufficient token balance!')
      selectedUtxos = result.selectedUtxos
    }

    selectedUtxos.forEach(u => { this._resolveUtxoAddress(u, network) })
    return selectedUtxos
  }

  _resolveUtxoAddress (u, network = this.network) {
    if (u.address) return u
    u.addressPath = u.addressPath || u.address_path || ''
    if (!u.addressPath) {
      u._unaddressable = true
      return u
    }
    const [ type, index ] = String(u.addressPath).split('/').map(Number)
    if (!Number.isInteger(type) || !Number.isInteger(index) || (type !== 0 && type !== 1)) {
      u._unaddressable = true
      return u
    }
    u.address = type === 1
      ? this.getChangeAddress(index, network).address
      : this.getDepositAddress(index, network).address
    return u
  }

  /**
   * Resolve addresses for a set of UTXOs and drop any that cannot be
   * attributed to a wallet address (they are unusable in a PSBT).
   * @param {Object[]} utxos
   * @param {string} [network]
   * @returns {Object[]}
   */
  _resolvableUtxos (utxos, network = this.network) {
    return utxos.filter(u => {
      this._resolveUtxoAddress(u, network)
      return !u._unaddressable
    })
  }

  /**
   * Estimate the minimum fee for a single-sig (P2PKH) transaction.
   * @param {Object[]} inputs - libauth inputs with sourceOutput
   * @param {Object[]} outputs - libauth outputs
   * @returns {bigint}
   */
  _estimateFee (inputs, outputs) {
    const headerSize = 10 // version(4) + varint input count(1) + varint output count(1) + locktime(4)
    const p2pkhInputSize = 148 // outpoint(36) + scriptSig len(1) + DER sig(73) + pubkey(34) + sequence(4)
    const inputSize = inputs.reduce((t) => t + p2pkhInputSize, 0)
    const outputSize = outputs.reduce((t, o) => t + encodeTransactionOutput(o).length, 0)
    return getMinimumFee(BigInt(headerSize + inputSize + outputSize), FEE_RATE_SAT_PER_KB)
  }

  /**
   * BIP32 derivation data (single signer) for the wallet's xpub at a relative path.
   * @param {string} relativePath - e.g. '0/3' or '1/0'
   * @returns {{ pubkey: string, masterFingerprint: string, path: string }}
   */
  _bip32For (relativePath) {
    return {
      pubkey: this.getPubkeyAt(relativePath),
      masterFingerprint: this.masterFingerprint || getXpubFingerprint(this.xpub),
      path: toFullDerivationPath(relativePath, this.derivationPath)
    }
  }

  /**
   * Build an UNSIGNED transaction proposal (BCH, fungible token, or NFT) and
   * encode it as a PSBT. BUILD-ONLY: nothing is signed or broadcast.
   *
   * @param {Object} opts
   * @param {Array<{ address: string, amount: string, asset: string, decimals?: number, targetNftUtxo?: Object }>} [opts.recipients]
   * @param {Array<{ address: string, satoshis: bigint }>} [opts.outputs] - Legacy BCH-only outputs (converted internally)
   * @param {string} [opts.origin] - Origin identifier stored in PSBT
   * @param {string} [opts.purpose] - Purpose identifier stored in PSBT
   * @param {'send-fungible-assets'|'send-non-fungible-assets'} [opts.transactionType]
   * @param {boolean} [opts.reserveWcAccountUtxos=false]
   * @returns {Promise<string>} base64 encoded PSBT
   */
  async createProposal (opts) {
    const network = this.network
    const {
      origin,
      purpose,
      transactionType = 'send-fungible-assets',
      reserveWcAccountUtxos = false
    } = opts || {}

    let recipients = opts?.recipients

    if (!Array.isArray(recipients) || recipients.length === 0) {
      const legacyOutputs = opts?.outputs
      if (Array.isArray(legacyOutputs) && legacyOutputs.length > 0) {
        recipients = legacyOutputs.map(o => ({
          address: o.address,
          amount: String(Number(o.satoshis) / 1e8),
          asset: 'bch',
          decimals: 8
        }))
      } else {
        throw new Error('Must have at least one recipient')
      }
    }

    if (!recipients.every(r => r.asset === recipients[0].asset)) {
      throw new Error('Sending mixed assets is not yet supported!')
    }

    const utxos = await this.getWalletHashUtxos(network)
    let sourceUtxos = utxos
    if (reserveWcAccountUtxos) {
      sourceUtxos = utxos.filter(u => u.addressPath !== '0/0' && u.address_path !== '0/0')
    }
    sourceUtxos = this._resolvableUtxos(sourceUtxos, network)
    if (!sourceUtxos.length) throw new Error('Insufficient Balance')

    let selectedUtxos = await this.selectProposalUtxos(recipients, transactionType, sourceUtxos)

    let outputs = this.recipientsToTransactionOutputs(recipients)

    const change = this.getChangeAddress(undefined, network)
    const changePath = `1/${change.addressIndex}`

    let tokenChangeOutput = null
    if (selectedUtxos.some(u => Boolean(u.token))) {
      const tokenInputsTotal = selectedUtxos
        .filter(u => Boolean(u.token))
        .reduce((t, u) => t + BigInt(u.token.amount || 0), 0n)
      const tokenOutputsTotal = outputs
        .filter(o => Boolean(o.token))
        .reduce((t, o) => t + BigInt(o.token.amount || 0), 0n)

      const tokenChangeAmount = tokenInputsTotal - tokenOutputsTotal
      if (tokenChangeAmount > 0n) {
        const tokenSample = outputs.find(o => Boolean(o.token))
        tokenChangeOutput = {
          lockingBytecode: cashAddressToLockingBytecode(change.address).bytecode,
          valueSatoshis: 0n,
          token: {
            ...tokenSample.token,
            amount: tokenChangeAmount
          }
        }
        tokenChangeOutput.valueSatoshis = getDustThreshold(tokenChangeOutput)
        outputs.push({
          ...tokenChangeOutput,
          _isChange: true,
          _addressPath: changePath
        })
      }
    }

    const estimatedFee = this._estimateFee([], outputs)

    const tokenUtxoSatoshis = selectedUtxos
      .filter(u => Boolean(u.token))
      .reduce((t, u) => t + BigInt(u.satoshis), 0n)

    const bchOutputTotal = outputs.reduce((t, o) => t + o.valueSatoshis, 0n)
    const bchTarget = BigInt(bchOutputTotal) + estimatedFee - tokenUtxoSatoshis

    if (bchTarget > 0n) {
      const bchUtxos = sourceUtxos.filter(u => !u.token)
      const result = selectUtxos(bchUtxos, { targetSatoshis: BigInt(bchTarget) })
      if (!result.satoshisSatisfied) throw new Error('Insufficient BCH balance!')
      const added = result.selectedUtxos.filter(u => !selectedUtxos.some(s => s.txid === u.txid && s.vout === u.vout))
      added.forEach(u => { this._resolveUtxoAddress(u, network) })
      selectedUtxos = selectedUtxos.concat(added)
    }

    const inputs = selectedUtxos.map((u) => {
      if (!u.address) {
        throw new Error('UTXO is missing an address path')
      }
      return {
        ...commonUtxoToLibauthInput(u, [], DEFAULT_SEQUENCE),
        sourceOutput: commonUtxoToLibauthOutput(u, cashAddressToLockingBytecode(u.address).bytecode)
      }
    })

    const totalSatoshisInputs = inputs.reduce((t, i) => t + i.sourceOutput.valueSatoshis, 0n)
    const totalSatoshiOutputs = outputs.reduce((t, o) => t + o.valueSatoshis, 0n)
    const fee = this._estimateFee(inputs, outputs)

    let satoshisChangeAmount = totalSatoshisInputs - totalSatoshiOutputs - fee

    if (satoshisChangeAmount < 0n) {
      throw new Error('Insufficient BCH balance for fee!')
    }

    const satoshisChangeOutput = {
      lockingBytecode: cashAddressToLockingBytecode(change.address).bytecode,
      valueSatoshis: satoshisChangeAmount
    }
    const satoshisChangeDust = getDustThreshold(satoshisChangeOutput)

    if (satoshisChangeAmount > satoshisChangeDust) {
      outputs.push({
        ...satoshisChangeOutput,
        _isChange: true,
        _addressPath: changePath
      })
    }

    const prevTxHex = await Promise.all(
      selectedUtxos.map(async u => binToHex(await this.getRawTransaction(u.txid)))
    )

    const inputObjects = selectedUtxos.map((u, i) => ({
      outpointIndex: Number(u.vout),
      outpointTransactionHash: hexToBin(u.txid),
      sequenceNumber: DEFAULT_SEQUENCE,
      unlockingBytecode: [],
      _addressPath: u.addressPath || u.address_path,
      _prevTxHex: prevTxHex[i]
    }))

    const unsignedTransactionHex = binToHex(
      encodeTransactionCommon({
        version: 2,
        locktime: 0,
        inputs: inputObjects,
        outputs
      })
    )

    const psbt = new Psbt()
    psbt.globalMap.setUnsignedTx(unsignedTransactionHex)
    psbt.globalMap.setTxVersion(2)
    psbt.globalMap.setFallbackLocktime(0)
    psbt.globalMap.setInputCount(inputObjects.length)
    psbt.globalMap.setOutputCount(outputs.length)
    psbt.globalMap.setPsbtVersion(145)

    if (origin) {
      psbt.globalMap.addProprietaryField(
        ProprietaryFields.paytaca.identifier,
        utf8ToBin(origin),
        ProprietaryFields.paytaca.subKey.origin.subType,
        ProprietaryFields.paytaca.subKey.origin.subKeyData
      )
    }

    if (purpose) {
      psbt.globalMap.addProprietaryField(
        ProprietaryFields.paytaca.identifier,
        utf8ToBin(purpose),
        ProprietaryFields.paytaca.subKey.purpose.subType,
        ProprietaryFields.paytaca.subKey.purpose.subKeyData
      )
    }

    inputObjects.forEach((input) => {
      const psbtInput = new PsbtInput()
      psbtInput.setOutpointTransaction(input._prevTxHex)
      psbtInput.setOutpointTransactionHash(input.outpointTransactionHash)
      psbtInput.setOutpointIndex(input.outpointIndex)
      psbtInput.setSequenceNumber(input.sequenceNumber)
      const { pubkey, masterFingerprint, path } = this._bip32For(input._addressPath)
      psbtInput.addBip32Derivation(pubkey, masterFingerprint, path)
      psbt.inputMap.add(psbtInput)
    })

    outputs.forEach((output) => {
      const psbtOutput = new PsbtOutput()
      psbtOutput.setAmount(output.valueSatoshis)
      psbtOutput.setOutScript(binToHex(output.lockingBytecode))
      if (output.token) {
        psbtOutput.setToken({
          amount: output.token.amount,
          category: binToHex(output.token.category),
          nft: output.token.nft
            ? {
                capability: output.token.nft.capability,
                commitment: binToHex(output.token.nft.commitment)
              }
            : undefined
        })
      }
      if (output._isChange && output._addressPath) {
        const { pubkey, masterFingerprint, path } = this._bip32For(output._addressPath)
        psbtOutput.addBip32Derivation(pubkey, masterFingerprint, path)
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
      masterFingerprint: this.masterFingerprint,
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