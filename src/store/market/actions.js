import axios from 'axios'

export async function updateSupportedCurrencies (context, { force = true }) {
  if (Array.isArray(context.state.currencyOptions) && context.state.currencyOptions.length >= 1 && !force) return

  const { data } = await axios.get('https://api.yadio.io/currencies')
  const currencies = Object.getOwnPropertyNames(data)
    .map(symbol => {
      if (typeof data[symbol] !== 'string') return
      return { symbol, name: data[symbol] }
    })
    .filter(Boolean)
  context.commit('updateCurrencyOptions', currencies)
  return Promise.resolve(currencies)
}

/**
 * @returns {
 *    mainchain: { asset: { id:String, symbol:String }, coin: { id:String } }[],
 *    smartchain: { asset: { id:String, symbol:String }, coin: { id:String } }[],
 *  }
 */
export function getAllAssetList (context) {
  // TODO: Fetching of price needs to be improved. Coingecko does not have price quote for 
  // most BCH tokens currently. For SPICE, the price quote is wrong.
  // The filters below is meant to only have BCH as result. This is temporary.
  const mainchainAssets = context.rootGetters['assets/getAssets'].filter(asset => asset?.id?.indexOf?.('/') === -1)

  const mainchain = mainchainAssets.map(asset => {
    if (asset?.id == 'bch') return {
      asset,
      coin: { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
    }

    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => Object.getOwnPropertyNames(coin?.platforms || {}).length <= 1)
    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    return { asset, coin }
  })

  return { mainchain, smartchain: [] }
}

export async function updateAssetPrices (context, { clearExisting = false, customCurrency = null, assetId = null }) {
  // Use getter to get selected currency (checks vault settings first, then module state)
  const selectedCurrency = context.getters.selectedCurrency
  const currencySymbol = selectedCurrency?.symbol
  
  // If assetId is provided, use the unified endpoint to fetch price for that specific asset
  // This works for tokens (ct/..., slp/...) as well as BCH
  if (assetId) {
    // Request only the user's currency - the API should return prices in the requested currency
    const vsCurrencies = [currencySymbol, customCurrency]
      .filter(Boolean)
      .filter((element, index, array) => array.indexOf(element) === array.lastIndexOf(element))
    
    if (!vsCurrencies.length) return
    
    // Normalize asset ID for API (uppercase for BCH, keep as-is for tokens)
    const normalizedAssetId = assetId === 'bch' ? 'BCH' : assetId
    
    try {
      const { data } = await axios.get(
        'https://watchtower.cash/api/asset-prices/',
        {
          params: {
            assets: normalizedAssetId,
            vs_currencies: vsCurrencies.join(',')
          }
        }
      )
      
      if (!data?.prices || !Array.isArray(data.prices)) return
      
      // Build prices object from response
      // Filter by asset to ensure we get the correct price for this specific asset
      // Note: For tokens, API returns tokens/currency (e.g., tokens per PHP), but we need currency/token (e.g., PHP per token)
      // For BCH, API returns currency/BCH (e.g., PHP per BCH) which is already in the correct format
      const prices = {}
      const priceIds = {} // Store price_id per currency
      const isToken = assetId && assetId !== 'bch' && assetId.includes('/')
      
      data.prices.forEach(priceData => {
        // Since we're requesting a single asset, all prices in the response should be for that asset
        // However, if the API includes an asset field, we should verify it matches
        if (priceData?.asset) {
          // Match the asset to ensure we're getting the right price
          // Handle both normalized and original asset ID formats
          const responseAsset = String(priceData.asset).toLowerCase().trim()
          const expectedAsset = normalizedAssetId.toLowerCase().trim()
          const originalAssetIdLower = assetId.toLowerCase().trim()
          
          // Match if response asset matches either normalized or original asset ID
          if (responseAsset !== expectedAsset && responseAsset !== originalAssetIdLower) {
            return
          }
        }
        // If no asset field exists, assume it's for the requested asset (since we only requested one)
        
        // Check for price data - handle different possible field names
        const currency = priceData?.currency || priceData?.vs_currency || priceData?.currency_symbol
        const priceValue = priceData?.price_value || priceData?.price || priceData?.value
        const priceId = priceData?.id || priceData?.price_id
        
        if (!currency || priceValue === undefined || priceValue === null) return
        
        const currencyLower = String(currency).toLowerCase()
        const rawPrice = parseFloat(priceValue)
        if (!isFinite(rawPrice)) return
        
        // For tokens, convert from tokens/currency to currency/token (take reciprocal)
        // For BCH, use the price directly as it's already currency/BCH
        // Only take reciprocal if rawPrice is not zero to avoid division by zero
        const price = isToken && rawPrice !== 0 ? 1 / rawPrice : rawPrice
        
        prices[currencyLower] = price
        // Store price_id if available
        if (priceId) {
          priceIds[currencyLower] = priceId
        }
      })
      
      // Only commit prices if we actually have at least one price
      // This prevents committing empty prices object when API succeeds but no prices match
      const hasPrices = Object.keys(prices).length > 0
      if (!hasPrices) return
      
      const newAssetPrices = [{
        assetId: assetId,
        prices: prices,
        priceIds: priceIds // Store price_ids per currency
      }]
      
      if (clearExisting) context.commit('clearAssetPrices')
      context.commit('updateAssetPrices', newAssetPrices)
      
      return
    } catch (error) {
      console.error('Error fetching asset price:', error)
      return
    }
  }
  
  // For bulk updates, still use the old method with getAllAssetList for backwards compatibility
  const assetList = await context.dispatch('getAllAssetList')
  
  let assetsToFetch = [...assetList.mainchain, ...assetList.smartchain]
  
  const coinIds = assetsToFetch
    .map(({ coin }) => coin && coin.id)
    .filter(Boolean)
    .filter((e, i, s) => s.indexOf(e) === i)

  const vsCurrencies = [currencySymbol, customCurrency]
    .filter(Boolean)
    .filter((element, index, array) => array.indexOf(element) === array.lastIndexOf(element))

  const { data: priceDataList } = await axios.get(
    'https://watchtower.cash/api/market-prices/',
    {
      params: {
        coin_ids: coinIds.join(','),
        currencies: vsCurrencies.join(','),
      }
    }
  )
  const prices = {
    // <coin_id> : { <currency>: <price> },
  }
  priceDataList.map(data => {
    const price = parseFloat(data?.price_value)
    if (!data?.currency || !data?.relative_currency || !price) return
    const currency = String(data?.currency).toLowerCase()
    let coinId = String(data?.relative_currency).toLowerCase()
    if (coinId === 'bch') coinId = 'bitcoin-cash' // watchtower uses BCH while coingecko uses 'bitcoin-cash'

    if (!prices[coinId]) prices[coinId] = {}
    prices[coinId][currency] = price
  })

  let fetchUsdRate = false
  if (currencySymbol) {
    const loweredSelectedCurrency = String(currencySymbol).toLowerCase()
    fetchUsdRate = !coinIds.map(coinId => prices?.[coinId]?.[loweredSelectedCurrency]).every(Boolean)
  }

  const newAssetPrices = assetsToFetch
    .filter(({ coin, asset }) => coin?.id && asset?.id)
    .map(({ asset, coin }) => {
      return {
        assetId: asset.id,
        coinId: coin.id,
        prices: prices[coin.id]
      }
    })

  if (clearExisting) {
    context.commit('clearAssetPrices')
    // When clearing, pass as full update to ensure clean state
    context.commit('updateAssetPrices', { assetPrices: newAssetPrices, isFullUpdate: true })
  } else {
    // For bulk updates without explicit clear, don't treat as full update
    // to preserve existing token prices that aren't included in this update
    // (getAllAssetList only returns assets without '/' in ID, excluding tokens)
    context.commit('updateAssetPrices', { assetPrices: newAssetPrices, isFullUpdate: false })
  }
  if (fetchUsdRate) context.dispatch('updateUsdRates', { currency: currencySymbol })
}

