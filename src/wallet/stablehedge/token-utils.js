/**
 * @param {Object} data
 * @param {String} data.category
 * @param {String} data.currency
 * @param {Number} data.decimals
 * @param {Object} data.price_message
 * @param {String} data.price_message.pubkey
 * @param {String} data.price_message.message
 * @param {String} data.price_message.signature
 * @param {Number} data.price_message.price_value
 * @param {Number} data.price_message.price_sequence
 * @param {Number} data.price_message.message_sequence
 * @param {Number} data.price_message.message_timestamp
 */
export function parseTokenData(data) {
  const result = {
    category: data?.category,
    currency: data?.currency,
    decimals: data?.decimals,
    priceMessage: data?.price_message
      ? parsePriceMessage(data?.price_message)
      : undefined,
  }
  return result
}

/**
 * @param {Object} data
 * @param {String} data.pubkey
 * @param {String} data.message
 * @param {String} data.signature
 * @param {Number} data.price_value
 * @param {Number} data.price_sequence
 * @param {Number} data.message_sequence
 * @param {Number} data.message_timestamp
 */
export function parsePriceMessage(data) {
  if (!data) return data

  return {
    pubkey: data?.pubkey,
    message: data?.message,
    signature: data?.signature,
    priceValue: data?.price_value,
    priceSequence: data?.price_sequence,
    messageSequence: data?.message_sequence,
    messageTimestamp: data?.message_timestamp,
  }
}


/** 
 * @param {Number | BigInt | String} satoshis 
 * @param {Number | BigInt | String} priceValue 
 * @param {Boolean} [ceil=false]
 * @returns 
 */
export function satoshisToToken(satoshis, priceValue, ceil) {
  satoshis = BigInt(satoshis)
  const tokenUnitsPerBch = BigInt(priceValue)

  const tokenUnitSatsPerBch = satoshis * tokenUnitsPerBch // <sats(units per bch)> == <units(sats per bch)>
  const satsPerBch = BigInt(10 ** 8)
  const tokenUnits = tokenUnitSatsPerBch / satsPerBch // cancels out <sats per bch>, <units> remain
  if (ceil && tokenUnitSatsPerBch % satsPerBch > 0n) return tokenUnits + 1n
  return tokenUnits
}

/**
 * @param {Number | BigInt | String} tokenUnits 
 * @param {Number | BigInt | String} priceValue 
 * @param {Boolean} [ceil=false]
 * @returns 
 */
export function tokenToSatoshis(tokenUnits, priceValue, ceil) {
  tokenUnits = BigInt(tokenUnits)
  const tokenUnitsPerBch = BigInt(priceValue)
  const satsPerBch = BigInt(10 ** 8)
  const unitSatsPerBch = tokenUnits * satsPerBch // <units(sats per bch)> == <sats(units per bch)>
  const satoshis = unitSatsPerBch / tokenUnitsPerBch // cancels out <units per bch>, <sats> remain
  if (ceil && unitSatsPerBch % tokenUnitsPerBch > 0n) return satoshis + 1n
  return satoshis
}
