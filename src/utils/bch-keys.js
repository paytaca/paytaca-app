// HD keys, WIFs, addresses and signed messages on libauth, in place of what the app used from
// @psf/bch-js. Where bch-js was lenient or strict in a particular way, the same is kept here.
import {
  binToHex,
  CashAddressVersionByte,
  decodeBase58Address,
  decodeCashAddressFormat,
  decodeCashAddressVersionByte,
  decodeHdPublicKey,
  decodePrivateKeyWif,
  deriveHdPath,
  deriveHdPathRelative,
  deriveHdPrivateNodeFromSeed,
  deriveHdPublicNode,
  encodeBase58Address,
  encodeCashAddressFormat,
  encodeCashAddressVersionByte,
  encodeHdPublicKey,
  encodePrivateKeyWif,
  hash160,
  hexToBin,
  isHex,
  secp256k1,
} from 'bitauth-libauth-v3'
import { SignedMessage } from '../vendor/mainnet-js/message/signed.js'

// the prefixes bch-js could encode a cashaddr with
const ENCODABLE_PREFIXES = ['ecash', 'bitcoincash', 'simpleledger', 'etoken', 'ectest', 'bchtest', 'bchreg']
const PREFIXLESS_NETWORKS = ['bitcoincash', 'bchtest', 'bchreg']
const LEGACY_VERSIONS = {
  0x00: { prefix: 'bitcoincash', type: 0 },
  0x05: { prefix: 'bitcoincash', type: 1 },
  0x6f: { prefix: 'bchtest', type: 0 },
  0xc4: { prefix: 'bchtest', type: 1 },
}
const SLP_PREFIXES = { bitcoincash: 'simpleledger', simpleledger: 'simpleledger', bchtest: 'slptest', slptest: 'slptest' }
const CASH_PREFIXES = { bitcoincash: 'bitcoincash', simpleledger: 'bitcoincash', bchtest: 'bchtest', slptest: 'bchtest' }

/** HD node of a BIP39 seed, as bch-js's HDNode.fromSeed */
export function hdNodeFromSeed (seed) {
  return deriveHdPrivateNodeFromSeed(seed)
}

/**
 * Derives a path the way bch-js's node.derivePath did: from the master node when it starts with
 * "m", otherwise relative to the node, which may be public.
 */
export function deriveHdNode (node, path) {
  if (path.startsWith('m')) return deriveHdPath(node, path)
  return deriveHdPathRelative(node, path)
}

/** @returns {string} hex of the node's compressed public key */
export function hdNodeToPublicKey (node) {
  const publicKey = 'privateKey' in node ? deriveHdPublicNode(node).publicKey : node.publicKey
  return binToHex(publicKey)
}

export function hdNodeToWif (node) {
  return encodePrivateKeyWif(node.privateKey, 'mainnet')
}

export function hdNodeToCashAddress (node) {
  return publicKeyToCashAddress(hdNodeToPublicKey(node))
}

export function hdNodeToSlpAddress (node) {
  return toSlpAddress(hdNodeToCashAddress(node))
}

export function hdNodeToXPub (node) {
  const publicNode = 'privateKey' in node ? deriveHdPublicNode(node) : node
  return encodeHdPublicKey({ network: 'mainnet', node: publicNode }).hdPublicKey
}

export function hdNodeFromXPub (xpub) {
  const decoded = decodeHdPublicKey(xpub)
  if (typeof decoded === 'string') throw new Error(decoded)
  return decoded.node
}

// bch-js read only compressed keys, and testnet ones as testnet; an uncompressed mainnet WIF failed
function decodeWif (wif) {
  const decoded = decodePrivateKeyWif(wif)
  if (typeof decoded === 'string') throw new Error(decoded)
  if (decoded.type === 'mainnetUncompressed') throw new Error('Invalid network version')
  const compressed = !decoded.type.endsWith('Uncompressed')
  let publicKey = secp256k1.derivePublicKeyUncompressed(decoded.privateKey)
  if (compressed) publicKey = secp256k1.derivePublicKeyCompressed(decoded.privateKey)
  const prefix = decoded.type.startsWith('testnet') ? 'bchtest' : 'bitcoincash'
  return { publicKey, prefix }
}

/** @returns {string} hex of the WIF's public key */
export function wifToPublicKey (wif) {
  return binToHex(decodeWif(wif).publicKey)
}

export function wifToCashAddress (wif) {
  const { publicKey, prefix } = decodeWif(wif)
  return encodeCashAddressFormat({ prefix, version: CashAddressVersionByte.p2pkh, payload: hash160(publicKey) }).address
}

export function publicKeyToCashAddress (publicKeyHex) {
  return encodeCashAddressFormat({
    prefix: 'bitcoincash',
    version: CashAddressVersionByte.p2pkh,
    payload: hash160(hexToBin(publicKeyHex)),
  }).address
}

