export function updateAssetBalance (state, data) {
  for (let i = 0; i < state.assets.length; i++) {
    const asset = state.assets[i]
    if (asset && asset.id === data.id) {
      state.assets[i].balance = data.balance
      break
    }
  }
}

export function addNewAsset (state, asset) {
  state.assets.push(asset)
}

export function removeAsset (state, assetId) {
  let assetIndex
  state.assets.map(function (asset, index) {
    if (asset && asset.id === assetId) {
      assetIndex = index
    }
  })
  if (assetIndex) {
    state.assets.splice(assetIndex, 1)
  }
}

export function addNewNftAsset (state, asset) {
  state.nftAssets.push(asset)
}

export function removeNftAsset (state, nftContractAddress) {
  state.nftAssets = state.nftAssets
    .filter(nftAsset => {
      return nftAsset && nftAsset.address !== nftContractAddress
    })
}
