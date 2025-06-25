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
* @property { CommonUTXO[] } selectedUtxos
* @property { number } total
* @property { boolean } satisfied
* @property { CommonUTXO[] } remainingUtxos
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
    targetAmount,
    filterStrategy = 'bch-only',
    sortStrategy = 'largest',
    tokenFilter
  } = options

  const candidates = utxos.filter(utxo => {
    if (filterStrategy === 'bch-only' && utxo.token) return false
    if (filterStrategy === 'token-only' && !utxo.token) return false

    if (tokenFilter && utxo.token) {
      if (tokenFilter.category && utxo.token.category !== tokenFilter.category) return false
      if (tokenFilter.capability && utxo.token.capability !== tokenFilter.capability) return false
      if (tokenFilter.minAmount && BigInt(utxo.token.amount) < BigInt(tokenFilter.minAmount)) return false
    } else if (tokenFilter) {
      return false
    }

    return true
  })

  switch (sortStrategy) {
    case 'largest':
      if (filterStrategy === 'bch-only') {
        candidates.sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
      }
      if (filterStrategy === 'token-only') {
        candidates.sort((a, b) => {
	   if (BigInt(a.token.amount) > BigInt(b.token.amount)) return -1
	   if (BigInt(a.token.amount) < BigInt(b.token.amount)) return 1
	   return 0
	})
      }
      break
    case 'smallest':
      if (filterStrategy === 'bch-only') {
        candidates.sort((a, b) => Number(a.satoshis) - Number(b.satoshis))
      }
      if (filterStrategy === 'token-only') {
        candidates.sort((a, b) => {
	  if (BigInt(a.token.amount) < BigInt(b.token.amount)) return -1
	  if (BigInt(a.token.amount) > BigInt(b.token.amount)) return 1
	  return 0
	})
      }
      break
    case 'oldest':
      candidates.sort((a, b) => (a.age || 0) - (b.age || 0))
      break
  }

  const selected = []
  let total = 0n

  for (const utxo of candidates) {
    selected.push(utxo)
    if (filterStrategy === 'bch-only') {
      total += BigInt(utxo.satoshis)
    }
    if (filterStrategy === 'token-only') {
      total += BigInt(utxo.token.amount)
    }
    if (total >= targetAmount) break
  }

  return {
    total,
    satisfied: total >= targetAmount,
    selectedUtxos: selected,
    remainingUtxos: utxos.filter(u => !selected.includes(u))
  }
}

/**
 * @param { WatchtowerUtxo } utxo
 * @returns { CommonUTXO[] }
 */
export function watchtowerUtxoToCommonUtxo (utxo) {
  let tokenAmount
  if (utxo?.tokenid) {
    tokenAmount = BigInt(utxo?.amount)
  }

  return {
    txid: utxo?.txid,
    vout: Number(utxo?.vout),
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
    outpointIndex: Number(utxo.vout),
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
