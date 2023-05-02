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
 * @param {{ id:String, symbol:String, name:String, logo:String, balance: Number, decimals: Number }} asset
 * @returns
 */
export function addNewAsset (state, asset) {
  if (!Array.isArray(state.assets)) state.assets = []

  const existingAsset = state.assets.find(_asset => String(_asset && _asset.id).toLowerCase() === String(asset.id).toLowerCase())
  if (existingAsset) {
    existingAsset.name = existingAsset?.name || asset?.name
    existingAsset.symbol = existingAsset?.symbol || asset?.symbol
    existingAsset.logo = existingAsset?.logo || asset?.logo
    existingAsset.decimals = existingAsset?.decimals || asset?.decimals
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
 * @param {{ id:String, symbol:String, name:String, decimals:Number, logo: String }} asset
 */
export function addIgnoredAsset (state, asset) {
  if (!asset || !asset.id) return
  if (!Array.isArray(state.ignoredAssets)) state.ignoredAssets = []

  const index = state.ignoredAssets.map(assetInfo => assetInfo && assetInfo.id).indexOf(asset.id)
  if (index >= 0) state.ignoredAssets[index] = asset
  else state.ignoredAssets.push(asset)
}

/**
 *
 * @param {Object} state
 * @param {String} assetId
 */
export function removeIgnoredAsset (state, assetId) {
  if (!Array.isArray(state.ignoredAssets)) return
  state.ignoredAssets = state.ignoredAssets
    .filter(asset => {
      if (!asset || !asset.id) return
      return asset.id !== assetId
    })
    .filter(Boolean)
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

/**
 *
 * @param {Object} state
 * @param {{ assetId: String, imageUrl: String }} data
 */
export function updateAssetImageUrl (state, data) {
  if (!Array.isArray(state.assets)) return

  for (var i = 0; i < state.assets.length; i++) {
    if (!state.assets[i]) continue
    if (state.assets[i].id === data.assetId) {
      state.assets[i].logo = data.imageUrl
      break
    }
  }
}
