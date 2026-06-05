import { 
    decodeHdPublicKey, 
    deriveHdPathRelative, 
    decodeHdPrivateKey,
    binToHex,
    deriveHdPublicNode,
    deriveHdPrivateNodeFromSeed,
    deriveSeedFromBip39Mnemonic,
    bigIntToVmNumber,
    hash160
} from 'bitauth-libauth-v3'

/** 
 * Derives a public key from an extended public key at a relative derivation path.
 * @param {string} xpub - The extended public key
 * @param {string} relativeDerivationPath - The relative derivation path (e.g., '0/1') 
 * @returns {Uint8Array} The public key at the provided Bip32 relative derivation path. 
 */
export const derivePublicKey = (xpub, relativeDerivationPath) => {
    const decodedHdPublicKey = decodeHdPublicKey(xpub, relativeDerivationPath)
    const { publicKey } = deriveHdPathRelative(decodedHdPublicKey.node, relativeDerivationPath)
    return publicKey
}

/**
 * Derives public keys for all signers at a given derivation path.
 * @param {Object} params
 * @param {MultisigWalletSigner[]} params.signers
 * @param {string} [params.addressDerivationPath='0/0']
 * @param {boolean} [params.bip67Sort] - Whether to sort the signers by their derived public keys using BIP-67 lexicographic ordering. Defaults to true.
 * @returns {MultisigWalletSigner[]} The multisig wallet signers with publicKey at `addressDerivationPath` set
 */
export const derivePublicKeys = ({ signers, addressDerivationPath, bip67Sort = true }) => {
    const _signers = structuredClone(signers)
    const signersWithPublicKeys = _signers.map(signer => {
      signer.publicKey = binToHex(derivePublicKey(signer.xpub, addressDerivationPath))
      signer.addressDerivationPath = addressDerivationPath
      return signer
    })
  
    if (!bip67Sort) return signersWithPublicKeys
  
    signersWithPublicKeys.sort((signerA, signerB) => {
      return signerA.publicKey.localeCompare(signerB.publicKey)
    })
    return signersWithPublicKeys
  
  }
   
/**
 * Derives a private key from an extended private key at a relative derivation path.
 * @param {string} xprv - The extended private key
 * @param {string} relativeDerivationPath - The relative derivation path (e.g., '0/1')
 * @returns {Uint8Array} The derived private key
 */
export const derivePrivateKey = (xprv, relativeDerivationPath) => {
    const decodedHdPrivateKey = decodeHdPrivateKey(xprv, relativeDerivationPath)
    const { privateKey } = deriveHdPathRelative(decodedHdPrivateKey.node, relativeDerivationPath)
    return privateKey
}

/**
 * @returns 1st 4 bytes of the hash160 of the master public key
 */
export const getMasterFingerprint = (mnemonic) => {
    return hash160(
      deriveHdPublicNode(
        deriveHdPrivateNodeFromSeed(
          deriveSeedFromBip39Mnemonic(mnemonic)
        )).publicKey
      ).slice(0, 4)
  }
   
/**
 * @returns {Uint8Array} 1st 4 bytes of the hash160 of the master public key in UintLE 
 */
export const getMasterFingerprintUintLE = (mnemonic) => {
  return bigIntToVmNumber(
    BigInt(
        parseInt(
          binToHex(getMasterFingerprint(mnemonic)), 
          16
        )
      )
  )
}


/**
 * Sorts public keys using BIP-67 lexicographic ordering.
 * @param {Array<Uint8Array|string>} publicKeys - Array of public keys (hex string or Uint8Array)
 * @returns {Array} Sorted public keys
 */
export const sortPublicKeysBip67 = (publicKeys) => {
  return publicKeys.sort((publicKeyA, publicKeyB) => {
    return binToHex(publicKeyA).localeCompare(binToHex(publicKeyB))
  })
}