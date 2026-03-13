import { useStore } from 'vuex'
import { computed } from 'vue'
import { getMnemonic, loadWallet } from 'src/wallet'
import { deriveHdKeysFromMnemonic, getMasterFingerprint, MultisigWallet } from 'src/lib/multisig'
import { CashAddressNetworkPrefix } from 'bitauth-libauth-v3'
import { getBcmrBackend } from 'src/wallet/cashtokens'
import { WatchtowerCoordinationServer, WatchtowerNetwork, WatchtowerNetworkProvider } from 'src/lib/multisig/network'
import { binToHex } from '@bitauth/libauth'

export const useMultisigHelpers = () => {
  const $store = useStore()

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

  const getWalletsFromVault = async () => {
    const vault = $store.getters["global/getVault"]
    const wallets = []
    for (const index of vault.keys()) {
      const m = await getMnemonic(index)
      const masterFingerprint = binToHex(getMasterFingerprint(m))
      const wallet = {
        name: vault[index].name,
        mnemonic: m,
        masterFingerprint,
        deleted: vault[index].deleted
      }
      const { hdPrivateKey: xprv, hdPublicKey: xpub } = deriveHdKeysFromMnemonic({ mnemonic: m, network: 'mainnet', hdPath: vault[index]?.wallet?.derivationPath })
      wallet.xpub = xpub 
      wallet.xprv = xprv
      wallets[index] = wallet
    }
    return wallets
  }

  const resolveXprvOfXpub = computed(() => {
    return async ({ xpub }) => {
      const wallets = await getWalletsFromVault()
      return wallets.find(w => w.xpub === xpub)?.xprv
    }
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
        resolveXprvOfXpub: resolveXprvOfXpub.value,
        resolveMnemonicOfXpub,
      })
    })
    return wallets
  })

  const getSignerWalletFromVault = async ({ xpub }) => {
    const wallets = await getWalletsFromVault()
    return wallets.find(w => w.xpub === xpub)
  }

  const resolveMnemonicOfXpub = async ({ xpub }) => {
    const wallets = await getWalletsFromVault()
    return wallets.find(w => w.xpub === xpub)?.mnemonic
  }

  const getSignerXPrv = async ({ xpub }) => {
    const mnemonic = await resolveMnemonicOfXpub({ xpub })
    if (!mnemonic) return
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
    getWalletsFromVault,
    getSignerWalletFromVault,
    resolveMnemonicOfXpub,
    getSignerXPrv,
    cashAddressNetworkPrefix,
    multisigWallets,
    txExplorerUrl,
    getAssetTokenIdentity,
    multisigNetworkProvider: multisigNetworkProvider.value,
    multisigCoordinationServer: multisigCoordinationServer.value,
    resolveXprvOfXpub: resolveXprvOfXpub.value,
    network: network.value
  }
}
