import { useStore } from 'vuex'
import { computed } from 'vue'
import { loadWallet } from 'src/wallet'
import { MultisigWallet, MultisigTransaction, getMultisigCashAddress } from 'src/lib/multisig'
import { useRoute, useRouter } from 'vue-router'
import Watchtower from 'src/lib/watchtower'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'

export const useMultisigHelpers = () => {
  const $store = useStore()
  const route = useRoute()
  const router = useRouter()

  const localWallets = computed(() => {
    return $store.getters['global/getVault']
  })

  const isChipnet = computed(() => {
    return $store.getters['global/isChipnet']
  })

  const txExplorerUrl = computed(() => {
    // TODO: get options from watchtower
    if (isChipnet.value) {
      return 'https://chipnet.chaingraph.cash/tx'
    }
    return 'https://blockchair.com/bitcoin-cash/transaction'
  })

  const cashAddressNetworkPrefix = computed(() => {
    if (isChipnet.value) {
      return CashAddressNetworkPrefix.testnet
    }
    return CashAddressNetworkPrefix.mainnet
  })

  const multisigWallets = computed(() => {
    const wallets = $store.getters['multisig/getWallets']?.map((w) => {
      const wallet = structuredClone(w)
      wallet.lockingData.hdKeys.addressIndex = 0
      const address = getMultisigCashAddress({
        ...wallet, cashAddressNetworkPrefix: cashAddressNetworkPrefix.value
      })
      return { ...wallet, address }
    })
    return wallets
  })

  const getSignerWalletFromVault = ({ xpub }) => {
    const vaultIndex = localWallets.value.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = localWallets.value[vaultIndex]
    return { wallet, vaultIndex }
  }

  const getSignerXPrv = async ({ xpub }) => {
    const signerWallet = getSignerWalletFromVault({ xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    if (!mnemonic) return
    const hdKeys = MultisigWallet.deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
  }

  const getSignerMnemonic = async ({ xpub }) => {
    const signerWallet = getSignerWalletFromVault({ xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    return mnemonic
  }

  /**
   * Among the signers, check which belongs to this Paytaca Wallet.
   * Use the first one found.
   * @returns {number|undefined} 1 if signer_1, 2 if signer_2, ...
   */
  const identifyPossiblePstCreator = async ({ signers }) => {
    for (const signerEntityIndex of Object.keys(signers)) {
      const walletFound = localWallets.value.find((signerWallet) => {
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

  const updateTransaction = async ({ index, multisigTransaction }) => {
    await $store.dispatch('multisig/updateTransaction', { index, multisigTransaction })
  }

  const saveMultisigWallet = async (multisigWallet) => {
    await $store.dispatch(
      'multisig/saveWallet',
      { multisigWallet }
    )
    const watchtower = new Watchtower($store.getters['global/isChipnet'])
    watchtower.subscribe({ address: multisigWallet.address })
  }

  const getMultisigWalletBchBalance = async (address) => {
    const watchtower = new Watchtower($store.getters['global/isChipnet'])
    const bch = await watchtower.getAddressBchBalance(address)
    return bch.balance
  }

  const getTransactionsByWalletAddress = ({ address }) => {
    const transactions =
         $store.getters['multisig/getTransactionsByWalletAddress']({
           address: address
         }).filter((transaction) => {
	   return transaction.metadata.address === address
	 }).map(transaction => structuredClone(transaction))
   return transactions     
  }

  return {
    localWallets,
    getSignerWalletFromVault,
    getSignerXPrv,
    getSignerMnemonic,
    identifyPossiblePstCreator,
    deleteTransaction,
    saveTransaction,
    updateTransaction,
    saveMultisigWallet,
    transactionsLastIndex,
    cashAddressNetworkPrefix,
    multisigWallets,
    getTransactionsByWalletAddress,
    getMultisigWalletBchBalance,
    txExplorerUrl
  }
}
