import {
    decodeHdPrivateKey,
    decodeHdPublicKey,
    deriveHdPathRelative,
    utf8ToBin,
    binToHex,
    sha256,
    secp256k1
} from 'bitauth-libauth-v3'
import { loadWallet } from 'src/wallet'
import { deriveHdKeysFromMnemonic } from 'src/lib/multisig'

export function getSignerWalletFromVault ({ walletVault, xpub }) {
    const vaultIndex = walletVault.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = walletVault[vaultIndex]
    return { wallet, vaultIndex }
}

export async function getSignerXPrv ({ walletVault, xpub }) {
    const signerWallet = getSignerWalletFromVault({ walletVault, xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    if (!mnemonic) return
    const hdKeys = deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
}

/**
 * Creates a resolver function that can resolve an xprv from a given xpub.
 *
 * @param {Object} context - Optional context or dependencies used for resolution
 *   (e.g., key storage, wallet info, or API client).
 * @returns {(xpub: string) => string | Promise<string>} 
 *   A function that takes an xpub and returns the corresponding xprv
 *  
 */
export function createXprvFromXpubResolver ({ walletVault }) {
    return async ({ xpub }) => {
        const xprv = await getSignerXPrv({
            walletVault, xpub })
        return xprv
    }
}

/**
 * !!! Generates credential for the multisig coordination server (Watchtower) 
 */
export async function generateAuthCredentialsForFirstSignerWithPrivateKey ({ signers, walletVault }) {
    let xprv = null
    let xpub = null
    for (const signer of signers) {
        try {
            xpub = signer.xpub
            xprv = await getSignerXPrv({
                walletVault,
                xpub
            })
            if (xprv) {
                break
            }
        } catch (e) {
            console.log(e)
        } 
    }

    if (xprv && xpub) {
        const decodedPrivateKey = decodeHdPrivateKey(xprv)
        const decodedPublicKey = decodeHdPublicKey(xpub)
        const privateKey = deriveHdPathRelative(decodedPrivateKey.node, '0')
        const publicKey = deriveHdPathRelative(decodedPublicKey.node, '0')
        const rawMessage = `multisig:${Date.now()}`
        const message = utf8ToBin(rawMessage);
        const hash = sha256.hash(message)
        const schnorr = secp256k1.signMessageHashSchnorr(privateKey.privateKey, hash)
        const der = secp256k1.signMessageHashDER(privateKey.privateKey, hash)
        return {
            'X-Auth-PubKey': binToHex(publicKey.publicKey),
            'X-Auth-Signature': `schnorr=${binToHex(schnorr)};der=${binToHex(der)}`,
            'X-Auth-Message': rawMessage
        }
    }
    return {}
}

export async function generateAuthCredentialsForXPub ({ xpub, walletVault }) {

    const xprv = await getSignerXPrv({
        walletVault,
        xpub
    })

    if (xprv && xpub) {
        const decodedPrivateKey = decodeHdPrivateKey(xprv)
        const decodedPublicKey = decodeHdPublicKey(xpub)
        const privateKey = deriveHdPathRelative(decodedPrivateKey.node, '0')
        const publicKey = deriveHdPathRelative(decodedPublicKey.node, '0')
        const rawMessage = `multisig:${Date.now()}`
        const message = utf8ToBin(rawMessage);
        const hash = sha256.hash(message)
        const schnorr = secp256k1.signMessageHashSchnorr(privateKey.privateKey, hash)
        const der = secp256k1.signMessageHashDER(privateKey.privateKey, hash)
        return {
            'X-Auth-PubKey': binToHex(publicKey.publicKey),
            'X-Auth-Signature': `schnorr=${binToHex(schnorr)};der=${binToHex(der)}`,
            'X-Auth-Message': rawMessage
        }
    }
    return {}
}