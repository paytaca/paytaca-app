/**
* @typedef { Object } CashToken
* @property { string } category
* @property { string } amount
* @property { 'none'|'mutable'|'minting' } [capability]
* @property { { capability:'none'|'mutable'|'minting',commitment:string } } [nft]
*/

/**
* @typedef { Object } UTXO
* @property { String } txid
* @property { number } vout
* @property { number } value
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
* @property { UTXO[] } selected
* @property { number } total
* @property { boolean } satisfied
* @property { UTXO[] } remaining
*/

/**
* @param { UTXO[] } utxos
* @param { CoinSelectOptions } options
* @returns { CoinSelectResult } 
*/
function selectUtxos(utxos, options) {
 	const {
		targetSatoshis,
		strategy = 'largest',
		tokenFilter
	}  = options

	let candidates = utxos.filter(utxo=>{
	
		if (strategy === 'bch-only' && utxo.token) return false
		if (strategy === 'token-only' && !utxo.token) return false

		if (tokenFilter && utxo.token){
			if (tokenFilter.category && utxo.token.category !== tokenFilter.category)return false
			if (tokenFilter.capability && utxo.token.capability !== tokenFilter.capability)return false
			if (tokenFilter.minAmount && BigInt(utxo.token.amount) < tokenFilter.minAmount)return false
		}  else if (tokenFilter) {
			return false
		} 

		return true

	})

	switch(strategy){
		case'largest':
			candidates.sort((a,b)=> b.value - a.value)
			break
		case'smallest':
			candidates.sort((a,b)=> a.value - b.value)
			break
		case'oldest':
			candidates.sort((a,b)=> ( a.age || 0) - (b.age || 0))
			break
	} 

	const selected = []
	let total = 0

	for(const utxo of candidates){
		selected.push(utxo)
		total += utxo.value
		if (total >= targetSatoshis) break
	} 

	return {
		selected,
		total,
		satisfied: total >= targetSatoshis,
		remaining: utxos.filter(u => !selected.includes(u))
	} 
} 
