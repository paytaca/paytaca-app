import { anyhedgeBackend } from '../../wallet/anyhedge/backend'

/**
 * 
 * @param {Object} ctx 
 * @param {Object} opts
 * @param {String} opts.oraclePubkey
 * @param {Boolean} opts.checkTimestampAge - will block if the latest timestamp is less than a minute old since price messages are generated per minute
 * @param {Boolean} opts.forceRefresh - fetch the latest price message even if a cached one exists
 */
export function updateOracleLatestPrice(ctx, opts) {
  const { oraclePubkey, checkTimestampAge, forceRefresh } = opts
  const oracleInfo = ctx?.getters?.oracles?.[oraclePubkey]
  if (!oracleInfo) return Promise.reject('Oracle does not exist')

  if (checkTimestampAge) {
    const latestPriceTimestamp = (oracleInfo?.latestPrice?.messageTimestamp * 1000) || 0
    const latestPriceAge = Date.now() - latestPriceTimestamp
    // Skip when the cached price is fresh. Ignore negative ages so a device
    // clock that is behind cannot block refreshing indefinitely.
    if (latestPriceTimestamp && latestPriceAge >= 0 && latestPriceAge < 60 * 1000) {
      return Promise.reject('Latest price age is less than a minute')
    }
  }

  const params = {
    pubkey: oraclePubkey,
    limit: 1,
  }
  if (!forceRefresh && oracleInfo?.latestPrice?.messageSequence) {
    params.message_sequence_after = oracleInfo.latestPrice.messageSequence
  }

  return anyhedgeBackend.get('anyhedge/price-messages/', { params })
    .then(response => {
      const latestPrice = response?.data?.results?.[0]
      if (!latestPrice) return Promise.reject('Empty results')
      const mutationPayload = {
        oraclePubkey: latestPrice?.pubkey,
        priceValue: latestPrice?.price_value,
        messageTimestamp: latestPrice?.message_timestamp,
        messageSequence: latestPrice?.message_sequence,
        message: latestPrice?.message,
        signature: latestPrice?.signature,
      }
      ctx.commit('updateOracleLatestPrice', mutationPayload)
    })
}
