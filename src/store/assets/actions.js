export async function getSLPTokenStats ({ getters, commit }, { tokenId }) {
  const existingTokenStats = getters.getAssetStats(tokenId)
  if (existingTokenStats && existingTokenStats.id) return existingTokenStats

  const tokenStats = null // await getTokenStatsAPI(tokenId)
  const assetStats = {
    id: tokenStats.id,
    name: tokenStats.name,
    symbol: tokenStats.symbol
  }
  commit(
    'updateAssetStats',
    assetStats
  )

  return assetStats
}
