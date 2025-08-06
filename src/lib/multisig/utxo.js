

/**
* @typedef {object} CashToken
* @property {string} category
* @property {string} amount
* @property {'none'|'mutable'|'minting'} [capability]
* @property {{capability:'none'|'mutable'|'minting',commitment:string}} [nft]
*/

/**
* @typedef {object} CommonUtxo
* @property {string} txid
* @property {number} vout
* @property {number} satoshis
* @property {CashToken} [token]
* @property {number} [age]
* @property {string} addressPath The path of the utxo source address
*/

/**
* @typedef {'largest'|'smallest'|'oldest'|'bch-only'|'token-only'} UtxoSelectionStrategy
*/

/**
* @typedef {object} TokenFilter
* @property {string} [category]
* @property {'none'|'mutable'|'minting'} [capability]
* @property {bigint} [minAmount]
*/

/**
* @typedef  {object} CoinSelectOptions
* @property {number} targetSatoshis
* @property {UtxoSelectionStrategy} [strategy]
* @property {TokenFilter} [tokenFilter]
*/

/**
* @typedef {object} CoinSelectResult
* @property {CommonUtxo[]} selectedUtxos
* @property {number} total
* @property {boolean} satisfied
* @property {CommonUtxo[]} remainingUtxos
*/


/**
 * @typedef {object} WatchtowerMultisigUtxo
 * @property {string} txid
 * @property {number} vout
 * @property {number} satoshis
 * @property {number} height
 * @property {boolean} coinbase
 * @property {string} addressPath
 * @property {string} address
 * @property {object} [token]
 * @property {string} [token.category]
 * @property {string} [token.amount]
 * @property {object} [token.nft]
 * @property {string} [token.nft.commitment]
 * @property {'minting'|'mutable'|'none'} [token.nft.capability]
 */

/**
* @param {CommonUtxo[]} utxos
* @param {CoinSelectOptions} options
* @returns {CoinSelectResult}
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
        candidates.sort((a, b) => number(b.satoshis) - number(a.satoshis))
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
        candidates.sort((a, b) => number(a.satoshis) - number(b.satoshis))
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
 * @param { object } utxo // Multisig endpoint utxos
 * @returns { CommonUtxo[] }
 */
export function watchtowerUtxoToCommonUtxo (utxo) {
  const commonUtxo = {
    txid: utxo.txid,
    satoshis: BigInt(utxo.satoshis),
    vout: number(utxo.vout),
    height: utxo.height
  }
  if (utxo.token) {
    commonUtxo.token = {
      amount: BigInt(utxo.token.amount || 0),
      category: utxo.token.category
    }
    if (utxo.token.nft) {
      commonUtxo.token.nft = utxo.token.nft
    }
  }
  commonUtxo.addressPath = utxo.address_path
  return commonUtxo
}

/**
 * @param { CommonUtxo } utxo
 * @returns { import("@bitauth/libauth").Input }
 */
export function commonUtxoToLibauthInput (utxo, unlockingBytecode, sequenceNumber = 0) {
  return {
    outpointIndex: number(utxo.vout),
    outpointTransactionHash: hexToBin(utxo.txid),
    sequenceNumber,
    unlockingBytecode
  }
}

/**
 * @param { CommonUtxo } utxo
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
    output.token = {}
    output.token.amount = BigInt(utxo.token.amount)
    output.token.category = hexToBin(utxo.token.category)
    if (utxo.token.nft) {
      output.token.nft.capability = utxo.token.nft.capability
      output.token.nft.commitment = hexToBin(utxo.token.nft.commitment)
    }
  }
  return output
}