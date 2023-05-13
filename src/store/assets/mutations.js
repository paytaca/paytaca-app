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
  const net = getBlockChainNetwork()

  if (!Array.isArray(state.assets[net])) state.assets[net] = []
  if (state.assets[net].some(_asset => String(_asset && _asset.id).toLowerCase() === String(asset.id).toLowerCase())) {
    return
  }

  state.assets[net].push(asset)
}

export function removeAsset (state, assetId) {
  let assetIndex
  const net = getBlockChainNetwork()

  state.assets[net].map(function (asset, index) {
    if (asset && asset.id === assetId) {
      assetIndex = index
    }
  })
  if (assetIndex) {
    state.assets[net].splice(assetIndex, 1)
  }
}

/**
 *
 * @param {Object} state
 * @param {{ id:String, symbol:String, name:String, logo: String }} asset
 */
export function addIgnoredAsset (state, asset) {
  const net = getBlockChainNetwork()

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
  const net = getBlockChainNetwork()

  if (!Array.isArray(state.ignoredAssets[net])) return
  state.ignoredAssets[net] = state.ignoredAssets[net]
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
  const net = getBlockChainNetwork()
  
  if (!Array.isArray(state.assets[net])) return

  for (var i = 0; i < state.assets[net].length; i++) {
    if (state.assets[net][i] && state.assets[net][i].id === data.assetId) {
      state.assets[net][i].logo = data.imageUrl
      break
    }
  }
}
