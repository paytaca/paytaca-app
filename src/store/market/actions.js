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
    const isSpice = String(asset.id).toLowerCase() === 'slp/4de69e374a8ed21cbddd47f2338cc0f479dc58daa2bbe11cd604ca488eca0ddf'
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
      .filter(coin => String(coin.name).toLowerCase() === String(asset.name).toLowerCase() || isSpice)
    const filteredPlatform = filteredSymbol
      .filter(coin => !coin.platforms || Object.getOwnPropertyNames(coin.platforms).length <= 1)
    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    // console.log(asset.name, filteredSymbol, filteredPlatform)
    return { asset, coin }
  })

  const smartchain = smartchainAssets.map(asset => {
    const isSpice = String(asset.id).toLowerCase() === 'sep20/0xe11829a7d5d8806bb36e118461a1012588fafd89'
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
      .filter(coin => String(coin.name).toLowerCase() === String(asset.name).toLowerCase() || isSpice)
    const filteredPlatform = filteredSymbol
      .filter(coin => {
        if (isSpice) return !coin.platforms || Object.getOwnPropertyNames(coin.platforms).length <= 1

        return coin.platforms && coin.platforms.smartbch
      })

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
      .map(({ coin }) => coin && coin.id)
      .filter(Boolean)
      .filter((e, i, s) => s.indexOf(e) === i),
    ...assetList.smartchain
      .map(({ coin }) => coin && coin.id)
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

  const newAssetPrices = [...assetList.mainchain, ...assetList.smartchain]
    .filter(({ coin }) => coin && coin.id)
    .filter(({ asset }) => asset && asset.id)
    .map(({ asset, coin }) => {
      return {
        assetId: asset.id,
        coinId: coin.id,
        prices: prices[coin.id],
      }
    })

  if (clearExisting) context.commit('clearAssetPrices')
  context.commit('updateAssetPrices', newAssetPrices)
}


export async function updateMainchainAssetPrices(context, { commit=true }) {
  const mainchainAssets = context.rootGetters['assets/getAssets'].map(asset => {
    const filteredSymbol = context.state.coinsList
      .filter(coin => String(coin.symbol).toLowerCase() === String(asset.symbol).toLowerCase())
    const filteredPlatform = filteredSymbol
      .filter(coin => !coin.platforms || Object.getOwnPropertyNames(coin.platforms).length <= 1)
    const coin = filteredPlatform.length ? filteredPlatform[0] : filteredSymbol[0]
    // console.log(asset.name, filteredSymbol, filteredPlatform)
    return { asset, coin }
  })

  const coinIds = mainchainAssets.map(({ coin }) => coin && coin.id).filter(Boolean)
  const { data: prices } = await axios.get(
    'https://api.coingecko.com/api/v3/simple/price',
    {
      params: {
        ids: coinIds.join(','),
        vs_currencies: context.state.selectedCurrency,
      }
    }
  )

  const marketPrices = mainchainAssets.map(({ asset, coin }) => {
    return {
      assetId: asset.id,
      coinId: coin.id,
      prices: prices[coin.id],
    }
  })

  if (commit) context.commit('updateAssetPrices', marketPrices)
  return marketPrices
}

export async function updateSmartchainPrices(context, { commit=true }) {
  const smartchainAssets = context.rootGetters['sep20/getAssets']
    .map(asset => {
      const match = String(asset.id).match(/^sep20\/(0x[0-9a-fA-F]*)$/)
      console.log(match)
      if (!match) return
      return { asset, address: match[1] }
    })
    .filter(Boolean)
  const addresses = smartchainAssets.map(asset => asset.address).filter(Boolean)
    

  const { data: prices } = await axios.get(
    'https://api.coingecko.com/api/v3/simple/token_price/smartbch',
    {
      params: {
        contract_addresses: addresses.join(','),
        vs_currencies: context.state.selectedCurrency,
      }
    }
  )

  const marketPrices = smartchainAssets
    .map(({ asset, address }) => {
      if (!address) return
      if (!prices[address.toLowerCase()]) return

      return {
        assetId: asset.id,
        contractAddress: address,
        prices: prices[address.toLowerCase()],
      }
    })
    .filter(Boolean)

  if (commit) context.commit('updateAssetPrices', marketPrices)
  console.log(marketPrices)
  return marketPrices
}

export async function updateAssetPrices2(context, { clearExisting = false }) {
  const mainchainMarketPrices = await context.dispatch('updateMainchainAssetPrices', { commit: false })
  const smartchainMarketPrices = await context.dispatch('updateSmartchainPrices', { commit: false })
  console.log(smartchainMarketPrices)

  const newAssetPrices = [
    ...mainchainMarketPrices,
    ...smartchainMarketPrices,
  ]
  
  if (clearExisting) context.commit('clearAssetPrices')
  context.commit('updateAssetPrices', newAssetPrices)
}
