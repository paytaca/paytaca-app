

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
* @property {string} [address]
*/

/**
* @typedef {'largest'|'smallest'|'oldest'|'bch-only'|'token-only'|'knapsack'} UtxoSelectionStrategy
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
* @property {boolean} [changeFirst=true]
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
 * Select UTXOs using a knapsack algorithm, prioritizing change UTXOs first.
 * @param {Array} utxos - Array of UTXOs. Each must have `satoshis` and `addressPath`.
 * @param {bigint} targetAmount - Amount in satoshis to cover.
 * @returns {Object} Selected UTXOs and total amount.
 */
export function knapsackSelectChangeFirst(utxos, targetAmount) {
  const changeUtxos = utxos.filter(u => u.addressPath.startsWith('1/'))
  const depositUtxos = utxos.filter(u => !u.addressPath.startsWith('1/'))

  // Try with change UTXOs only
  let result = knapsack(changeUtxos, targetAmount)
  if (result.satisfied) return result

  // Try with all UTXOs
  result = knapsack([...changeUtxos, ...depositUtxos], targetAmount)
  return result
}

/**
 * Knapsack-style selector to minimize excess.
 * @param {CommonUtxo[]} utxos - Array of UTXOs.
 * @param {bigint} targetAmount - Target amount to cover.
 * @returns {Object} { selectedUtxos, total, satisfied }
 */
const knapsack = (utxos, targetAmount) => {
  const sorted = [...utxos].sort((a, b) => b.satoshis - a.satoshis)

  let best = null
  let minExcess = null

  const n = sorted.length
  const satoshis = sorted.map(u => BigInt(u.satoshis))

  // 2^n combinations
  for (let i = 0; i < (1 << n); i++) {
    let combo = []
    let sum = 0n

    for (let j = 0; j < n; j++) {
      if ((i & (1 << j)) !== 0) {
        combo.push(sorted[j])
        sum += satoshis[j]
      }
    }

    if (sum >= targetAmount) {
      const excess = sum - targetAmount
      if (minExcess === null || excess < minExcess) {
        best = combo
        minExcess = excess
      }
    }
  }

  return {
    selectedUtxos: best || [],
    total: best ? best.reduce((sum, u) => sum + BigInt(u.satoshis), 0n) : 0n,
    satisfied: !!best
  }
}

/**
* @param {CommonUtxo[]} utxos
* @param {CoinSelectOptions} options
* @returns {CoinSelectResult}
*/
export function selectUtxos (utxos, options) {
  const {
    targetAmount,
    filterStrategy = 'bch-only',
    sortStrategy = 'smallest',
    tokenFilter,
    changeFirst = true,
    estimatedFee // Required if token-only
  } = options


  let candidates = utxos.filter(utxo => {
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


  // switch (sortStrategy) {
  //   case 'largest':
  //     if (filterStrategy === 'bch-only') {
  //       candidates.sort((a, b) => {
  //         Number(b.satoshis) - Number(a.satoshis)
  //       })
  //     }
  //     if (filterStrategy === 'token-only') {
  //       candidates.sort((a, b) => {
  //         if (BigInt(a.token.amount) > BigInt(b.token.amount)) return -1
  //         if (BigInt(a.token.amount) < BigInt(b.token.amount)) return 1
  //         return 0
  //       })
  //     }
  //     break
  //   case 'smallest':
  //     if (filterStrategy === 'bch-only') {
  //       candidates.sort((a, b) => Number(a.satoshis) - Number(b.satoshis))
  //     }
  //     if (filterStrategy === 'token-only') {
  //       candidates.sort((a, b) => {
  //         if (BigInt(a.token.amount) < BigInt(b.token.amount)) return -1
  //         if (BigInt(a.token.amount) > BigInt(b.token.amount)) return 1
  //         return 0
  //       })
  //     }
  //     break
  //   case 'oldest':
  //     candidates.sort((a, b) => (a.age || 0) - (b.age || 0))
  //     break
  // }

  const changeUtxos = candidates.filter(u => u.addressPath.startsWith('1/'))
  const depositUtxos = candidates.filter(u => u.addressPath.startsWith('0/'))

  const changeResult = knapsack(changeUtxos, targetAmount)
  console.log('change result', changeResult)
  if (changeResult.satisfied) {

      if (filterStrategy === 'bch-only') {
        changeResult.selectedUtxos.sort((a, b) => Number(a.satoshis) - Number(b.satoshis))
      }
      if (filterStrategy === 'token-only') {
        changeResult.selectedUtxos.sort((a, b) => {
          if (BigInt(a.token.amount) < BigInt(b.token.amount)) return -1
          if (BigInt(a.token.amount) > BigInt(b.token.amount)) return 1
          return 0
        })
      }
      candidates = changeResult.selectedUtxos
  } else {
    const remaining = targetAmount - changeResult.total
    const depositResult = knapsack(depositUtxos, remaining)

    if (filterStrategy === 'bch-only') {
        depositResult.selectedUtxos.sort((a, b) => Number(a.satoshis) - Number(b.satoshis))
      }
      if (filterStrategy === 'token-only') {
        depositResult.selectedUtxos.sort((a, b) => {
          if (BigInt(a.token.amount) < BigInt(b.token.amount)) return -1
          if (BigInt(a.token.amount) > BigInt(b.token.amount)) return 1
          return 0
        })
      }
    candidates = candidates.concat(depositResult.selectedUtxos)

  }
  console.log('Candidates', candidates)

  
  const selected = []
  let total = 0n

  // if (filterStrategy === 'bch-only') {
  //    candidates.sort((a, b) => Number(a.satoshis) - Number(b.satoshis))
  // }
  // if (filterStrategy === 'token-only') {
  //   candidates.sort((a, b) => {
  //     if (BigInt(a.token.amount) < BigInt(b.token.amount)) return -1
  //     if (BigInt(a.token.amount) > BigInt(b.token.amount)) return 1
  //     return 0
  //   })
  // }

  console.log('sorted candidates', candidates)

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
    vout: Number(utxo.vout),
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
    outpointIndex: Number(utxo.vout),
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