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

export const SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH = '999/0'

export const generateCoordinationServerSignature = (privateKey, message) => {
    const hash = sha256.hash(utf8ToBin(message))
    const schnorr = secp256k1.signMessageHashSchnorr(privateKey, hash)
    const der = secp256k1.signMessageHashDER(privateKey, hash)
    return `schnorr=${binToHex(schnorr)};der=${binToHex(der)}`
}
  
export const generateCoordinatorServerIdentityFromXprv = ({ name, xprv }) => {
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
  
export const generateCoordinatorServerIdentityFromMnemonic = ({ name, mnemonic, network = 'mainnet', hdPath = `m/4501'/145'/0'/0'` }) => {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath
    })
    return generateCoordinatorServerIdentityFromXprv({ name, xprv: hdPrivateKey, network })
}
  
export const generateCoordinationServerCredentialsFromXprv = ({ xprv }) => {
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

export const generateCoordinationServerCredentialsFromMnemonic = ({ mnemonic, network = 'mainnet', hdPath = `m/4501'/145'/0'/0'` }) => {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath 
    })
    return generateCoordinationServerCredentialsFromXprv({ xprv: hdPrivateKey })
}

export const generateCosignerAuthPublicKeyFromFromXpub = ({ xpub }) => {
  const decodedHdPublicKey = decodeHdPublicKey(xpub)
  const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH) 
  return binToHex(publicKey)
}

export const generateCoordinationServerCosignerCredentialsFromXprv = ({ xprv }) => {
    const decodedHdPrivateKey = decodeHdPrivateKey(xprv)
    const { hdPublicKey: xpub } = deriveHdPublicKey(xprv)
    const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, SIGNER_AUTH_PUBLIC_KEY_RELATIVE_PATH)
    const message = `multisig:cosigner-auth:${Date.now()}`
    return {
        'X-Auth-Cosigner-Auth-PubKey': generateCosignerAuthPublicKeyFromFromXpub({ xpub }),
        'X-Auth-Cosigner-Auth-Signature': generateCoordinationServerSignature(privateKey, message),
        'X-Auth-Cosigner-Auth-Message': message,
    }
  }

export const generateCoordinationServerCosignerCredentialsFromMnemonic = ({ mnemonic, network = 'mainnet', hdPath = `m/44'/145'/0'` }) => {
    const { hdPrivateKey } = deriveHdKeysFromMnemonic({ 
      mnemonic,
      network, 
      hdPath 
    })
    return generateCoordinationServerCosignerCredentialsFromXprv({ xprv: hdPrivateKey })
}
  