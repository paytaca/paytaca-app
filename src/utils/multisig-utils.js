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

export const getSignerWalletFromVault = ({ walletVault, xpub }) => {
    const vaultIndex = walletVault.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = walletVault[vaultIndex]
    return { wallet, vaultIndex }
}

export const getSignerXPrv = async ({ walletVault, xpub }) => {
    const signerWallet = getSignerWalletFromVault({ walletVault, xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    if (!mnemonic) return
    const hdKeys = deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
}

export const generateAuthCredentialsForFirstSignerWithPrivateKey = async ({ multisigWallet, walletVault }) => {
    let xprv = null
    let xpub = null
    for (const signerEntityId of Object.keys(multisigWallet.lockingData.hdKeys.hdPublicKeys)) {
        try {
            xpub = multisigWallet.lockingData.hdKeys.hdPublicKeys[signerEntityId]
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

export const generateAuthCredentialsForXPub = async ({ xpub, walletVault }) => {

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