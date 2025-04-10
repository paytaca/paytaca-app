import { useStore } from 'vuex'
import { computed } from 'vue'
import { loadWallet } from 'src/wallet'
import { MultisigWallet } from 'src/lib/multisig'

export const useMultisigHelpers = () => {
  const $store = useStore()
  const signerWallets = computed(() => {
    return $store.getters['global/getVault']
  })

  const getSignerWalletFromVault = ({ xpub }) => {
    const walletVaults = $store.getters['global/getVault']
    const vaultIndex = walletVaults.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = walletVaults[vaultIndex]
    return { wallet, vaultIndex }
  }

  const getSignerXPrv = async ({ xpub }) => {
    const signerWallet = getSignerWalletFromVault({ xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    const hdKeys = MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
  }

  return {
    signerWallets,
    getSignerWalletFromVault,
    getSignerXPrv
  }
}
