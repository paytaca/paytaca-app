

/**
* @typedef {object} CashToken
* @property {string} category
* @property {string} amount
* @property {'none'|'mutable'|'minting'} [capability]
* @property {{capability:'none'|'mutable'|'minting',commitment:string}} [nft]
*/

import { hexToBin } from "bitauth-libauth-v3";

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
 * @typedef {object} TokenRequirement
 * @property {bigint} amount
 */


/**
* @typedef  {object} CoinSelectOptions
* @property {number} targetSatoshis - BCH target in satoshis.
* @property {{Object.<string, TokenRequirement>}} targetTokens - Map of token category -> required amount
* @property {UtxoSelectionStrategy} [strategy='smallest']
* @property {TokenFilter} [tokenFilter]
* @property {boolean} [changeFirst=true] - Prefer change addresses first.
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



// /**
//  * Knapsack-style selector to minimize excess.
//  * @param {CommonUtxo[]} utxos - Array of UTXOs.
//  * @param {bigint} targetAmount - Target amount to cover.
//  * @returns {Object} { selectedUtxos, total, satisfied }
//  */
// const knapsack = (utxos, targetAmount) => {
//   const sorted = [...utxos].sort((a, b) => b.satoshis - a.satoshis)

//   let best = null
//   let minExcess = null

//   const n = sorted.length
//   const satoshis = sorted.map(u => BigInt(u.satoshis))

//   // 2^n combinations
//   for (let i = 0; i < (1 << n); i++) {
//     let combo = []
//     let sum = 0n

//     for (let j = 0; j < n; j++) {
//       if ((i & (1 << j)) !== 0) {
//         combo.push(sorted[j])
//         sum += satoshis[j]
//       }
//     }

//     if (sum >= targetAmount) {
//       const excess = sum - targetAmount
//       if (minExcess === null || excess < minExcess) {
//         best = combo
//         minExcess = excess
//       }
//     }
//   }

//   return {
//     selectedUtxos: best || [],
//     total: best ? best.reduce((sum, u) => sum + BigInt(u.satoshis), 0n) : 0n,
//     satisfied: !!best
//   }
// }

/**
 * Optimized branch and bound knapsack coin selector
 * to minimize excess satoshis above targetAmount.
 *
 * @param {CommonUtxo[]} utxos
 * @param {bigint} targetSatoshis
 * @returns {{ selectedUtxos: CommonUtxo[], total: bigint, satisfied: boolean }}
 */
function knapsackSatoshis(utxos, targetSatoshis) {
  // Sort descending by satoshis for early pruning
  const sorted = 
    [...utxos]
      .sort((a, b) => b.satoshis - a.satoshis)
      .sort((a, b) => {
    const aIsChange = a.addressPath.startsWith('1/');
    const bIsChange = b.addressPath.startsWith('1/');

    // Change addresses ('1/n') come first
    if (aIsChange && !bIsChange) return -1;
    if (!aIsChange && bIsChange) return 1;

    // If both are change or both are deposit, sort by n
    const aIndex = parseInt(a.addressPath.split('/')[1], 10);
    const bIndex = parseInt(b.addressPath.split('/')[1], 10);
    return aIndex - bIndex;
  })

  const sats = sorted.map(u => BigInt(u.satoshis))
  const n = sorted.length

  let bestSolution = null
  let bestExcess = null

  // Early exit: if any utxo >= target, pick smallest such utxo
  for (const u of sorted) {
    const val = BigInt(u.satoshis)
    if (val >= targetSatoshis) {
      if (bestExcess === null || val - targetSatoshis < bestExcess) {
        bestSolution = [u]
        bestExcess = val - targetSatoshis
      }
    }
  }
  if (bestExcess === 0n) {
    return { selectedUtxos: bestSolution, total: bestSolution[0].satoshis, satisfied: true }
  }

  /**
   * Recursive search
   * @param {number} idx Current index in sorted utxos
   * @param {bigint} currentSum Sum of selected utxos so far
   * @param {CommonUtxo[]} currentSelection
   * @param {bigint} remainingSum Sum of utxos from idx to end
   */
  function search(idx, currentSum, currentSelection, remainingSum) {
    // If currentSum >= target, check if best
    if (currentSum >= targetSatoshis) {
      const excess = currentSum - targetSatoshis
      if (bestExcess === null || excess < bestExcess) {
        bestExcess = excess
        bestSolution = [...currentSelection]
      }
      return
    }

    // No more utxos or even all remaining can't reach target => prune
    if (idx === n || currentSum + remainingSum < targetSatoshis) return

    const utxo = sorted[idx]

    // Choose utxo
    currentSelection.push(utxo)
    search(idx + 1, currentSum + BigInt(utxo.satoshis), currentSelection, remainingSum - BigInt(utxo.satoshis))
    currentSelection.pop()

    // Skip utxo
    search(idx + 1, currentSum, currentSelection, remainingSum - BigInt(utxo.satoshis))
  }

  const totalSum = sats.reduce((a, b) => a + b, 0n)

  search(0, 0n, [], totalSum)

  return {
    selectedUtxos: bestSolution || [],
    total: bestSolution ? bestSolution.reduce((a, u) => a + BigInt(u.satoshis), 0n) : 0n,
    satisfied: bestSolution !== null
  }
}

/**
 * Optimized branch and bound knapsack coin selector
 * to minimize excess satoshis above targetAmount.
 *
 * @param {CommonUtxo[]} utxos
 * @param {object} TokenRequirement
 * @returns {{ selectedUtxos: CommonUtxo[], total: bigint, satisfied: boolean }}
 */
