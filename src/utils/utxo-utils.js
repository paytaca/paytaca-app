import { hexToBin } from 'bitauth-libauth-v3'
/**
* @typedef { Object } CashToken
* @property { string } category
* @property { string } amount
* @property { 'none'|'mutable'|'minting' } [capability]
* @property { { capability:'none'|'mutable'|'minting',commitment:string } } [nft]
*/

/**
* @typedef { Object } CommonUTXO
* @property { String } txid
* @property { number } vout
* @property { number } satoshis
* @property { CashToken } [token]
* @property { number } [age]
*/

/**
* @typedef { 'largest'|'smallest'|'oldest'|'bch-only'|'token-only' } SelectionStrategy
*/

/**
* @typedef { Object } TokenFilter
* @property { String } [category]
* @property { 'none'|'mutable'|'minting' } [capability]
* @property { bigint } [minAmount]
*/

/**
* @typedef  { Object } CoinSelectOptions
* @property { number } targetSatoshis
* @property { SelectionStrategy } [strategy]
* @property { TokenFilter } [tokenFilter]
*/

/**
* @typedef { Object } CoinSelectResult
* @property { CommonUTXO[] } selected
* @property { number } total
* @property { boolean } satisfied
* @property { CommonUTXO[] } remaining
*/

/**
 * @typedef {Object} WatchtowerUtxo
 * @property {String} address_path
 * @property {String} txid
 * @property {Number} vout
 * @property {Number} value
 * @property {Boolean} [is_cashtoken]
 * @property {String} [tokenid]
 * @property {String | Number} [amount]
 * @property {Number} [decimals]
 * @property {'none' | 'minting' | 'mutable' } [capability]
 * @property {String} [commitment]
 * @property {Number} [block]
 *
 * @typedef {Object} RedemptionContractWalletBalance
 * @property {String} category
 * @property {Number} total_amount
 * @property {Number} [current_price]
 * @property {Number} [redeemable_satoshis]
 */

/**
* @param { CommonUTXO[] } utxos
* @param { CoinSelectOptions } options
* @returns { CoinSelectResult }
*/
export function selectUtxos (utxos, options) {
  const {
    targetSatoshis,
    strategy = 'largest',
    tokenFilter
  } = options

  const candidates = utxos.filter(utxo => {
    if (strategy === 'bch-only' && utxo.token) return false
    if (strategy === 'token-only' && !utxo.token) return false

    if (tokenFilter && utxo.token) {
      if (tokenFilter.category && utxo.token.category !== tokenFilter.category) return false
      if (tokenFilter.capability && utxo.token.capability !== tokenFilter.capability) return false
      if (tokenFilter.minAmount && BigInt(utxo.token.amount) < tokenFilter.minAmount) return false
    } else if (tokenFilter) {
      return false
    }

    return true
  })

  switch (strategy) {
    case 'largest':
      candidates.sort((a, b) => b.satoshis - a.satoshis)
      break
    case 'smallest':
      candidates.sort((a, b) => a.satoshis - b.satoshis)
      break
    case 'oldest':
      candidates.sort((a, b) => (a.age || 0) - (b.age || 0))
      break
  }

  const selected = []
  let total = 0

  for (const utxo of candidates) {
    selected.push(utxo)
    total += utxo.satoshis
    if (total >= targetSatoshis) break
  }

  return {
    selected,
    total,
    satisfied: total >= targetSatoshis,
    remaining: utxos.filter(u => !selected.includes(u))
  }
}

/**
 * @param { WatchtowerUtxoWatchtowerUtxo } utxo
 * @returns { CommonUTXO[] }
 */
export function watchtowerUtxoToCommonUtxo (utxo) {
  let tokenAmount
  if (utxo?.tokenid) {
    tokenAmount = BigInt(utxo?.amount)
  }

  return {
    txid: utxo?.txid,
    vout: utxo?.vout,
    satoshis: BigInt(utxo?.value),
    token: !utxo?.tokenid
      ? undefined
      : {
          category: utxo?.tokenid,
          amount: tokenAmount,
          nft: !utxo?.capability
            ? undefined
            : {
                capability: utxo?.capability,
                commitment: utxo?.commitment
              }
        }
  }
}

/**
 * @param { CommonUTXO } utxo
 * @returns { import("@bitauth/libauth").Input }
 */
export function commonUtxoToLibauthInput (utxo, unlockingBytecode, sequenceNumber = 0) {
  return {
    outpointIndex: hexToBin(utxo.vout),
    outpointTransactionHash: hexToBin(utxo.txid),
    sequenceNumber,
    unlockingBytecode
  }
}

/**
 * @param { CommonUTXO } utxo
 * @returns { import("@bitauth/libauth").Output }
 */
export function commonUtxoToLibauthOutput (utxo, lockingBytecode) {
  const output = {
    lockingBytecode,
    valueSatoshis: BigInt(utxo.satoshis)
  }

  if (typeof (lockingBytecode) === 'string') {
    output.lockingBytecode = hexToBin(output.lockingBytecode)
  }

  if (utxo.token) {
    output.token.amount = BigInt(output.token.amount)
    output.token.category = hexToBin(output.token.category)
    if (utxo.token.nft) {
      output.token.nft.capability = utxo.token.nft.capability
      output.token.nft.commitment = hexToBin(utxo.token.nft.commitment)
    }
  }
  return output
}