export function publicKeyToLegacyAddress (publicKeyHex) {
  const publicKey = isHex(publicKeyHex) ? hexToBin(publicKeyHex) : undefined
  if (!publicKey || !secp256k1.validatePublicKey(publicKey)) throw new Error(`Invalid public key: ${publicKeyHex}`)
  return encodeBase58Address('p2pkh', hash160(publicKey))
}

function decodeLegacyAddress (address) {
  const decoded = decodeBase58Address(address)
  if (typeof decoded === 'string' || decoded.payload.length !== 20) return
  const network = LEGACY_VERSIONS[decoded.version]
  if (!network) return
  return { ...network, payload: decoded.payload }
}

// bch-js took a cashaddr of any prefix, or without one for the given prefixes, of P2PKH or P2SH
// only, and in a single case including the prefix it added
function decodeAnyCashAddress (address, prefixesIfNone = PREFIXLESS_NETWORKS) {
  let candidates = [address]
  if (!address.includes(':')) candidates = prefixesIfNone.map(prefix => `${prefix}:${address}`)
  for (const candidate of candidates) {
    if (candidate !== candidate.toLowerCase() && candidate !== candidate.toUpperCase()) continue
    const decoded = decodeCashAddressFormat(candidate)
    if (typeof decoded === 'string') continue
    const version = decodeCashAddressVersionByte(decoded.version)
    if (typeof version === 'string' || version.length !== decoded.payload.length) continue
    if (version.typeBits !== 0 && version.typeBits !== 1) continue
    return { prefix: decoded.prefix.toLowerCase(), type: version.typeBits, payload: decoded.payload }
  }
}

function encode (prefix, type, payload) {
  if (!ENCODABLE_PREFIXES.includes(prefix)) throw new Error(`Invalid prefix: ${prefix}.`)
  const version = encodeCashAddressVersionByte(type, payload.length)
  return encodeCashAddressFormat({ prefix, version, payload }).address
}

export function isLegacyAddress (address) {
  return typeof address === 'string' && Boolean(decodeLegacyAddress(address))
}

export function isCashAddress (address) {
  return typeof address === 'string' && !decodeLegacyAddress(address) && Boolean(decodeAnyCashAddress(address))
}

/** a legacy address or cashaddr, with or without prefix, as a cashaddr with prefix */
export function toCashAddress (address) {
  const decoded = decodeLegacyAddress(address) || decodeAnyCashAddress(address)
  if (!decoded) throw new Error(`Unsupported address format : ${address}`)
  return encode(decoded.prefix, decoded.type, decoded.payload)
}

function decodeSlpCompatible (address) {
  const decoded = decodeLegacyAddress(address) || decodeAnyCashAddress(address, [...PREFIXLESS_NETWORKS, 'simpleledger', 'slptest'])
  if (!decoded || !SLP_PREFIXES[decoded.prefix]) return
  return decoded
}

export function isSlpAddress (address) {
  const decoded = typeof address === 'string' && decodeSlpCompatible(address)
  return Boolean(decoded) && SLP_PREFIXES[decoded.prefix] === decoded.prefix
}

/** a legacy, cash or SLP address as an SLP address, simpleledger: or slptest: */
export function toSlpAddress (address) {
  const decoded = decodeSlpCompatible(address)
  if (!decoded) throw new Error(`Invalid address: ${address}`)
  return encodeCashAddressFormat({
    prefix: SLP_PREFIXES[decoded.prefix],
    version: encodeCashAddressVersionByte(decoded.type, decoded.payload.length),
    payload: decoded.payload,
  }).address
}

/** a legacy, cash or SLP address as a cashaddr, bitcoincash: or bchtest:, as bch-js's SLP.Address.toCashAddress */
export function slpToCashAddress (address) {
  const decoded = decodeSlpCompatible(address)
  if (!decoded) throw new Error(`Invalid address: ${address}`)
  return encode(CASH_PREFIXES[decoded.prefix], decoded.type, decoded.payload)
}

/**
 * Signs a Bitcoin signed message with a compressed key, as bch-js's signMessageWithPrivKey but
 * measuring the message in bytes. The vendored signer writes compressed-key signatures only.
 */
export function signMessage (wif, message) {
  const decoded = decodePrivateKeyWif(wif)
  if (typeof decoded === 'string') throw new Error(decoded)
  if (decoded.type.endsWith('Uncompressed')) throw new Error('Signing with an uncompressed key is not supported')
  // bch-js refused anything but a string; the vendored signer would sign undefined as ''
  if (typeof message !== 'string') throw new Error('The message to sign must be a string')
  return SignedMessage.sign(message, decoded.privateKey).signature
}

/** Whether `signature` signs `message` with the key of `address`, a cashaddr or legacy address */
export function verifyMessage (address, signature, message) {
  try {
    return SignedMessage.verify(message, signature, toCashAddress(address)).valid
  } catch {
    return false
  }
}
