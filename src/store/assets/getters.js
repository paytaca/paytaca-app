import { getBlockChainNetwork } from "src/wallet/chipnet"

export function ignoredAssets (state) {
  const network = getBlockChainNetwork()

  if (network === 'chip') {
    return state.chipnet__ignoredAssets
  }
  return state.ignoredAssets
}

export function ignoredTokenIds (state) {
  const network = getBlockChainNetwork()
  let _ignoredAssets = state.ignoreAssets
  if (network === 'chipnet') {
    ignoreAssets = state.chipnet__ignoredAssets
  }

  if (!Array.isArray(_ignoredAssets)) return []
  return state.ignoredAssets[network]
    .map(asset => asset && asset.id)
    .filter(assetId => String(assetId).match(/^(slp|ct)\/([a-fA-F0-9]+)$/))
    .map(assetId => assetId.replace('slp/', ''))
    .map(assetId => assetId.replace('ct/', ''))
    .filter(Boolean)
}

export function getAssets (state) {
  const network = getBlockChainNetwork()
  if (network === 'chipnet') {
    return state.chipnet__assets
  }
  return state.assets
}

export function getAsset (state) {
  return function (id) {
    const network = getBlockChainNetwork()
    let assets = state.assets
    if (network === 'chipnet') {
      assets = state.chipnet__assets
    }

    return assets.filter(function (asset) {
      if (asset && asset.id === id) {
        return asset
      }
    })
  }
}
