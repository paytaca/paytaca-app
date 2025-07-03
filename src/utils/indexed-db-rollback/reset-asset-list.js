import { getWalletIndicesFromStorage } from "./wallet-recovery"

import initialAssetState from 'src/store/assets/state'
import { getAllAssets } from 'src/store/assets/getters';
import { Store } from "src/store";


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

  walletIndices.map(index => {
    
    const asset = getAllAssets(initialAssetState())
    Store.commit('assets/updateVault', { index: index, asset: asset })
    Store.commit('assets/updatedCurrentAssets', index)
  })

  window.localStorage.setItem(RESET_ASSETS_FLAG, true) // Mark rollback done
  console.log('Assets reset successfully')
}