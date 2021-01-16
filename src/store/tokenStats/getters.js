export function getTokenStats (state) {
  return (tokenId) => {
    if (!Array.isArray(state.tokenTypes)) return null

    return state.tokenTypes.find(tknStats => tknStats.id === tokenId)
  }
}


export const getTokenLogo = () => (tokenId) => {
  switch(tokenId) {
    case('test-token-id-1'):
      return 'pesos-logo.png'
    case('test-token-id-2'):
    case('4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf'):
      return 'spice-logo.png'
    default:
      return 'bitcoin-cash-bch-logo.png'
  }
}
