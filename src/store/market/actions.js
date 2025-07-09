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
  // TODO: Fetching of price needs to be improved. Coingecko does not not have price quoute for 
  // most BCH and sBCH tokens currently. For SPICE, the price quote is wrong.
  // The filters below is meant to only have BCH as result. This is temporary.
  const mainchainAssets = context.rootGetters['assets/getAssets'].filter(asset => asset?.id?.indexOf?.('/') === -1)
  const smartchainAssets = context.rootGetters['sep20/getAssets'].filter(asset => asset?.id?.indexOf?.('/') === -1)

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

  const smartchain = smartchainAssets.map(asset => {
    if (asset?.id == 'bch') return {
      asset,
      coin: { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
    }

    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => coin?.platforms?.smartbch)

    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    return { asset, coin }
  })

  return { mainchain, smartchain }
}

export async function updateAssetPrices (context, { clearExisting = false, customCurrency = null }) {
  const selectedCurrency = context.state.selectedCurrency?.symbol
  const assetList = await context.dispatch('getAllAssetList')
  const coinIds = [...assetList.mainchain, ...assetList.smartchain]
    .map(({ coin }) => coin && coin.id)
    .filter(Boolean)
    .filter((e, i, s) => s.indexOf(e) === i)

  const vsCurrencies = [selectedCurrency, customCurrency]
    .filter(Boolean)
    .filter((element, index, array) => array.indexOf(element) === index)

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
  if (selectedCurrency) {
    const loweredSelectedCurrency = String(selectedCurrency).toLowerCase()
    fetchUsdRate = !coinIds.map(coinId => prices?.[coinId]?.[loweredSelectedCurrency]).every(Boolean)
  }

  const newAssetPrices = [...assetList.mainchain, ...assetList.smartchain]
    .filter(({ coin, asset }) => coin?.id && asset?.id)
    .map(({ asset, coin }) => {
      return {
        assetId: asset.id,
        coinId: coin.id,
        prices: prices[coin.id]
      }
    })

  if (clearExisting) context.commit('clearAssetPrices')
  context.commit('updateAssetPrices', newAssetPrices)
  if (fetchUsdRate) context.dispatch('updateUsdRates', { currency: selectedCurrency })
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
    const { data } = await axios.get(`https://api.yadio.io/rate/${currency}/USD`)
    if (!data.rate) return Promise.reject()
    rates = [
      { symbol: String(currency), rate: data.rate, timestamp: data?.timestamp }
    ]
  } else {
    const { data } = await axios.get('https://api.yadio.io/exrates/USD')
    if (!data.USD) return Promise.reject()

    rates = Object.getOwnPropertyNames(data)
      .map(symbol => {
        if (typeof data[symbol] !== 'string') return
        return { symbol, rate: data[symbol], timestamp: data?.timestamp }
      })
      .filter(Boolean)
  }

  context.commit('updateUsdRates', rates)
  return Promise.resolve(rates)
}
