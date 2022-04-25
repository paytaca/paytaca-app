import axios from 'axios'

export function updateCoinsList(context, { force = true }) {
  if (Array.isArray(context.state.coinsList) && context.state.coinsList.length && !force)
    return { data: context.state.coinsList, _fromVuexStore: true }

  return axios
    .get(
      'https://api.coingecko.com/api/v3/coins/list',
      { params: { include_platform: true } },
    )
    .then(response => {
      // console.log(response)
      if (Array.isArray(response.data)) {
        context.commit('updateCoinsList', response.data)
        return response
      }
      return Promise.reject({ response })
    })
}

export async function updateSupportedCurrencies(context, { force = true }) {
  if (Array.isArray(context.state.currencyOptions) && context.state.currencyOptions.length >= 1 && !force) return

  const { data:currencies } = await axios.get('https://api.coingecko.com/api/v3/simple/supported_vs_currencies')
  // console.log(currencies)
  context.commit('updateCurrencyOptions', currencies)
}

/**
 * @returns {
 *    mainchain: { asset: { id:String, symbol:String }, coin: { id:String } }[],
 *    smartchain: { asset: { id:String, symbol:String }, coin: { id:String } }[],
 *  }
 */
export function getAllAssetList(context) {
  const mainchainAssets = context.rootGetters['assets/getAssets']
  const smartchainAssets = context.rootGetters['sep20/getAssets']
  // console.log(mainchainAssets)
  // console.log(smartchainAssets)

  const mainchain = mainchainAssets.map(asset => {
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => !coin.platforms || Object.getOwnPropertyNames(coin.platforms).length <= 1)
    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    // console.log(asset.name, filteredSymbol, filteredPlatform)
    return { asset, coin }
  })

  const smartchain = smartchainAssets.map(asset => {
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => coin.platforms && coin.platforms.smartbch)

    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    // console.log(asset.name, filteredSymbol, filteredPlatform)
    return { asset, coin }
  })
 
  return { mainchain, smartchain }
}


export async function updateAssetPrices(context, { clearExisting = false }) {
  const assetList = await context.dispatch('getAllAssetList')
  console.log(assetList)
  const coinIds = [] 
  coinIds.push(
    ...assetList.mainchain
      .map(({ coin }) => coin.id)
      .filter(Boolean)
      .filter((e, i, s) => s.indexOf(e) === i),
    ...assetList.smartchain
      .map(({ coin }) => coin.id)
      .filter(Boolean)
      .filter((e, i, s) => s.indexOf(e) === i),
  )

  const { data: prices } = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price',
    {
      params: {
        ids: coinIds.join(','),
        vs_currencies: context.state.selectedCurrency,
      }
    }
  )

  const newAssetPrices = [...assetList.mainchain, ...assetList.smartchain].map(({ asset, coin }) => {
    return {
      assetId: asset.id,
      coinId: coin.id,
      prices: prices[coin.id],
    }
  })

  if (clearExisting) context.commit('clearAssetPrices')
  context.commit('updateAssetPrices', newAssetPrices)
}