function knapsackTokens(utxos, targetToken) {
  // Sort descending by satoshis for early pruning
  let sorted = 
    [...utxos]
      .filter(u => u.token.category === Object.keys(targetToken)[0])
      .sort((a, b) => b.token.amount - a.token.amount)

  sorted = structuredClone(sorted).map(u => {
    u.token.amount = BigInt(u.token.amount)
    return u
  })

  const tokens = sorted.map(u => BigInt(u.token.amount))
  const n = sorted.length

  let bestSolution = null
  let bestExcess = null

  const targetTokenAmount = Object.values(targetToken)[0]
  // Early exit: if any utxo >= target, pick smallest such utxo
  for (const u of sorted) {
    const val = BigInt(u.token.amount)
    if (val >= targetToken.amount) {
      if (bestExcess === null || val - targetTokenAmount < bestExcess) {
        bestSolution = [u]
        bestExcess = val - targetTokenAmount
      }
    }
  }
  if (bestExcess === 0n) {
    return { selectedUtxos: bestSolution, total: bestSolution[0].token.amount, satisfied: true }
  }

  /**
   * Recursive search
   * @param {number} idx Current index in sorted utxos
   * @param {bigint} currentSum Sum of selected utxos so far
   * @param {CommonUtxo[]} currentSelection
   * @param {bigint} remainingSum Sum of utxos from idx to end
   */
  function search(idx, currentSum, currentSelection, remainingSum) {
    // If currentSum >= target, check if best
    if (currentSum >= targetTokenAmount) {
      const excess = currentSum - targetTokenAmount
      if (bestExcess === null || excess < bestExcess) {
        bestExcess = excess
        bestSolution = [...currentSelection]
      }
      return
    }

    // No more utxos or even all remaining can't reach target => prune
    if (idx === n || currentSum + remainingSum < targetTokenAmount) return

    const utxo = sorted[idx]

    // Choose utxo
    currentSelection.push(utxo)
    search(idx + 1, currentSum + BigInt(utxo.token.amount), currentSelection, remainingSum - BigInt(utxo.token.amount))
    currentSelection.pop()

    // Skip utxo
    search(idx + 1, currentSum, currentSelection, remainingSum - BigInt(utxo.token.amount))
  }

  const totalSum = tokens.reduce((a, b) => a + b, 0n)
  search(0, 0n, [], totalSum)

  return {
    selectedUtxos: bestSolution || [],
    total: bestSolution ? bestSolution.reduce((a, u) => a + BigInt(u.token.amount), 0n) : 0n,
    satisfied: bestSolution !== null
  }
}

/**
* Currently only works on sats only and single token category on which is the typical use case.
* 
* @param {CommonUtxo[]} utxos
* @param {CoinSelectOptions} options
* @returns {CoinSelectResult}
*/
export function selectUtxos (utxos, options) {
  const {
    targetSatoshis,
    targetTokens,
  } = options

  const nonTokenUtxos = utxos.filter(u => !u.token)
  const tokenUtxos = utxos.filter(u => Boolean(u.token?.category))
  
  const satsUtxosSelected = knapsackSatoshis(nonTokenUtxos, BigInt(targetSatoshis ?? 0))

  const targetTokenAmount = BigInt(targetTokens?.[Object.keys(targetTokens || {})[0]] || 0) 
  
  let candidates = [...satsUtxosSelected.selectedUtxos]

  if (targetTokenAmount > 0) {  
    const tokensSelected = knapsackTokens(tokenUtxos, targetTokens)
    
    if (tokensSelected?.selectedUtxos?.length > 0) {
      candidates = candidates.concat(tokensSelected.selectedUtxos)
    }
  }

  let totalSatoshis = 0
  let totalTokens = {}

  for (const utxo of candidates) {
    if (!utxo.token) {
      totalSatoshis = totalSatoshis + utxo.satoshis
    }
    if (utxo.token?.amount) {
      if (!totalTokens[utxo.token.category]) {
        totalTokens[utxo.token.category] = {
          total: utxo.token.amount
        }
      }
      totalTokens[utxo.token.category].total = totalTokens[utxo.token.category].total + utxo.token.amount
    }
  }
  let tokensSatisfied = {}

  for (const category of Object.keys(targetTokens || {})) {
    if (!totalTokens[category]) continue
    tokensSatisfied[category] = totalTokens[category].total >= targetTokens[category].amount
  }

  return {
    totalSatoshis,
    totalTokens,
    satoshisSatisfied: BigInt(totalSatoshis) >= BigInt(targetSatoshis ?? 0),
    tokensSatisfied,
    selectedUtxos: candidates,
    remainingUtxos: utxos.filter(u => {
      return !candidates.find(cu => cu.txid == u.txid && cu.vout == u.vout)
    })
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

export function watchtowerWalletHashUtxoToCommonUtxo(utxo) {
  const commonUtxo = {
    ...utxo,
    txid: utxo.txid,
    satoshis: utxo.value,
    vout: Number(utxo.vout),
    height: utxo.block
  }

  if (utxo.is_cashtoken || utxo.tokenid) {
    commonUtxo.token = {
      amount: utxo.amount,
      category: utxo.tokenid,
    }
    if (utxo.capability) {
      commonUtxo.token.nft = {
        capability: utxo.capability,
        commitment: utxo.commitment
      }
    }
  }
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