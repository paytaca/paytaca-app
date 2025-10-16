import { hexToBin } from 'bitauth-libauth-v3'
import { SignatureTemplate } from 'cashscript'
import { Wallet } from 'src/wallet'
import { LibauthHDWallet } from 'src/wallet/bch-libauth'
import { getWalletByNetwork } from 'src/wallet/chipnet'
import SingleWallet from 'src/wallet/single-wallet'

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
  return commonUtxo
}

/**
 * @param {WatchtowerUtxo} utxo 
 * @returns {import("cashscript").Utxo}
 */
export function watchtowerUtxoToCashscript(utxo) {
  let tokenAmount
  if (utxo?.tokenid) {
    tokenAmount = BigInt(utxo?.amount)
  }

  return {
    txid: utxo?.txid,
    vout: utxo?.vout,
    satoshis: BigInt(utxo?.value),
    token: !utxo?.tokenid ? undefined : {
      category: utxo?.tokenid,
      amount: tokenAmount,
      nft: !utxo?.capability ? undefined : {
        capability: utxo?.capability,
        commitment: utxo?.commitment,
      }
    }
  }
}

/**
 * @param {WatchtowerUtxo} utxo 
 * @param {Wallet | SingleWallet | LibauthHDWallet} wallet
 */
export function watchtowerUtxoToCashscriptP2pkh(utxo, wallet, templateOpts) {
  if (wallet instanceof Wallet) {
    const bchWallet = getWalletByNetwork(wallet, 'bch')
    // using libauth wallet since fetching private key is not async
    wallet = new LibauthHDWallet(bchWallet.mnemonic, bchWallet.derivationPath)
  }

  let utxoPkWif
  if (wallet instanceof SingleWallet) {
    utxoPkWif = wallet.wif
  } else {
    const addressPath = utxo?.address_path || utxo.wallet_index
    utxoPkWif = wallet.getPrivateKeyWifAt(addressPath)
  }

  // this is 0.10.x cashscript, but would probably be compatible with 0.8.x
  const template = new SignatureTemplate(
    utxoPkWif, templateOpts?.hashtype, templateOpts?.signatureAlgorithm
  );

  const ctUtxo = watchtowerUtxoToCashscript(utxo)
  ctUtxo.template = template
  return ctUtxo
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


/**
 * @param {Object} utxo
 * @param {String} utxo.txid
 * @param {Number} utxo.vout
 * @param {Number | String} utxo.satoshis
 * @param {Object} [utxo.token]
 * @param {Number | String} utxo.token.amount
 * @param {String} utxo.token.category
 * @param {Object} [utxo.token.nft]
 * @param {'none' | 'mutable' | 'minting'} utxo.token.nft.capability
 * @param {String} utxo.token.nft.commitment
 * @returns {import('cashscript').Utxo}
 */
export function parseUtxo(utxo) {
  return {
    txid: utxo?.txid,
    vout: utxo?.vout,
    satoshis: BigInt(utxo?.satoshis),
    token: !utxo?.token ? undefined : {
      category: utxo?.token?.category,
      amount: BigInt(utxo?.token?.amount),
      nft: !utxo?.token?.nft ? undefined : {
        capability: utxo?.token?.nft?.capability,
        commitment: utxo?.token?.nft?.commitment,
      }
    }
  }
}
