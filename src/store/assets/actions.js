import es from 'src/i18n/es'
import { axiosInstance } from '../../boot/axios' 
import { getWatchtowerApiUrl, getBlockChainNetwork } from 'src/wallet/chipnet'

function getTokenIdFromAssetId (assetId) {
  const match = String(assetId).match(/^slp\/([0-9a-fA-F]+)$/)
  if (match && match[1]) return match[1]
  return null
}

export async function getSLPTokenStats ({ getters, commit }, { tokenId }) {
  const existingTokenStats = getters.getAssetStats(tokenId)
  if (existingTokenStats && existingTokenStats.id) return existingTokenStats

  const tokenStats = null // await getTokenStatsAPI(tokenId)
  const assetStats = {
    id: tokenStats.id,
    name: tokenStats.name,
    symbol: tokenStats.symbol
  }
  commit(
    'updateAssetStats',
    assetStats
  )

  return assetStats
}

/**
 * Updates an asset's icon if there is none, can be configured to force update
 * @param {Object} context
 * @param {{ assetId: String, forceUpdate:Boolean }} param1
 */
export async function updateTokenIcon (context, { assetId, forceUpdate = false }) {
  const assets = context.getters.getAsset(assetId)
  if (assets && assets.length && assets[0] && assets[0].logo && !forceUpdate) {
    return assets[0].logo
  }

  const tokenId = getTokenIdFromAssetId(assetId)
  if (!tokenId) return null

  const baseUrl = getWatchtowerApiUrl(context.rootGetters['global/isChipnet'])
  const { data: token } = await axiosInstance.get(`${baseUrl}/tokens/${tokenId}`)
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
export async function updateTokenIcons (context, { all = false }) {
  const network = getBlockChainNetwork()
  let assets = context.state.assets
  if (network === 'chipnet') {
    assets = context.state.chipnet__assets
  }

  if (!Array.isArray(assets)) return []

  let slpAssets = assets.filter(asset => getTokenIdFromAssetId(asset && asset.id))

  if (!all) slpAssets = slpAssets.filter(asset => asset && !asset.logo)

  const updatedAssets = []
  await Promise.all(
    slpAssets.map(asset => {
      return context.dispatch('updateTokenIcon', { assetId: asset.id, forceUpdate: all })
        .then(imageUrl => {
          updatedAssets.push({
            assetId: asset.id,
            imageUrl: imageUrl
          })
        })
    })
  )

  return updatedAssets
}

/**
 *
 * @param {Object} context
 * @param {{ walletHash:String, includeIgnoredTokens: Boolean }} param1
 */
export async function getMissingAssets (
  context,
  {
    walletHash,
    includeIgnoredTokens = false,
    isCashToken = false
  }
) {
  const filterParams = {
    has_balance: true,
    token_type: 1,
    wallet_hash: walletHash
  }
  const network = getBlockChainNetwork()
  let assets = context.state.assets
  if (network === 'chipnet') {
    assets = context.state.chipnet__assets
  }

  if (Array.isArray(assets) && assets.length) {
    const regex = isCashToken ? /^ct\/([a-fA-F0-9]+)$/ : /^slp\/([a-fA-F0-9]+)$/

    filterParams.exclude_token_ids = assets
      .map(asset => {
        const match = String(asset && asset.id).match(regex)
        if (!match) return
        return match[1]
      })
      .filter(Boolean)
      .join(',')
  }

  if (!includeIgnoredTokens && context.getters.ignoredTokenIds.length) {
    let ignoredTokensStr = context.getters.ignoredTokenIds.join(',')
    if (filterParams.exclude_token_ids) ignoredTokensStr = ',' + ignoredTokensStr
    filterParams.exclude_token_ids += ignoredTokensStr
  }
  
  let url = getWatchtowerApiUrl(context.rootGetters['global/isChipnet'])
  if (isCashToken) {
    url += '/cashtokens/fungible/'
  } else {
    url += '/tokens/'
  }
  console.log(url)
  const { data } = await axiosInstance.get(url, { params: filterParams })

  if (!Array.isArray(data.results)) return []
  return data.results
}

export async function saveExistingAsset (context, details) {
  if (context.getters.isVaultEmpty) {
    if (details.walletHash) {
      let asset = context.getters.getAssets
      asset = JSON.stringify(asset)
      asset = JSON.parse(asset)

      // console.log('Saving Existing Asset')
      context.commit('updateVault', { index: details.index, asset: asset })
    }
  }
}

export async function getAssetMetadata (context, assetId) {
  const tokenType = assetId.split('/')[0]
  const tokenId = assetId.split('/')[1]

  if (tokenType !== 'ct') return

  let url = getWatchtowerApiUrl(context.rootGetters['global/isChipnet'])
  url += `/cashtokens/fungible/${tokenId}/`

  let { data } = await axiosInstance.get(url)
  data.id = assetId
  context.commit('updateAssetMetadata', data)
}
