import {
    decodeHdPublicKey,
    decodeHdPrivateKey,
    deriveHdPublicKey,
    deriveHdPathRelative,
    utf8ToBin,
    binToHex,
    sha256,
    secp256k1,
  } from 'bitauth-libauth-v3'

import { deriveHdKeysFromMnemonic } from './utils.js'

/**
 * BIP32 derivation path used for generating cosigner authentication public keys.
 * This path is derived from the signer's xpub to create a unique authentication key.
 * @constant {string}
 */
export const SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH = '999/0'

/**
 * Generates a coordination server signature for authentication purposes.
 * Creates both Schnorr and DER-encoded signatures of the message hash.
 * 
 * @param {Uint8Array} privateKey - The private key used for signing (32 bytes).
 * @param {string} message - The message to be signed.
 * @returns {string} Combined signature string in the format "schnorr=<hex>;der=<hex>".
 * 
 * @example
 * const privateKey = new Uint8Array(32); // Your private key
 * const message = 'authentication-message';
 * const signature = generateCoordinationServerSignature(privateKey, message);
 * // Returns: "schnorr=...;der=..."
 * 
 * @throws {Error} If signing operation fails.
 */
export function generateCoordinationServerSignature(privateKey, message) {
    const hash = sha256.hash(utf8ToBin(message))
    const schnorr = secp256k1.signMessageHashSchnorr(privateKey, hash)
    const der = secp256k1.signMessageHashDER(privateKey, hash)
    return `schnorr=${binToHex(schnorr)};der=${binToHex(der)}`
}

/**
 * Generates a coordination server identity from an extended private key (xprv).
 * Creates a server identity object containing the public key, a timestamped message,
 * and a signature for authentication.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.name - The name/identifier for the server identity.
 * @param {string} params.xprv - The extended private key in base58 format.
 * @returns {Object} Server identity object.
 * @returns {string} return.name - The server name.
 * @returns {string} return.publicKey - The public key in hexadecimal format.
 * @returns {string} return.message - The signed message in format "iam:<pubkey>:<timestamp>".
 * @returns {string} return.signature - The combined signature string.
 * 
 * @example
 * const identity = generateCoordinatorServerIdentityFromXprv({
 *   name: 'MyServer',
 *   xprv: 'xprv...'
 * });
 * // Returns: { name: 'MyServer', publicKey: '...', message: '...', signature: '...' }
 * 
 * @see generateCoordinationServerSignature
 */
export function generateCoordinatorServerIdentityFromXprv({ name, xprv }) {
    const { hdPublicKey } = deriveHdPublicKey(xprv)
    const privateKey = decodeHdPrivateKey(xprv).node.privateKey
    const publicKey  = decodeHdPublicKey(hdPublicKey).node.publicKey
    const message = `iam:${binToHex(publicKey)}:${Date.now()}`
    return {
      name,
      publicKey: binToHex(publicKey),
      message,
      signature: generateCoordinationServerSignature(privateKey, message)
    }
}

/**
 * Generates a coordination server identity from a mnemonic seed phrase.
 * Derives the HD private key from the mnemonic and creates a server identity.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.name - The name/identifier for the server identity.
 * @param {string} params.mnemonic - The BIP39 mnemonic seed phrase (12-24 words).
 * @param {string} [params.network='mainnet'] - The network type ('mainnet' or 'testnet').
 * @param {string} [params.hdPath="m/4501'/145'/0'/0'"] - The HD derivation path.
 * @returns {Object} Server identity object (see generateCoordinatorServerIdentityFromXprv).
 * 
 * @example
 * const identity = generateCoordinatorServerIdentityFromMnemonic({
 *   name: 'MyServer',
 *   mnemonic: 'abandon abandon abandon ...',
 *   network: 'mainnet'
 * });
 * 
 * @see generateCoordinatorServerIdentityFromXprv
 * @see deriveHdKeysFromMnemonic
 */
export function generateCoordinatorServerIdentityFromMnemonic({ name, mnemonic, network = 'mainnet', hdPath = `m/4501'/145'/0'/0'` }) {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath
    })
    return generateCoordinatorServerIdentityFromXprv({ name, xprv: hdPrivateKey, network })
}

/**
 * Generates authentication credentials for coordination server from an extended private key.
 * Creates HTTP headers containing the public key, signature, and message for server authentication.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.xprv - The extended private key in base58 format.
 * @returns {Object} Authentication headers object.
 * @returns {string} return['X-Auth-PubKey'] - The public key in hexadecimal format.
 * @returns {string} return['X-Auth-Signature'] - The combined signature string.
 * @returns {string} return['X-Auth-Message'] - The signed message in format "multisig:<timestamp>".
 * 
 * @example
 * const credentials = generateCoordinationServerCredentialsFromXprv({
 *   xprv: 'xprv...'
 * });
 * // Use in HTTP request:
 * // headers: { ...credentials }
 * 
 * @see generateCoordinationServerSignature
 */
export function generateCoordinationServerCredentialsFromXprv ({ xprv }) {
    const { hdPublicKey } = deriveHdPublicKey(xprv)
    const privateKey = decodeHdPrivateKey(xprv).node.privateKey
    const publicKey  = decodeHdPublicKey(hdPublicKey).node.publicKey
    const message = `multisig:${Date.now()}`
    return {
        'X-Auth-PubKey': binToHex(publicKey),
        'X-Auth-Signature': generateCoordinationServerSignature(privateKey, message),
        'X-Auth-Message': message,
    }
  }

