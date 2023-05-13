import { getBlockChainNetwork } from "src/wallet/chipnet"

export function updateAssetBalance (state, data) {
  const network = getBlockChainNetwork()
  let assets = state.assets
  if (network === 'chipnet') {
    assets = state.chipnet__assets
  }

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    if (asset && asset.id === data.id) {
      assets[i].balance = data.balance
      if (asset.id.indexOf('bch') > -1) {
        assets[i].spendable = data.spendable
      }
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
  const network = getBlockChainNetwork()
  let assets = state.assets
  if (network === 'chipnet') {
    assets = state.chipnet__assets
  }

  if (!Array.isArray(assets)) state.assets[net] = []
  if (assets.some(_asset => String(_asset && _asset.id).toLowerCase() === String(asset.id).toLowerCase())) {
    return
  }

  assets.push(asset)
}

export function removeAsset (state, assetId) {
  let assetIndex
  const network = getBlockChainNetwork()
  let assets = state.assets
  if (network === 'chipnet') {
    assets = state.chipnet__assets
  }

  assets.map(function (asset, index) {
    if (asset && asset.id === assetId) {
      assetIndex = index
    }
  })
  if (assetIndex) {
    assets.splice(assetIndex, 1)
  }
}

/**
 *
 * @param {Object} state
 * @param {{ id:String, symbol:String, name:String, logo: String }} asset
 */
export function addIgnoredAsset (state, asset) {
  const network = getBlockChainNetwork()
  let _ignoredAssets = state.ignoredAssets
  if (network === 'chipnet') {
    _ignoredAssets = state.chipnet__ignoredAssets
  }

  if (!asset || !asset.id) return
  if (!Array.isArray(state.ignoredAssets[net])) state.ignoredAssets[net] = []

  const index = state.ignoredAssets[net].map(assetInfo => assetInfo && assetInfo.id).indexOf(asset.id)
  if (index >= 0) state.ignoredAssets[net][index] = asset
  else state.ignoredAssets[net].push(asset)
}

/**
 *
 * @param {Object} state
 * @param {String} assetId
 */
export function removeIgnoredAsset (state, assetId) {
  const network = getBlockChainNetwork()
  let _ignoredAssets = state.ignoredAssets
  if (network === 'chipnet') {
    _ignoredAssets = state.chipnet__ignoredAssets
  }

  if (!Array.isArray(_ignoredAssets)) return
  _ignoredAssets = _ignoredAssets
    .filter(asset => {
      if (!asset || !asset.id) return
      return asset.id !== assetId
    })
    .filter(Boolean)
}

/**
 *
 * @param {Object} state
 * @param {{ assetId: String, imageUrl: String }} data
 */
export function updateAssetImageUrl (state, data) {
  const network = getBlockChainNetwork()
  let assets = state.assets
  if (network === 'chipnet') {
    assets = state.chipnet__assets
  }
  if (!Array.isArray(assets)) return

  for (var i = 0; i < assets.length; i++) {
    if (assets[i] && state.assets[net][i].id === data.assetId) {
      assets[i].logo = data.imageUrl
      break
    }
  }
}
