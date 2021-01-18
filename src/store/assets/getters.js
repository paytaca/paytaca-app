import { blockchains } from "./state"

export function getAssetStats (state) {
  return (id, blockchain=blockchains.BCH) => {
    if (!Array.isArray(state.assetTypes)) return null

    const tokenStats = state.assetTypes.find(asset => asset.id === id && asset.blockchain === blockchain)
    const empty = {
      blockchain: '',
      id: '',
      symbol: '',
      name: '',
    }

    return tokenStats || empty
  }
}


export const getAssetLogo = () => (id, blockchain=blockchains.BCH) => {
  switch (blockchain+id) {
    case(blockchains.BCH+'php'):
      return 'pesos-logo.png'
    case(blockchains.BCH+'spice'):
    case(blockchains.BCH+'4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf'):
      return 'spice-logo.png'
    case(blockchains.BCH+''):
    default:
      return 'bitcoin-cash-bch-logo.png'
  }
}
