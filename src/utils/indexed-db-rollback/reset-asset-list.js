import { getWalletIndicesFromStorage, resetAssetsList } from "./wallet-recovery"

const RESET_ASSETS_FLAG = 'asset-list-reset'

export async function resetWalletsAssetsList() {
  const alreadyReset = window.localStorage.getItem(RESET_ASSETS_FLAG)
  if (Boolean(alreadyReset) === true) {
      console.log('Assets already reset:', alreadyReset)
      return
  }
  const walletIndices = await getWalletIndicesFromStorage()
  console.log('[Assets List Reset] walletIndices found:', walletIndices);

  // Only recover the last 30 wallet indices
  if (walletIndices.length > 30) {
      walletIndices.splice(0, walletIndices.length - 30)
  }

  walletIndices.map(index => resetAssetsList(index))

  window.localStorage.setItem(RESET_ASSETS_FLAG, true) // Mark rollback done
  console.log('Assets reset successfully')
}