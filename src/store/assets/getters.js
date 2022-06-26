export function ignoredAssets (state) {
  if (!Array.isArray(state.ignoredAssets)) return []
  return state.ignoredAssets
}

export function ignoredTokenIds (state) {
  if (!Array.isArray(state.ignoredAssets)) return []
  return state.ignoredAssets
    .map(asset => asset && asset.id)
    .filter(assetId => String(assetId).match(/^slp\/([a-fA-F0-9]+)$/))
    .map(assetId => assetId.replace('slp/', ''))
    .filter(Boolean)
}

export function getAssets (state) {
  return state.assets
}

export function getAsset (state) {
  return function (id) {
    return state.assets.filter(function (asset) {
      if (asset && asset.id === id) {
        return asset
      }
    })
  }
}
