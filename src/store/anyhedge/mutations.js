/**
 * 
 * @param {Object} state
 * @param {Object} oracleInfo 
 * @param {String} oracleInfo.pubkey
 * @param {String} oracleInfo.assetName
 * @param {String} oracleInfo.assetCurrency
 * @param {Number} oracleInfo.assetDecimals
 * @param {{ priceValue:Number, messageTimestamp:Number, messageSequence:Number }} oracleInfo.latestPrice
 */
export function setOracle(state, oracleInfo) {
  if (!oracleInfo.pubkey) return
  const newOracleInfo = state.oracles[oracleInfo.pubkey] || {}
  newOracleInfo.assetName = oracleInfo.assetName
  newOracleInfo.assetCurrency = oracleInfo.assetCurrency
  newOracleInfo.assetDecimals = oracleInfo.assetDecimals
  if (oracleInfo?.latestPrice?.priceValue && oracleInfo?.latestPrice?.messageTimestamp && oracleInfo?.latestPrice?.messageSequence) {
    if (!newOracleInfo.latestPrice) newOracleInfo.latestPrice = {}
    newOracleInfo.latestPrice.priceValue = oracleInfo.latestPrice.priceValue
    newOracleInfo.latestPrice.messageTimestamp = oracleInfo.latestPrice.messageTimestamp
    newOracleInfo.latestPrice.messageSequence = oracleInfo.latestPrice.messageSequence
  }
  state.oracles[oracleInfo.pubkey] = newOracleInfo
}

export function removeOracle(state, oraclePubkey) {
  delete state?.oracles?.[oraclePubkey]
}


/**
 * 
 * @param {Object} state 
 * @param {Object} latestPriceInfo 
 * @param {String} latestPriceInfo.oraclePubkey
 * @param {Number} latestPriceInfo.priceValue
 * @param {Number} latestPriceInfo.messageTimestamp
 * @param {Number} latestPriceInfo.messageSequence
 */
export function updateOracleLatestPrice(state, latestPriceInfo) {
  const oracleInfo = state?.oracles?.[latestPriceInfo.oraclePubkey]
  if (!oracleInfo) return

  if (!oracleInfo.latestPrice) oracleInfo.latestPrice = {}
  oracleInfo.latestPrice.priceValue = latestPriceInfo.priceValue
  oracleInfo.latestPrice.messageTimestamp = latestPriceInfo.messageTimestamp
  oracleInfo.latestPrice.messageSequence = latestPriceInfo.messageSequence

  state.oracles[latestPriceInfo.oraclePubkey] = oracleInfo
}


export function updateLiquidityServiceInfo(state, liquidityServiceInfo) {
  state.liquidityServiceInfo = liquidityServiceInfo
}
