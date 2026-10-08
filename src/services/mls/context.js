import {
  getCiphersuiteFromName,
  getCiphersuiteImpl,
  defaultLifetime,
} from 'ts-mls'
import { ciphersuites } from 'ts-mls/crypto/ciphersuite.js'
import { defaultClientConfig } from 'ts-mls/clientConfig.js'
import { ed25519 } from '@noble/curves/ed25519.js'

const CIPHERSUITE = 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519'

// Force pure-JS noble Ed25519 signing. ts-mls' default prefers WebCrypto
// (globalThis.crypto.subtle) which produces NON-deterministic Ed25519
// signatures on some mobile WebViews — making every generated KeyPackage get
// a different ref even though the keys are deterministic, which breaks
// welcome/invite matching. noble Ed25519 is RFC 8032 deterministic.
// Map ts-mls' (signKey, message) arg order onto noble's (message, privateKey).
const NOBLE_ED25519 = {
  async sign(signKey, message) {
    return ed25519.sign(message, signKey)
  },
  async verify(publicKey, message, signature) {
    return ed25519.verify(signature, message, publicKey)
  },
  async keygen() {
    const signKey = ed25519.utils.randomSecretKey()
    return { signKey, publicKey: ed25519.getPublicKey(signKey) }
  },
}

// Deterministic capabilities WITHOUT grease. ts-mls' defaultCapabilities()
// injects random GREASE values (RFC 8701) into the capabilities arrays via
// Math.random(), which makes the KeyPackage bytes non-deterministic across
// app runs. That breaks key-package ref matching (the welcome can never be
// decrypted). Using a fixed set keeps every generated KeyPackage byte-stable.
//
// extensions: [0xf2ee] and proposals: [2 (update)] advertise NIP-EE/Marmot
// compatibility: nostr_group_data must be advertised so we can join OPTN
// groups that require it, and our own groups require it via
// required_capabilities. Numeric extension/proposal types are used because
// 0xf2ee has no named constant in stock ts-mls.
export const NOSTR_GROUP_DATA_EXT_TYPE = 0xf2ee
const FIXED_CAPABILITIES = {
  versions: ['mls10'],
  ciphersuites: Object.keys(ciphersuites),
  extensions: [NOSTR_GROUP_DATA_EXT_TYPE],
  proposals: [2],
  credentials: ['basic', 'x509'],
}

let _impl = null
let _capabilities = null
let _clientConfig = null

export async function ensureMlsCrypto() {
  if (!_impl) {
    const cs = getCiphersuiteFromName(CIPHERSUITE)
    _impl = await getCiphersuiteImpl(cs)
    _impl.signature = NOBLE_ED25519
    _capabilities = FIXED_CAPABILITIES
    _clientConfig = defaultClientConfig
  }
  return { impl: _impl, capabilities: _capabilities, clientConfig: _clientConfig, ciphersuiteName: CIPHERSUITE }
}

export function getMlsCrypto() {
  if (!_impl) throw new Error('MLS crypto not initialized — call ensureMlsCrypto() first')
  return { impl: _impl, capabilities: _capabilities, clientConfig: _clientConfig, ciphersuiteName: CIPHERSUITE }
}

export { defaultLifetime, defaultClientConfig }