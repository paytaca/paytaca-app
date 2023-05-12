import { getBlockChainNetwork } from "src/wallet/chip"

export function ignoredAssets (state) {
  const network = getBlockChainNetwork()

  if (!Array.isArray(state.ignoredAssets[network])) return []
  return state.ignoredAssets[network]
}

export function ignoredTokenIds (state) {
  const network = getBlockChainNetwork()

  if (!Array.isArray(state.ignoredAssets[network])) return []
  return state.ignoredAssets[network]
    .map(asset => asset && asset.id)
    .filter(assetId => String(assetId).match(/^(slp|ct)\/([a-fA-F0-9]+)$/))
    .map(assetId => assetId.replace('slp/', ''))
    .map(assetId => assetId.replace('ct/', ''))
    .filter(Boolean)
}

export function getAssets (state) {
  return state.assets[getBlockChainNetwork()]
}

export function getAsset (state) {
  return function (id) {
    const network = getBlockChainNetwork()

    return state.assets[network].filter(function (asset) {
      if (asset && asset.id === id) {
        return asset
      }
    })
  }
}
