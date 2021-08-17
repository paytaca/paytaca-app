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
