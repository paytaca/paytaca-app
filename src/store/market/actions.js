import axios from 'axios'

async function sleep (ms) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetries (fn, { retries = 3, initialDelayMs = 500 } = {}) {
  let attempt = 0
  let delay = initialDelayMs
  while (attempt < retries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn()
    } catch (e) {
      attempt += 1
      if (attempt >= retries) throw e
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay)
      delay *= 2
    }
  }
}

function normalizeCurrencySymbol (symbol) {
  if (symbol === undefined || symbol === null) return null
  const s = String(symbol).trim()
  if (!s) return null
  return s.toUpperCase()
}

function buildVsCurrencies (currencySymbol, customCurrency) {
  // Always include USD so we can fall back to USD-based conversions when needed.
  return [currencySymbol, customCurrency, 'USD']
    .map(normalizeCurrencySymbol)
    .filter(Boolean)
    // Keep the first occurrence of duplicates (do NOT drop all occurrences).
    .filter((element, index, array) => array.indexOf(element) === index)
}

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
  // assetId can be a single string or an array of strings for batching
  if (assetId) {
    const assetIds = Array.isArray(assetId) ? assetId : [assetId]
    if (!assetIds.length) return

    const vsCurrencies = buildVsCurrencies(currencySymbol, customCurrency)
    
    if (!vsCurrencies.length) return

    const BATCH_SIZE = 10
    const batches = []
    for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
      batches.push(assetIds.slice(i, i + BATCH_SIZE))
    }
    
    try {
      const results = await Promise.allSettled(batches.map(async (batch) => {
        const normalizedAssetIds = batch.map(id => id === 'bch' ? 'BCH' : id)
        
        const { data } = await axios.get(
          'https://watchtower.cash/api/asset-prices/',
          {
            params: {
              assets: normalizedAssetIds.join(','),
              vs_currencies: vsCurrencies.join(',')
            }
          }
        )
        
        if (!data?.prices || !Array.isArray(data.prices)) return []
        
        return { prices: data.prices, batch }
      }))
      
      // Group prices by asset ID from all batch responses
      const pricesByAsset = {}
      
      results.forEach(result => {
        if (result.status !== 'fulfilled' || !result.value) return
        const { prices: priceDataList, batch } = result.value
        
        priceDataList.forEach(priceData => {
          const responseAssetRaw = priceData?.asset
          if (!responseAssetRaw) return
          
          const responseAsset = String(responseAssetRaw).toLowerCase().trim()
          
          const matchedRequestId = batch.find(requestId => {
            const normalized = requestId === 'bch' ? 'bch' : requestId.toLowerCase().trim()
            return responseAsset === normalized || responseAsset === (requestId === 'bch' ? 'bch' : requestId.toLowerCase().trim())
          })
          if (!matchedRequestId) return
          
          const isToken = matchedRequestId !== 'bch' && matchedRequestId.includes('/')
          
          const currency = priceData?.currency || priceData?.vs_currency || priceData?.currency_symbol
          const priceValue = priceData?.price_value || priceData?.price || priceData?.value
          const priceId = priceData?.id || priceData?.price_id
          
          if (!currency || priceValue === undefined || priceValue === null) return
          
          const currencyLower = String(currency).toLowerCase()
          const rawPrice = parseFloat(priceValue)
          if (!isFinite(rawPrice)) return
          
          const price = isToken && rawPrice !== 0 ? 1 / rawPrice : rawPrice
          
          if (!pricesByAsset[matchedRequestId]) {
            pricesByAsset[matchedRequestId] = { prices: {}, priceIds: {} }
          }
          pricesByAsset[matchedRequestId].prices[currencyLower] = price
          if (priceId) {
            pricesByAsset[matchedRequestId].priceIds[currencyLower] = priceId
          }
        })
      })
      
      const newAssetPrices = Object.entries(pricesByAsset).map(([id, data]) => ({
        assetId: id,
        prices: data.prices,
        priceIds: data.priceIds
      }))
      
      if (!newAssetPrices.length) return
      
      if (clearExisting) context.commit('clearAssetPrices')
      context.commit('updateAssetPrices', newAssetPrices)
      
      return
    } catch (error) {
      console.error('Error fetching asset prices:', error)
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

  const vsCurrencies = buildVsCurrencies(currencySymbol, customCurrency)

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
 * Refresh market data right after a fiat currency switch.
 * Keeps UI safe by marking prices as "updating" until fresh data arrives.
 */
export async function refreshMarketDataForSelectedCurrency (context, { assetIds = ['bch'] } = {}) {
  const selectedCurrency = context.getters.selectedCurrency
  const currencySymbol = selectedCurrency?.symbol ? String(selectedCurrency.symbol).toUpperCase() : null
  context.commit('setIsUpdatingPrices', true)
  context.commit('setLastCurrencySwitchAt', Date.now())
  context.commit('setPendingCurrencySymbol', currencySymbol)

  try {
    const uniqueAssetIds = Array.isArray(assetIds) ? [...new Set(assetIds.filter(Boolean))] : ['bch']
    if (!uniqueAssetIds.includes('bch')) uniqueAssetIds.push('bch')

    // Batch all asset IDs into a single API call
    const pricePromise = context.dispatch('updateAssetPrices', {
      assetId: uniqueAssetIds,
      clearExisting: false,
    })

    const fxPromise = currencySymbol
      ? withRetries(
        () => context.dispatch('updateUsdRates', { currency: currencySymbol, priceDataAge: 0 }),
        { retries: 3, initialDelayMs: 500 },
      )
      : Promise.resolve()

    await Promise.allSettled([pricePromise, fxPromise])
  } finally {
    context.commit('setIsUpdatingPrices', false)
    context.commit('setPendingCurrencySymbol', null)
  }
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
