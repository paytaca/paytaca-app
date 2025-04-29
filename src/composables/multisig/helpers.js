import { useStore } from 'vuex'
import { computed } from 'vue'
import { loadWallet } from 'src/wallet'
import { MultisigWallet } from 'src/lib/multisig'
import { useRoute, useRouter } from 'vue-router'

export const useMultisigHelpers = () => {
  const $store = useStore()
  const route = useRoute()
  const router = useRouter()
  const signerWallets = computed(() => {
    return $store.getters['global/getVault']
  })

  const getSignerWalletFromVault = ({ xpub }) => {
    const vaultIndex = signerWallets.value.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = signerWallets.value[vaultIndex]
    return { wallet, vaultIndex }
  }

  const getSignerXPrv = async ({ xpub }) => {
    const signerWallet = getSignerWalletFromVault({ xpub })
    console.log('🚀 ~ getSignerXPrv ~ signerWallet:', xpub, signerWallet)
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    if (!mnemonic) return
    const hdKeys = MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
  }

  /**
   * Among the signers, check which belongs to this Paytaca Wallet.
   * Use the first one found.
   * @returns {number|undefined} 1 if signer_1, 2 if signer_2, ...
   */
  const identifyPossiblePstCreator = async ({ signers }) => {
    for (const signerEntityIndex of Object.keys(signers)) {
      const walletFound = signerWallets.value.find((signerWallet) => {
        return signerWallet.wallet.bch.xPubKey === signers[signerEntityIndex].xpub
      })
      if (walletFound) {
        return signerEntityIndex
      }
    }
    return undefined
  }

  const transactionsLastIndex = computed(() => {
    return $store.getters['multisig/getTransactionsLastIndex']
  })

  const deleteTransaction = async () => {
    await $store.dispatch(
      'multisig/deleteTransaction',
      { index: route.params.index }
    )
    router.back()
  }

  const saveTransaction = async (multisigTransaction) => {
    await $store.dispatch(
      'multisig/saveTransaction',
      multisigTransaction
    )
  }

  return {
    signerWallets,
    getSignerWalletFromVault,
    getSignerXPrv,
    identifyPossiblePstCreator,
    deleteTransaction,
    saveTransaction,
    transactionsLastIndex
  }
}
