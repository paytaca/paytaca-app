/**
 * MLS crypto utilities for Paytaca Chat.
 * Derives a deterministic Ed25519 MLS signing keypair and deterministic HPKE
 * init keys from the BCH wallet mnemonic (BIP39).
 *
 *   Nostr: m/44'/1237'/0'/0/0  -> secp256k1 (existing, unchanged)
 *   MLS:   m/44'/1237'/0'/0/1  -> Ed25519   (this module)
 *
 * HPKE init key IKMs are derived via HKDF from the master seed with
 * application-specific info strings, ensuring deterministic KeyPackages
 * across device restores.
 */

import { mnemonicToSeedSync } from 'bip39'
import {
  binToHex,
  deriveHdPath,
  deriveHdPrivateNodeFromSeed,
} from 'bitauth-libauth-v3'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'

const MLS_DERIVATION_PATH = "m/44'/1237'/0'/0/1"

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * Derive the deterministic Ed25519 MLS signing keypair from a BIP39 mnemonic.
 * The 32-byte HD private key is used directly as the Ed25519 private key seed.
 * @param {string} mnemonic - 12-word BIP39 seed phrase
 * @returns {{ publicKey: Uint8Array, privateKey: Uint8Array, publicKeyHex: string, privateKeyHex: string }}
 */
export function deriveMlsKeys(mnemonic) {
  const seed = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const masterNode = deriveHdPrivateNodeFromSeed(seed)
  const mlsNode = deriveHdPath(masterNode, MLS_DERIVATION_PATH)
  if (typeof mlsNode === 'string') throw new Error(mlsNode)

  const privateKey = new Uint8Array(mlsNode.privateKey)
  const publicKey = ed25519.getPublicKey(privateKey)

  return {
    publicKey,
    privateKey,
    publicKeyHex: binToHex(publicKey),
    privateKeyHex: binToHex(privateKey),
  }
}

export function deriveMlsHpkeIkms(mnemonic) {
  const seed = new Uint8Array(mnemonicToSeedSync(mnemonic))
  const initIkm = hkdf(sha256, seed, undefined, new TextEncoder().encode('paytaca-mls-init-key'), 32)
  const hpkeIkm = hkdf(sha256, seed, undefined, new TextEncoder().encode('paytaca-mls-hpke-key'), 32)
  return { initIkm, hpkeIkm }
}

export { hexToBytes }