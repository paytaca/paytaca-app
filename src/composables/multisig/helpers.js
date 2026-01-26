import { useStore } from 'vuex'
import { computed } from 'vue'
import { loadWallet } from 'src/wallet'
import { getMultisigCashAddress, getLockingBytecode, deriveHdKeysFromMnemonic, MultisigWallet } from 'src/lib/multisig'
import { useRoute, useRouter } from 'vue-router'
import Watchtower from 'src/lib/watchtower'
import { CashAddressNetworkPrefix, binToHex } from 'bitauth-libauth-v3'
import { getBcmrBackend } from 'src/wallet/cashtokens'
import { WatchtowerCoordinationServer, WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { createXprvFromXpubResolver } from 'src/utils/multisig-utils'

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

  const network = computed(() => {
    return isChipnet.value ? WatchtowerNetwork.chipnet : WatchtowerNetwork.mainnet
  })

  const multisigCoordinationServer = computed(() => {
    return new WatchtowerCoordinationServer({
      network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
    })
  })

  const multisigNetworkProvider = computed(() => {
    return new WatchtowerNetworkProvider({
      network: $store.getters['global/isChipnet'] ? WatchtowerNetwork.chipnet: WatchtowerNetwork.mainnet 
    })
  })

  const resolveXPrvOfXpub = computed(() => {
    return createXprvFromXpubResolver({
      walletVault: $store.getters['global/getVault']
    })
  })

  const txExplorerUrl = computed(() => {
    // TODO: get options from watchtower
    if (isChipnet.value) {
      return 'https://chipnet.chaingraph.cash/tx'
    }
    return 'https://explorer.paytaca.com/tx'
  })

  const cashAddressNetworkPrefix = computed(() => {
    if (isChipnet.value) {
      return CashAddressNetworkPrefix.testnet
    }
    return CashAddressNetworkPrefix.mainnet
  })

  const multisigWallets = computed(() => {
    const wallets = $store.getters['multisig/getWallets']?.map((w) => {
      return MultisigWallet.importFromObject(w, {
        store: $store,
        provider: multisigNetworkProvider.value,
        coordinationServer: multisigCoordinationServer.value,
        resolveXprvOfXpub: resolveXPrvOfXpub.value
      })
    })
    return wallets
  })

  // transactions.send
  const getSignerWalletFromVault = ({ xpub }) => {
    const vaultIndex = localWallets.value.findIndex((signerWallet) => {
      return signerWallet.wallet.bch.xPubKey === xpub
    })
    if (vaultIndex === -1) return
    const wallet = localWallets.value[vaultIndex]
    return { wallet, vaultIndex }
  }

  const getSignerMnemonic = async ({ xpub }) => {
    const signerWallet = getSignerWalletFromVault({ xpub })
    if (!signerWallet) return
    const { mnemonic } = await loadWallet('BCH', signerWallet.vaultIndex)
    return mnemonic
  }

  const getSignerXPrv = async ({ xpub }) => {
    const mnemonic = await getSignerMnemonic({ xpub })
    const hdKeys = deriveHdKeysFromMnemonic({ mnemonic })
    if (xpub !== hdKeys.hdPublicKey) return
    return hdKeys.hdPrivateKey
  }

  /**
   * Retrieves token details from existing assets cache or Paytaca's BCMR indexer
   * @param {string} category - The token category/token id
   * @returns {{
   *   name: string
   *   description?: string,
   *   uris?: {
   *     icon: string
   *   },
   *   token: {
   *    category: string,
   *    symbol: string,
   *    decimals?: number
   *  }
   * }} - A partial BCMR IdentitySnapshot, only the basic token details
   * 
   */
  const getAssetTokenIdentity = async (category) => {
    const assetTokenDetailsFromAssetsVault = $store.state?.assets?.assets?.find(cachedAssetDetail => {
      return cachedAssetDetail.id.includes(category)
    })

    let cashtokenIdentity = null

    if (assetTokenDetailsFromAssetsVault) {
      cashtokenIdentity = {
        name: assetTokenDetailsFromAssetsVault.name,
        description: assetTokenDetailsFromAssetsVault.description,
        uris: {
          icon: assetTokenDetailsFromAssetsVault.logo
        },
        token: {
          category,
          symbol: assetTokenDetailsFromAssetsVault.symbol,
          decimals: assetTokenDetailsFromAssetsVault.decimals   
        }
      }
    }

    if (!cashtokenIdentity) {
      cashtokenIdentity = $store.state?.global?.cache?.cashtokenIdentities?.[category]
    }

    if (!cashtokenIdentity) {
      const response =  await getBcmrBackend().get(`tokens/${category}`)
      if (response?.data?.token?.category !== category) return // sanity check
      if (response?.data) {
        cashtokenIdentity = JSON.parse(JSON.stringify(response.data))
        $store.commit('global/cacheCashtokenIdentity', { category, cashtokenIdentity })
      }
    }

    return cashtokenIdentity
  }

  return {
    localWallets,
    getSignerWalletFromVault,
    getSignerMnemonic,
    getSignerXPrv,
    cashAddressNetworkPrefix,
    multisigWallets,
    txExplorerUrl,
    getAssetTokenIdentity,
    multisigNetworkProvider: multisigNetworkProvider.value,
    multisigCoordinationServer: multisigCoordinationServer.value,
    resolveXprvOfXpub: resolveXPrvOfXpub.value,
    network: network.value
  }
}
