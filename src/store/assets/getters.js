export function getAssetStats (state) {
  return (id) => {
    if (!Array.isArray(state.assetTypes)) return null

    const tokenStats = state.assetTypes.find(asset => asset.id === id)
    const empty = {
      blockchain: '',
      id: '',
      symbol: '',
      name: ''
    }
    return tokenStats || empty
  }
}

export const getAssetLogo = () => (asset) => {
  switch (asset) {
    case ('slp/php'):
      return 'pesos-logo.png'
    case ('4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf'):
      return 'spice-logo.png'
    case ('bch'):
    default:
      return 'bitcoin-cash-bch-logo.png'
  }
}
