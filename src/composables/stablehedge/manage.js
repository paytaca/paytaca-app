import { Store } from "src/store";
import { getMnemonic } from "src/wallet";
import { StablehedgeWallet } from "src/wallet/stablehedge/wallet";

import { computed, ref, toValue } from "vue"

async function getStablehedgeWallet() {
  const $store = Store
  const walletIndex = $store.getters['global/getWalletIndex']
  const isChipnet = $store.getters['global/isChipnet']
  const mnemonic = await getMnemonic(walletIndex)
  const wallet = new StablehedgeWallet(
    mnemonic, undefined, isChipnet ? 'chipnet' : 'mainnet',
  )
  return wallet
}

/**
 * @param {import("vue").Ref<String> | String} tokenIdRefOrValue 
 */
export function useAuthguardTokenFetcher(tokenIdRefOrValue) {
  /** @type {import("vue").Ref<import("src/wallet/stablehedge/wallet").WatchtowerUtxo>} */
  const authTokenUtxo = ref()
  const hasAuthToken = computed(() => {
    const tokenId = toValue(tokenIdRefOrValue)
    if (!authTokenUtxo.value?.tokenid) return false
    return authTokenUtxo.value?.tokenid === tokenId
  })
  async function getAuthTokenUtxo() {
    const authTokenId = toValue(tokenIdRefOrValue)
    if (!authTokenId) authTokenUtxo.value = null

    const wallet = await getStablehedgeWallet()
    const utxos = await wallet.getUtxos(authTokenId, true)
    authTokenUtxo.value = utxos[0]
  }

  return {
    getStablehedgeWallet,
    authTokenUtxo,
    hasAuthToken,
    getAuthTokenUtxo,
  }
}
