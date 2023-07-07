import { loadWallet } from 'src/wallet'
import { computed, markRaw } from 'vue'
import { useStore } from 'vuex'

export async function loadP2PWalletInfo (walletInfo) {
  /**
   * Returns the wallet information needed for RampP2P processes
   */
  // const store = useStore()
  // const walletInfo = computed(() => store.getters['global/getWallet'](network)).value
  const wallet = await markRaw(loadWallet())
  const walletHash = wallet.BCH.getWalletHash()

  const { lastAddress, connectedAddressIndex } = walletInfo
  const privateKeyWif = await wallet.BCH.getPrivateKey(connectedAddressIndex)
  const publicKey = await wallet.BCH.getPublicKey(`0/${connectedAddressIndex}`)

  return {
    walletHash: walletHash,
    privateKeyWif: privateKeyWif,
    publicKey: publicKey,
    address: lastAddress
  }
}
