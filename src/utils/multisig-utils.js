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

