export function updateAssetBalance (state, data) {
  for (let i = 0; i < state.assets.length; i++) {
    const asset = state.assets[i]
    if (asset && asset.id === data.id) {
      state.assets[i].balance = data.balance
      break
    }
  }
}

export function updateTestnetAssetBalance (state, data) {
  for (let i = 0; i < state.testnetAssets.length; i++) {
    const asset = state.testnetAssets[i]
    if (asset && asset.id === data.id) {
      state.testnetAssets[i].balance = data.balance
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

export function addNewTestnetAsset (state, testnetAsset) {
  state.testnetAssets.push(testnetAsset)
}

export function removeTestnetAsset (state, assetId) {
  let assetIndex
  state.testnetAssets.map(function (testnetAsset, index) {
    if (testnetAsset && testnetAsset.id === assetId) {
      assetIndex = index
    }
  })
  if (assetIndex) {
    state.testnetAssets.splice(assetIndex, 1)
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

export function addNewTestnetNftAsset (state, testnetNftAsset) {
  state.testnetNftAssets.push(testnetNftAsset)
}

export function removeTestnetNftAsset (state, nftContractAddress) {
  state.testnetNftAssets = state.testnetNftAssets
    .filter(testnetNftAsset => {
      return testnetNftAsset && testnetNftAsset.address !== nftContractAddress
    })
}