/**
 * 
 * @param {Object} context 
 * @param {Object} param1 
 * @param {String} [param1.currency] - currency to update, empty value will update all available USD rates
 * @param {Number} [param1.priceDataAge] - will skip updating if last update is less than specified value in ms. works only if `currency` is specified
 * @returns 
 */
export async function updateUsdRates (context, { currency, priceDataAge }) {
  let rates = []

  if (currency) {
    if (isFinite(priceDataAge) && priceDataAge > 0) {
      const usdRate = context.state?.usdRates?.[currency]
      const lastUpdate = context.state.usdRatesLastUpdate?.[currency]
      if (isFinite(usdRate) && isFinite(lastUpdate) && Date.now() - priceDataAge < lastUpdate) {
        return [{ symbol: String(currency), rate: usdRate, timestamp: lastUpdate }]
      }
    }
    try {
      const { data } = await axios.get(`https://api.yadio.io/rate/${currency}/USD`)
      if (!data.rate) {
        return Promise.reject(new Error(`No rate data returned for currency: ${currency}`))
      }
      // API returns rate from currency to USD (e.g., 1 PHP = 0.018 USD)
      // But we need rate from USD to currency (e.g., 1 USD = 55.56 PHP)
      // So we need to take the reciprocal
      const rateFromUsdToCurrency = 1 / parseFloat(data.rate)
      rates = [
        { symbol: String(currency), rate: rateFromUsdToCurrency, timestamp: data?.timestamp }
      ]
    } catch (error) {
      console.error('Error fetching USD rate from API:', error)
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
  } else {
    const { data } = await axios.get('https://api.yadio.io/exrates/USD')
    if (!data.USD) return Promise.reject(new Error('No USD rate data returned from API'))

    rates = Object.getOwnPropertyNames(data)
      .map(symbol => {
        if (typeof data[symbol] !== 'string') return
        // API returns rates from currency to USD, we need USD to currency
        const rateFromUsdToCurrency = 1 / parseFloat(data[symbol])
        return { symbol, rate: rateFromUsdToCurrency, timestamp: data?.timestamp }
      })
      .filter(Boolean)
  }

  context.commit('updateUsdRates', rates)
  return Promise.resolve(rates)
}
