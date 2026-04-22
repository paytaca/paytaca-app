// import { WalletConnectionManager } from '@wizardconnect/wallet'
import { mnemonicToSeedSync } from 'bip39'
import { toUint8Array, toBigInt } from '@wizardconnect/core'
import {
  deriveHdPrivateNodeFromSeed,
  deriveHdPrivateNodeChild,
  deriveHdPath,
  deriveHdPublicNode,
  encodeHdPublicKey,
  secp256k1,
  hmacSha256,
  hexToBin,
  assertSuccess,
  decodeTransaction,
} from 'bitauth-libauth-v3'
import { getMnemonic } from 'src/wallet/index'
import { signBchTransaction } from 'src/wallet/bch-sign'

const seedCache = new Map()
const relayKeyCache = new Map()

const PATH_NAME_TO_CHILD = { receive: 0, change: 1, defi: 7 }

let _manager = null
let _hdNodes = null
let _walletIndex = 0
let _isChipnet = false
let _walletHash = null

function getPrefix() {
  return _isChipnet ? 'bchtest' : 'bitcoincash'
}

async function ensureHdNodes() {
  if (_hdNodes) return _hdNodes

  const mnemonic = await getMnemonic(_walletIndex)
  if (!mnemonic) throw new Error('No mnemonic available')

  const seedKey = mnemonic
  if (!seedCache.has(seedKey)) {
    seedCache.set(seedKey, new Uint8Array(mnemonicToSeedSync(mnemonic)))
  }
  const seed = seedCache.get(seedKey)

  const derivation = "m/44'/145'/0'"
  const hdMaster = deriveHdPrivateNodeFromSeed(seed)
  const hdMain = deriveHdPath(hdMaster, `${derivation}/0`)
  const hdChange = deriveHdPath(hdMaster, `${derivation}/1`)
  const hdDefi = deriveHdPath(hdMaster, `${derivation}/7`)

  _hdNodes = { hdMaster, hdMain, hdChange, hdDefi, derivation }
  return _hdNodes
}

function getHdChainForIndex(nodes, childIndex) {
  if (childIndex === 1) return nodes.hdChange
  if (childIndex === 7) return nodes.hdDefi
  return nodes.hdMain
}

function createAdapter(nodes) {
  return {
    walletName: 'Paytaca',
    walletIcon: 'https://www.paytaca.com/paytaca-icon.png',

    getRelayPrivateKey(uri) {
      const cacheKey = uri
      if (!relayKeyCache.has(cacheKey)) {
        const hdRelay = deriveHdPath(nodes.hdMaster, `${nodes.derivation}/8`)
        const relaySecret = deriveHdPrivateNodeChild(hdRelay, 0).privateKey
        const uriBytes = new TextEncoder().encode(uri)
        relayKeyCache.set(cacheKey, hmacSha256(relaySecret, uriBytes))
      }
      return relayKeyCache.get(cacheKey)
    },

    getPublicKey(path, index) {
      const hdChain = getHdChainForIndex(nodes, Number(path))
      const child = deriveHdPrivateNodeChild(hdChain, Number(index))
      const pubKey = secp256k1.derivePublicKeyCompressed(child.privateKey)
      if (typeof pubKey === 'string') throw new Error(pubKey)
      return pubKey
    },

    getXpub(path) {
      const hdChain = getHdChainForIndex(nodes, Number(path))
      const hdPublic = deriveHdPublicNode(hdChain)
      const network = _isChipnet ? 'testnet' : 'mainnet'
      const result = encodeHdPublicKey({ node: hdPublic, network })
      if (typeof result === 'string') throw new Error(result)
      return result.hdPublicKey
    },

    async signTransaction() {
      throw new Error('signTransaction should not be called directly - use signRequest()')
    }
  }
}

/** @type {typeof import('@wizardconnect/wallet').WalletConnectionManager} */
let WalletConnectionManager;
/**
 * @returns {Promise<import('@wizardconnect/wallet').WalletConnectionManager>}
 */
export async function getManager() {
  if (_manager) return _manager

  // Lazy load WalletConnectionManager since it's not supported in ios 16.3 and older
  // This will allow the most of the app to be usable for ios 16.3 and older
  if (!WalletConnectionManager) {
    const _wizardConnectModule = await import('@wizardconnect/wallet')
    WalletConnectionManager = _wizardConnectModule.WalletConnectionManager
  }
  const nodes = await ensureHdNodes()
  const adapter = createAdapter(nodes)
  _manager = new WalletConnectionManager(adapter)
  return _manager
}

