import { getMnemonic, Wallet } from '../../wallet'
import { axiosInstance } from '../../boot/axios'
import { convertIpfsUrl, getBcmrBackend } from 'src/wallet/cashtokens'
import {
  getWatchtowerApiUrl,
  getBlockChainNetwork,
  getWalletByNetwork
} from 'src/wallet/chipnet'
import Watchtower from 'watchtower-cash-js'


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
  const balanceUrl = `${url}/balance/wallet/${walletHash}`

  if (isCashToken) {
    url += '/cashtokens/fungible/'
  } else {
    url += '/tokens/'
  }
  const { data } = await axiosInstance.get(url, { params: filterParams })

  if (!Array.isArray(data.results)) return []

  if (isCashToken) {
    const finalData = []
    const mnemonic = await getMnemonic(context.rootGetters['global/getWalletIndex'])
    let wallet = new Wallet(mnemonic, context.rootGetters['global/network'])
    wallet = getWalletByNetwork(wallet, 'bch')
    
    for (const result of data.results) {
      const tokenId = result.id.split('/')[1]
      const tokenDetails = await wallet.getTokenDetails(tokenId)
      
      // exclude tokens without metadata
      if (tokenDetails !== null) {
        const finalBalUrl = `${balanceUrl}/${tokenId}/`
        const response = await axiosInstance.get(finalBalUrl)
        tokenDetails.balance = response.data.balance
        finalData.push(tokenDetails)
      }
    }
    return finalData
  }
  return data.results
}

export async function saveExistingAsset (context, details) {
  const vault = context.getters.getVault
  // check if vault keys are valid
  if (vault.length > 0) {
    if (!vault[0].hasOwnProperty('asset') || !vault[0].hasOwnProperty('chipnet_assets') ) {
      context.commit('clearVault')
    }
  }
  if (context.getters.isVaultEmpty) {
    if (details.walletHash) {
      let assets = context.getters.getAllAssets
      assets = JSON.stringify(assets)
      assets = JSON.parse(assets)

      context.commit('updateVault', { index: details.index, asset: assets })
    }
  }
}

/**
 * @param {Object} context 
 * @param {Object} opts 
 * @param {Boolean} opts.chipnet
 * @param {Boolean} opts.excludeCurrentIndex
 */
export async function updateVaultBchBalances(context, opts) {
  const watchtower = new Watchtower(opts?.chipnet)

  const _vault = context.getters.getVault;
  const vault = JSON.parse(JSON.stringify(_vault));
  if (!Array.isArray(vault)) throw new Error('Invalid vault data', vault)

  const vaultWalletHashes = context.rootGetters['global/getVault']
    ?.map(walletVault => {
      const walletData = opts?.chipnet ? walletVault?.chipnet?.bch : walletVault?.wallet?.bch
      return walletData?.walletHash
    })

  const results = await Promise.allSettled(
    vault.map((assetsVault, index) => {
      const walletIndex = context.rootGetters['global/getWalletIndex']
      if (index === walletIndex && opts?.excludeCurrentIndex) return

      const assets = opts?.chipnet ? assetsVault?.chipnet_assets : assetsVault?.asset

      const bchAsset = assets?.find?.(asset => asset?.id === 'bch')
      if (!bchAsset) return 'No BCH asset found'

      const walletHash = vaultWalletHashes[index]
      if (!walletHash) return 'No wallet hash found'

      return watchtower.Wallet.getBalance({ walletHash })
        .then(response => {
          bchAsset.balance = response.balance
          bchAsset.spendable = response.spendable
          return bchAsset
        })
    })
  )

  vault.forEach((assetsVault, index) => {
    context.commit('updateVault', { index: index, asset: assetsVault })
  })

  return results
}

export async function getAssetMetadata (context, assetId) {
  if (!assetId) return
  const tokenType = assetId.split('/')[0]
  const tokenId = assetId.split('/')[1]

  if (tokenType !== 'ct') return

  const url = 'tokens/' + tokenId + '/'
  const response = await getBcmrBackend().get(url)
  const _metadata = response.data
  let data

  if (_metadata.error) {
    data = null
  } else {
    let imageUrl
    if (_metadata.token.uris) {
      imageUrl = _metadata.token.uris.icon || ''
    } else {
      imageUrl = _metadata.uris.icon || ''
    }
    data = {
      'id': 'ct/' + tokenId,
      'isNft': _metadata.is_nft,
      'name': _metadata.name,
      // 'description': _metadata.description,
      'symbol': _metadata.token.symbol,
      'decimals': parseInt(_metadata.token.decimals) || 0,
      'logo': convertIpfsUrl(imageUrl)
    }
  }

  if (data !== null) {
    context.commit('updateAssetMetadata', data)
    return data
  }
}

export function filterFavoriteAssets (context, assets) {
  let temp = []

  console.log('here: ', assets)
  return assets.filter(asset => asset.favorite === 1)

}


export async function initializeFavorites (context, assets) {  
  let iterate = assets.length > 10 ? 10 : assets.length

  const isInitialized = context.getters.initializedFavorites  

  if (!isInitialized) {    
    for (let i = 0; i < iterate; i++) {
      let temp = {
        id: assets[i].id,
        favorite: 1
      }  
     context.commit('updateAssetFavorite', temp)
    }
    context.commit('initializeFavorites', true)    
  }  
}