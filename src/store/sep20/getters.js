export function getAssets (state) {
  return state.assets
}

export function getNftAssets(state) {
  return state.nftAssets
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

export function getTestnetAssets (state) {
  return state.testnetAssets
}

export function getTestnetNftAssets(state) {
  return state.testnetNftAssets
}

export function getTestnetAsset (state) {
  return function (id) {
    return state.testnetAssets.filter(function (testnetAsset) {
      if (testnetAsset && testnetAsset.id === id) {
        return testnetAsset
      }
    })
  }
}
