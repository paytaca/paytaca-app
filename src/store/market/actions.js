import axios from 'axios'

export function updateCoinsList (context, { force = true }) {
  if (Array.isArray(context.state.coinsList) && context.state.coinsList.length && !force) {
    return { data: context.state.coinsList, _fromVuexStore: true }
  }

  return axios
    .get(
      'https://api.coingecko.com/api/v3/coins/list',
      { params: { include_platform: true } }
    )
    .then(response => {
      console.log(response)
      if (Array.isArray(response.data)) {
        context.commit('updateCoinsList', response.data)
        return response
      }
      return Promise.reject({ response })
    })
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
  // TODO: Fetching of price needs to be improved. Coingecko does not not have price quoute for 
  // most BCH and sBCH tokens currently. For SPICE, the price quote is wrong.
  // The filters below is meant to only have BCH as result. This is temporary.
  const mainchainAssets = context.rootGetters['assets/getAssets'].filter(asset => asset.id.indexOf('/') === -1)
  const smartchainAssets = context.rootGetters['sep20/getAssets'].filter(asset => asset.id.indexOf('/') === -1)

  const mainchain = mainchainAssets.map(asset => {
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => !coin.platforms || Object.getOwnPropertyNames(coin.platforms).length <= 1)
    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    return { asset, coin }
  })

  const smartchain = smartchainAssets.map(asset => {
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => {
        return coin.platforms && coin.platforms.smartbch
      })

    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    return { asset, coin }
  })

  return { mainchain, smartchain }
}

export async function updateAssetPrices (context, { clearExisting = false }) {
  const selectedCurrency = context.state.selectedCurrency?.symbol
  const assetList = await context.dispatch('getAllAssetList')
  const coinIds = []
  coinIds.push(
    ...assetList.mainchain
      .map(({ coin }) => coin && coin.id)
      .filter(Boolean)
      .filter((e, i, s) => s.indexOf(e) === i),
    ...assetList.smartchain
      .map(({ coin }) => coin && coin.id)
      .filter(Boolean)
      .filter((e, i, s) => s.indexOf(e) === i)
  )

  const vsCurrencies = ['usd']
  if (selectedCurrency && selectedCurrency != 'ARS') vsCurrencies.push(selectedCurrency)

  const { data: prices } = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price',
    {
      params: {
        ids: coinIds.join(','),
        vs_currencies: vsCurrencies.join(','),
      }
    }
  )

  const newAssetPrices = [...assetList.mainchain, ...assetList.smartchain]
    .filter(({ coin }) => coin && coin.id)
    .filter(({ asset }) => asset && asset.id)
    .map(({ asset, coin }) => {
      return {
        assetId: asset.id,
        coinId: coin.id,
        prices: prices[coin.id]
      }
    })

  if (clearExisting) context.commit('clearAssetPrices')
  context.commit('updateAssetPrices', newAssetPrices)
  context.dispatch('updateUsdRates', { currency: selectedCurrency })
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