export function setWalletConfig(walletIndex, isChipnet, walletHash = null) {
  const walletChanged = _walletHash !== null && _walletHash !== walletHash && walletHash !== null
  
  _walletIndex = walletIndex
  _isChipnet = isChipnet
  
  if (walletHash) {
    _walletHash = walletHash
  }
  
  // If wallet changed and manager exists, clear it so it will be reinitialized
  if (walletChanged && _manager) {
    _manager.disconnectAll()
    _manager = null
    _hdNodes = null
  }
}

export function getWalletHash() {
  return _walletHash
}

export function reset() {
  if (_manager) {
    _manager.disconnectAll()
  }
  _walletHash = null;
  _manager = null
  _hdNodes = null
}

export function connect(uri) {
  if (!_manager) throw new Error('Manager not initialized')
  return _manager.connect(uri)
}

export function disconnect(connectionId) {
  if (!_manager) return
  _manager.disconnect(connectionId)
}

export function disconnectAll() {
  if (_manager) {
    _manager.disconnectAll()
  }
  _manager = null
  _hdNodes = null
}

export async function sendSignResponse(connectionId, sequence, signedTxHex) {
  if (!_manager) throw new Error('Manager not initialized')
  await _manager.sendSignResponse(connectionId, sequence, signedTxHex)
}

export async function sendSignError(connectionId, sequence, errorMessage) {
  if (!_manager) throw new Error('Manager not initialized')
  await _manager.sendSignError(connectionId, sequence, errorMessage)
}

/**
 * Hydrate a source output from the wire per the hdwalletv1 spec.
 *
 * Uint8Array fields may arrive as plain hex strings (emitted by the reference
 * sourceOutputToRelay serializer) or as extended JSON (`<Uint8Array: 0x...>`).
 * BigInts arrive as extended JSON (`<bigint: Xn>`). The toUint8Array /
 * toBigInt helpers from @wizardconnect/core transparently handle every
 * documented format, which is the deserialization path the spec prescribes.
 *
 * Zero-length placeholder unlockingBytecode is dropped — downstream compiler
 * logic treats an absent property as a placeholder.
 */
function hydrateSourceOutput(so) {
  const hasUnlocking =
    so.unlockingBytecode !== undefined &&
    so.unlockingBytecode !== '' &&
    so.unlockingBytecode?.length !== 0
  return {
    outpointTransactionHash: toUint8Array(so.outpointTransactionHash),
    outpointIndex: so.outpointIndex,
    sequenceNumber: so.sequenceNumber,
    valueSatoshis: toBigInt(so.valueSatoshis),
    lockingBytecode: toUint8Array(so.lockingBytecode),
    ...(hasUnlocking && { unlockingBytecode: toUint8Array(so.unlockingBytecode) }),
    ...(so.token && { token: hydrateToken(so.token) }),
  }
}

function hydrateToken(token) {
  return {
    category: toUint8Array(token.category),
    amount: toBigInt(token.amount),
    ...(token.nft && { nft: hydrateNft(token.nft) }),
  }
}

function hydrateNft(nft) {
  return {
    ...(nft.capability !== undefined && { capability: nft.capability }),
    ...(nft.commitment !== undefined && { commitment: toUint8Array(nft.commitment) }),
  }
}

/**
 * Sign a transaction request from a dApp.
 * Uses inputPaths from the request to derive exactly the keys needed for each input.
 */
export async function signRequest(request) {
  const nodes = await ensureHdNodes()
  const txHex = request.transaction.transaction
  const transaction = decodeTransaction(hexToBin(txHex))
  if (typeof transaction === 'string') throw new Error('Failed to decode transaction: ' + transaction)

  const sourceOutputs = request.transaction.sourceOutputs.map(hydrateSourceOutput)

  const prefix = getPrefix()

  if (!request.inputPaths || !Array.isArray(request.inputPaths)) {
    throw new Error('Sign request missing inputPaths')
  }

  // Derive keys directly from inputPaths — no address scanning needed
  const inputKeyMap = new Map()
  for (const [inputIndex, pathName, addressIndex] of request.inputPaths) {
    const childIndex = PATH_NAME_TO_CHILD[pathName]
    if (childIndex === undefined) {
      throw new Error(`Unknown path name: ${pathName}`)
    }
    const hdChain = getHdChainForIndex(nodes, childIndex)
    const child = deriveHdPrivateNodeChild(hdChain, addressIndex)
    const pubKey = assertSuccess(secp256k1.derivePublicKeyCompressed(child.privateKey))
    inputKeyMap.set(inputIndex, { privateKey: child.privateKey, publicKey: pubKey })
  }

  function resolveKey(_lockingBytecode, inputIndex) {
    return inputKeyMap.get(inputIndex) || null
  }

  const { signedTransaction } = signBchTransaction({
    transaction,
    sourceOutputs,
    resolveKey,
    prefix,
  })
  return signedTransaction
}
