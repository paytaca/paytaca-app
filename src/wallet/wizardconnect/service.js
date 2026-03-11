import { WalletConnectionManager } from '@wizardconnect/wallet'
import { mnemonicToSeedSync } from 'bip39'
import {
  deriveHdPrivateNodeFromSeed,
  deriveHdPrivateNodeChild,
  deriveHdPath,
  deriveHdPublicNode,
  encodeHdPublicKey,
  encodeCashAddress,
  CashAddressType,
  secp256k1,
  hmacSha256,
  hexToBin,
  binToHex,
  assertSuccess,
  walletTemplateP2pkhNonHd,
  walletTemplateToCompilerBCH,
  importWalletTemplate,
  decodeTransaction,
  encodeTransaction,
  generateTransaction,
  sha256 as libauthSha256,
  ripemd160 as libauthRipemd160,
} from 'bitauth-libauth-v3'
import { getMnemonic } from 'src/wallet/index'
import { parseExtendedJson } from 'src/wallet/walletconnect2/tx-sign-utils'

const seedCache = new Map()
const relayKeyCache = new Map()

let _manager = null
let _hdNodes = null
let _walletIndex = 0
let _isChipnet = false

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

export async function getManager() {
  if (_manager) return _manager
  const nodes = await ensureHdNodes()
  const adapter = createAdapter(nodes)
  _manager = new WalletConnectionManager(adapter)
  return _manager
}

export function setWalletConfig(walletIndex, isChipnet) {
  _walletIndex = walletIndex
  _isChipnet = isChipnet
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
 * Sign a transaction request from a dApp.
 * Handles multi-address signing: for each input, finds the matching HD private key.
 */
export async function signRequest(request) {
  const nodes = await ensureHdNodes()
  const txHex = request.transaction.transaction
  const template = decodeTransaction(hexToBin(txHex))
  if (typeof template === 'string') throw new Error('Failed to decode transaction: ' + template)

  // sourceOutputs may contain extended JSON strings like "<Uint8Array: 0x...>" and "<bigint: ...>"
  // Always re-stringify then parse to ensure proper deserialization of binary/bigint values
  const rawSourceOutputs = parseExtendedJson(JSON.stringify(request.transaction.sourceOutputs))

  // Strip placeholder unlockingBytecode (dApp sends zero-byte placeholders)
  const sourceOutputs = rawSourceOutputs.map(({ unlockingBytecode, ...rest }) => rest)

  const walletTemplate = importWalletTemplate(walletTemplateP2pkhNonHd)
  if (typeof walletTemplate === 'string') throw new Error(walletTemplate)
  const compiler = walletTemplateToCompilerBCH(walletTemplate)

  const prefix = getPrefix()

  // Get last address indices from store for scanning bounds
  let store
  try {
    const storeModule = await import('src/store')
    store = storeModule.Store
  } catch {
    // Fallback
  }

  const lastReceiveIndex = store?.getters?.['global/getLastAddressIndex']?.('bch') || 20
  const lastChangeIndex = store?.getters?.['global/getLastAddressIndex']?.('bch') || 20

  // Build address→privateKey map for scanning
  const chains = [
    { hd: nodes.hdMain, maxIndex: Math.max(lastReceiveIndex + 10, 30) },
    { hd: nodes.hdChange, maxIndex: Math.max(lastChangeIndex + 10, 30) },
    { hd: nodes.hdDefi, maxIndex: 30 },
  ]

  const addressKeyMap = new Map()
  for (const chain of chains) {
    for (let i = 0; i <= chain.maxIndex; i++) {
      const child = deriveHdPrivateNodeChild(chain.hd, i)
      const pubKey = assertSuccess(secp256k1.derivePublicKeyCompressed(child.privateKey))
      const pubkeyHash = libauthRipemd160.hash(libauthSha256.hash(pubKey))
      const { address } = assertSuccess(encodeCashAddress({
        prefix,
        type: CashAddressType.p2pkh,
        payload: pubkeyHash,
      }))
      addressKeyMap.set(address, child.privateKey)
    }
  }

  for (const [index, input] of template.inputs.entries()) {
    const correspondingSourceOutput = sourceOutputs[index]

    // Skip inputs that already have unlocking bytecode
    if (correspondingSourceOutput.unlockingBytecode?.length) continue

    const lockingBytecode = correspondingSourceOutput.lockingBytecode
    if (!lockingBytecode) continue

    // P2PKH: OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG (25 bytes)
    if (lockingBytecode.length !== 25) continue

    const pubkeyHash = lockingBytecode.slice(3, 23)
    const { address } = assertSuccess(encodeCashAddress({
      prefix,
      type: CashAddressType.p2pkh,
      payload: pubkeyHash,
    }))

    const privateKey = addressKeyMap.get(address)
    if (!privateKey) continue

    input.unlockingBytecode = {
      compiler,
      data: {
        keys: { privateKeys: { key: privateKey } },
      },
      valueSatoshis: correspondingSourceOutput.valueSatoshis,
      script: 'unlock',
      token: correspondingSourceOutput.token,
    }
  }

  const generated = generateTransaction(template)
  if (!generated.success) {
    throw new Error('Failed to generate transaction: ' + JSON.stringify(generated.errors || generated))
  }
  const encoded = encodeTransaction(generated.transaction)
  return binToHex(encoded)
}