/**
 * Generates authentication credentials for coordination server from a mnemonic seed phrase.
 * Derives the HD private key from the mnemonic and creates authentication headers.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.mnemonic - The BIP39 mnemonic seed phrase (12-24 words).
 * @param {string} [params.network='mainnet'] - The network type ('mainnet' or 'testnet').
 * @param {string} [params.hdPath="m/4501'/145'/0'/0'"] - The HD derivation path.
 * @returns {Object} Authentication headers object (see generateCoordinationServerCredentialsFromXprv).
 * 
 * @example
 * const credentials = generateCoordinationServerCredentialsFromMnemonic({
 *   mnemonic: 'abandon abandon abandon ...',
 *   network: 'mainnet'
 * });
 * 
 * @see generateCoordinationServerCredentialsFromXprv
 * @see deriveHdKeysFromMnemonic
 */
export function generateCoordinationServerCredentialsFromMnemonic ({ mnemonic, network = 'mainnet', hdPath = `m/4501'/145'/0'/0'` }) {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath 
    })
    return generateCoordinationServerCredentialsFromXprv({ xprv: hdPrivateKey })
}

/**
 * Generates a cosigner authentication public key from an extended public key (xpub).
 * Derives a unique public key at the SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH for authentication.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.xpub - The extended public key in base58 format.
 * @returns {string} The derived public key in hexadecimal format.
 * 
 * @example
 * const authPubKey = generateCosignerAuthPublicKeyFromFromXpub({
 *   xpub: 'xpub...'
 * });
 * // Returns: "02a1b2c3..."
 * 
 * @see SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH
 */
export function generateCosignerAuthPublicKeyFromFromXpub ({ xpub }) {
  const decodedHdPublicKey = decodeHdPublicKey(xpub)
  const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH) 
  return binToHex(publicKey)
}

/**
 * Generates cosigner authentication credentials from an extended private key.
 * Creates HTTP headers for authenticating as a cosigner in multisig operations.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.xprv - The extended private key in base58 format.
 * @returns {Object} Cosigner authentication headers object.
 * @returns {string} return['X-Auth-Cosigner-Auth-PubKey'] - The cosigner auth public key in hex.
 * @returns {string} return['X-Auth-Cosigner-Auth-Signature'] - The combined signature string.
 * @returns {string} return['X-Auth-Cosigner-Auth-Message'] - The signed message in format "multisig:cosigner-auth:<timestamp>".
 * 
 * @example
 * const credentials = generateCoordinationServerCosignerCredentialsFromXprv({
 *   xprv: 'xprv...'
 * });
 * // Use in HTTP request:
 * // headers: { ...credentials }
 * 
 * @see generateCosignerAuthPublicKeyFromFromXpub
 * @see generateCoordinationServerSignature
 * @see deriveCoordinationServerCosignerAuthPrivateKey
 */
export function generateCoordinationServerCosignerCredentialsFromXprv ({ xprv }) {
    const { hdPublicKey: xpub } = deriveHdPublicKey(xprv)
    const privateKey = deriveCoordinationServerCosignerAuthPrivateKey({ xprv })
    const message = `multisig:cosigner-auth:${Date.now()}`
    return {
        'X-Auth-Cosigner-Auth-PubKey': generateCosignerAuthPublicKeyFromFromXpub({ xpub }),
        'X-Auth-Cosigner-Auth-Signature': generateCoordinationServerSignature(privateKey, message),
        'X-Auth-Cosigner-Auth-Message': message,
    }
  }

/**
 * Generates cosigner authentication credentials from a mnemonic seed phrase.
 * Derives the HD private key from the mnemonic and creates cosigner auth headers.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.mnemonic - The BIP39 mnemonic seed phrase (12-24 words).
 * @param {string} [params.network='mainnet'] - The network type ('mainnet' or 'testnet').
 * @param {string} [params.hdPath="m/44'/145'/0'"] - The HD derivation path.
 * @returns {Object} Cosigner authentication headers object (see generateCoordinationServerCosignerCredentialsFromXprv).
 * 
 * @example
 * const credentials = generateCoordinationServerCosignerCredentialsFromMnemonic({
 *   mnemonic: 'abandon abandon abandon ...',
 *   network: 'mainnet'
 * });
 * 
 * @see generateCoordinationServerCosignerCredentialsFromXprv
 * @see deriveHdKeysFromMnemonic
 */
export function generateCoordinationServerCosignerCredentialsFromMnemonic ({ mnemonic, network = 'mainnet', hdPath = `m/44'/145'/0'` }) {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath 
    })
    return generateCoordinationServerCosignerCredentialsFromXprv({ xprv: hdPrivateKey })
}

/**
 * Derives the cosigner authentication private key from an extended private key.
 * Uses the SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH to derive a unique private key
 * for cosigner authentication purposes.
 * 
 * @param {Object} params - The parameters object.
 * @param {string} params.xprv - The extended private key in base58 format.
 * @returns {Uint8Array} The derived private key (32 bytes).
 * 
 * @example
 * const authPrivateKey = deriveCoordinationServerCosignerAuthPrivateKey({
 *   xprv: 'xprv...'
 * });
 * // Returns: Uint8Array(32) [...]
 * 
 * @see SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH
 */
export function deriveCoordinationServerCosignerAuthPrivateKey({ xprv }) {
  const decodedHdPrivateKey = decodeHdPrivateKey(xprv)
  const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH)
  return privateKey
}
