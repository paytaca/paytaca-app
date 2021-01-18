import getTokenStatsAPI from '../../utils/get-token-stats.js'
import { blockchains } from './state.js'

export async function getSLPTokenStats ({ getters, commit }, { tokenId }) {
  const existingTokenStats = getters.getAssetStats(tokenId, blockchains.BCH)
  console.log(existingTokenStats)
  if (existingTokenStats && existingTokenStats.id) return existingTokenStats

  const tokenStats = await getTokenStatsAPI(tokenId)
  const assetStats = {
    blockchain: blockchains.BCH,
    id: tokenStats.id,
    name: tokenStats.name,
    symbol: tokenStats.symbol,
  }
  commit(
    'updateAssetStats',
    assetStats
  )

  return assetStats
}
