import { useStore } from 'vuex'
import { computed } from 'vue'
import { loadWallet } from 'src/wallet'
import { getMultisigCashAddress, getLockingBytecode, deriveHdKeysFromMnemonic, MultisigWallet } from 'src/lib/multisig'
import { useRoute, useRouter } from 'vue-router'
import Watchtower from 'src/lib/watchtower'
import { CashAddressNetworkPrefix, binToHex } from 'bitauth-libauth-v3'

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
      return MultisigWallet.importFromObject(w)
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
    const hdKeys = deriveHdKeysFromMnemonic({ mnemonic })
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

  const saveTransaction = async (multisigTransaction) => {
    await $store.dispatch(
      'multisig/saveTransaction',
      multisigTransaction
    )
  }

  const updateTransaction = async ({ index, multisigTransaction }) => {
    await $store.dispatch('multisig/updateTransaction', { index, multisigTransaction })
  }

  const getMultisigWalletBchBalance = async (address) => {
    const watchtower = new Watchtower($store.getters['global/isChipnet'])
    const response = await watchtower.getAddressBchBalance(address)
    return response?.data?.balance
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

  const getTransactionsByMultisigWallet = (wallet) => {
    const lockingBytecodeHex = binToHex(getLockingBytecode({ template: wallet.template, lockingData: wallet.lockingData}).bytecode)
    return $store.getters['multisig/getTransactionsByLockingBytecode']({ lockingBytecodeHex})
  }

  return {
    localWallets,
    getSignerWalletFromVault,
    getSignerXPrv,
    getSignerMnemonic,
    identifyPossiblePstCreator,
    saveTransaction,
    updateTransaction,
    transactionsLastIndex,
    cashAddressNetworkPrefix,
    multisigWallets,
    getTransactionsByWalletAddress,
    getTransactionsByMultisigWallet,
    getMultisigWalletBchBalance,
    txExplorerUrl
  }
}
