export function updateAssetBalance (state, data) {
  for (let i = 0; i < state.assets.length; i++) {
    const asset = state.assets[i]
    if (asset && asset.id === data.id) {
      state.assets[i].balance = data.balance
      break
    }
  }
}


/**
 * 
 * @param {Object} state 
 * @param {{ id:String, symbol:String, name:String, logo:String, balance: Number }} asset 
 * @returns 
 */
export function addNewAsset (state, asset) {
  if (!Array.isArray(state.assets)) state.assets = []

  if (state.assets.some(_asset => String(_asset && _asset.id).toLowerCase() === String(asset.id).toLowerCase())) {
    return
  }

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

/**
 * 
 * @param {Object} state 
 * @param {{ assetId: String, imageUrl: String }} data
 */
export function updateAssetImageUrl(state, data) {
  if (!Array.isArray(state.assets)) return

  for (var i = 0; i < state.assets.length; i++) {
    if (state.assets[i] && state.assets[i].id === data.assetId) {
      state.assets[i].logo = data.imageUrl
      break
    }
  }
}
