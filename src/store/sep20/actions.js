import { axiosInstance } from '../../boot/axios'
import { getSep20Contract } from '../../wallet/sbch/utils'

function getTokenIdFromAssetId(assetId) {
  const match = String(assetId).match(/^sep20\/(0x[0-9a-fA-F]+)$/)
  if (match && match[1]) return match[1]
  return null
}


/**
 * Updates an asset's icon if there is none, can be configured to force update
 * @param {Object} context 
 * @param {{ assetId: String, forceUpdate:Boolean }} param1 
 */
 export async function updateTokenIcon(context, { assetId, forceUpdate=false }) {
  const assets = context.getters.getAsset(assetId)
  if (assets && assets.length && assets[0] && assets[0].logo && !forceUpdate) {
    return assets[0].logo
  }

  const tokenId = getTokenIdFromAssetId(assetId)
  if (!tokenId) return null

  const { data: token } = await axiosInstance.get(`https://watchtower.cash/api/smartbch/token-contracts/${tokenId}`)
  if (token && token.image_url) {
    context.commit('updateAssetImageUrl', { assetId, imageUrl: token.image_url })
    return token.image_url
  }

  return null
}
  

/**
 * Fetch assets without icon, can be configured to 
 * @param {Object} context 
 * @param {{all: Boolean}} param1 
 */
export async function updateTokenIcons(context, { all=false }) {
  if (!Array.isArray(context.state.assets)) return []

  let tokenAssets = context.state.assets
    .filter(asset => getTokenIdFromAssetId(asset && asset.id))

  if (!all) tokenAssets = tokenAssets.filter(asset => asset && !asset.logo)

  const tokenAddresses = tokenAssets
    .map(asset => getTokenIdFromAssetId(asset && asset.id))

  const { data } = await axiosInstance.get(
    'https://watchtower.cash/api/smartbch/token-contracts/',
    { params: { token_addresses: tokenAddresses.join(','), limit: tokenAddresses.length, has_image: true } }
  )

  const addressImageUrlMap = {}
  if (Array.isArray(data && data.results)) {
    data.results.forEach(tokenInfo => {
      if (!tokenInfo) return
      addressImageUrlMap[String(tokenInfo.address).toLowerCase()] = tokenInfo.image_url
    })
  }

  const updatedAssets = []
  tokenAssets.forEach(asset => {
    const address = getTokenIdFromAssetId(asset && asset.id)
    if (!address) return
    const data = {
      assetId: asset.id,
      imageUrl: addressImageUrlMap[address.toLowerCase()]
    }
    context.commit('updateAssetImageUrl', data)
    updatedAssets.push(data)
  })

  return updatedAssets
}

/**
 * 
 * @param {Object} context 
 * @param {{ address: String, filterWithBalance: Boolean, includeIgnoredTokens: Boolean }} param1 
 */
export async function getMissingAssets(context, { address, filterWithBalance=true, icludeIgnoredTokens=false }) {
  const filterParams = {
    token_type: 20,
    wallet_addresses: address,
  }

  if (Array.isArray(context.state.assets) && context.state.assets.length) {
    filterParams.exclude_addresses = context.state.assets
      .map(asset => {
        const match = String(asset && asset.id).match(/^sep20\/(0x[a-fA-F0-9]+)$/)
        if (!match) return
        return match[1]
      })
      .filter(Boolean)
      .join(',')
  }

  if (!icludeIgnoredTokens && context.getters.ignoredTokenIds.length) {
    let ignoredTokensStr = context.getters.ignoredTokenIds.join(',')
    if (filterParams.exclude_addresses) ignoredTokensStr = ',' + ignoredTokensStr
    filterParams.exclude_addresses += ignoredTokensStr
  }

  const { data } = await axiosInstance.get(
    'https://watchtower.cash/api/smartbch/token-contracts/',
    { params: filterParams }
  )

  if (!Array.isArray(data.results) && data.results.length) return []
  if (!filterWithBalance) return data.results

  const contracts = data.results
    .map(tokenInfo => tokenInfo && tokenInfo.address)
    .filter(Boolean)
    .map(tokenAddress => getSep20Contract(tokenAddress, false))

  const addresses = await Promise.all(contracts.map(async (contract) => {
    try {
      const balance = await contract.balanceOf(address)
      if (balance > 0) return contract.address
    } catch (err) { console.error(err) }
    return
  }))

  return data.results.filter(tokenInfo => {
    if (!tokenInfo || !tokenInfo.address) return false
    return addresses.filter(Boolean).map(addr => addr.toLowerCase()).indexOf(tokenInfo.address.toLowerCase()) >= 0
  })
}
