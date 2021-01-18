import { blockchains } from "./state"

export function updateAssetStats (state, data = {blockchain: blockchains.BCH, id, name, symbol}) {
  if (!data || !data.id) return

  if (!Array.isArray(state.assetTypes)) {
    state.assetTypes = [data]
  }

  const existingAsset = state.assetTypes.find(asset => asset.id === data.id && asset.blockchain === data.blockchain)
  const index = state.assetTypes.indexOf(existingAsset)

  if (index < 0) state.assetTypes.push(data)
  else state.assetTypes[index] = data
}
