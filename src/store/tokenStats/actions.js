import getTokenStatsAPI from '../../utils/get-token-stats.js'

export function getTokenStats ({ getters, commit }, { tokenId }) {
  const existingTokenStats = getters.getTokenStats(tokenId)
  if (existingTokenStats && existingTokenStats.tokenId) return Promise.resolve(existingTokenStats)

  return getTokenStatsAPI(tokenId)
    .then(tokenStats => {
      console.log(tokenStats)
      commit('updateTokenStats', tokenStats)
      return Promise.resolve(tokenStats)
    })
    .catch(err => {
      return Promise.reject(err)
    })
}
