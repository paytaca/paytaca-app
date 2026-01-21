import { getStablehedgeBackend } from "src/wallet/stablehedge/api"
import { parseTokenData } from "src/wallet/stablehedge/token-utils"


/** @typedef {ReturnType<import("./state").default>} State */
/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 */
export function updateTokenBalances(context) {
  const chipnet = context.rootGetters['global/isChipnet']
  const walletIndex = context.rootGetters['global/getWalletIndex']
  const walletData = context.rootGetters['global/getWallet']('bch')

  const backend = getStablehedgeBackend(chipnet)
  const params = { wallet_hash: walletData.walletHash }
  return backend.get(`stablehedge/redemption-contracts/get_fiat_token_balances/`, { params })
    .then(response => {
      const data = response?.data
      if (!Array.isArray(data)) return Promise.reject({ response })

      context.commit('saveFiatTokenBalances', {
        walletHash: params?.wallet_hash,
        walletIndex: walletIndex,
        chipnet: chipnet,
        balances: data,
      })

      // Ensure Stablehedge tokens have proper metadata (logo, name, symbol) for UI token cards.
      // Stablehedge balances come from a dedicated endpoint and may not automatically populate
      // the general `assets` store with CashToken metadata.
      const stablehedgeAssetIds = new Set(
        data
          .map(bal => bal?.category)
          .filter(Boolean)
          .map(category => `ct/${category}`)
      )

      // Ensure every Stablehedge category exists as an `assets` entry so it can be
      // enriched via BCMR metadata (icon, symbol, decimals, etc).
      stablehedgeAssetIds.forEach(assetId => {
        const existing = context.rootGetters['assets/getAsset']?.(assetId)
        if (Array.isArray(existing) && existing.length) return
        context.commit('assets/addNewAsset', {
          id: assetId,
          symbol: '',
          name: '',
          logo: '',
          balance: 0,
          spendable: 0,
          is_nft: false,
        }, { root: true })
      })

      const fetchFromWatchtower = () => {
        return context.dispatch(
          'assets/getMissingAssets',
          {
            walletHash: walletData.walletHash,
            includeIgnoredTokens: true,
            isCashToken: true,
          },
          { root: true }
        ).then((missingAssets) => {
          if (!Array.isArray(missingAssets)) return
          missingAssets.forEach(asset => {
            if (!asset) return
            // Watchtower endpoints may return either `ct/<tokenId>` or raw `<tokenId>`
            // Normalize so downstream lookups (`ct/${category}`) work.
            const rawId = String(asset.id || '')
            const normalizedId = rawId.startsWith('ct/') ? rawId : (rawId ? `ct/${rawId}` : '')
            if (!normalizedId) return
            if (!stablehedgeAssetIds.has(normalizedId)) return
            context.commit('assets/addNewAsset', { ...asset, id: normalizedId }, { root: true })
          })
        })
      }

      const fetchFromBcmr = () => {
        // Prefer per-token metadata (including icon) from BCMR indexer.
        // This updates the existing `assets` entries in-place (via `updateAssetMetadata`).
        return Promise.allSettled(
          Array.from(stablehedgeAssetIds).map(assetId => {
            // `assets` is a namespaced module; root dispatch must be fully qualified.
            return context.dispatch('assets/getAssetMetadata', assetId, { root: true })
          })
        )
      }

      return Promise.allSettled([
        fetchFromWatchtower(),
        fetchFromBcmr(),
      ]).then(() => data)
    })
}

/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 * @param {Object} opts
 * @param {String[]} [opts.includeCategories]
 * @param {Number} [opts.minAge] only update token prices have timestamps older than specified age
 */
export function updateTokenPrices(context, opts) {
  /** @type {String[]} */
  let categories = context.getters.tokenBalances?.map(balance => balance?.category)
  const chipnet = context.rootGetters['global/isChipnet']
  const backend = getStablehedgeBackend(chipnet)

  if (Array.isArray(opts?.includeCategories)) {
    opts?.includeCategories?.forEach(category => {
      if (typeof category !== 'string') return
      if (categories.includes(category)) return
      categories.push(category)
    })
  }

  if (Number.isSafeInteger(opts?.minAge)) {
    const now = Date.now()
    categories = categories?.filter(category => {
      const token = context.state.fiatTokens.find(token => token?.category === category)
      const timestamp = token?.priceMessage?.messageTimestamp
      if (!Number.isFinite(timestamp)) return true
      return (now - timestamp) > opts?.minAge
    })
  }

  if (!categories?.length) return Promise.resolve()

  const params = {
    categories: categories.join(','),
    max_age: 90,
  }
  return backend.get('stablehedge/fiat-tokens/latest_prices/', { params })
    .then(response => {
      const results = response?.data
      if (!Array.isArray(results)) return Promise.reject({ response })

      results.forEach(result => {
        context.commit('saveTokenPrice', parseTokenData(result))
      })

      return response
    })
}

/**
 * @param {import("vuex").ActionContext<State, Getters>} context 
 * @param {Object} opts
 * @param {Boolean} [opts.chipnet]
 * @param {String[]} opts.categories
 */
export function updateTokenData(context, opts) {
  const chipnet = typeof opts?.chipnet === 'boolean'
    ? opts?.chipnet
    : context.rootGetters['global/isChipnet']

  const backend = getStablehedgeBackend(chipnet)
  const params = {
    categories: opts?.categories?.join(',') || '',
  }
  return backend.get(`stablehedge/fiat-tokens/`, { params })
    .then(response => {
      let results = []
      if (Array.isArray(response?.data)) results = response?.data
      if (Array.isArray(response?.data?.results)) results = response?.data?.results

      results.forEach(result => {
        context.commit('saveTokenData', parseTokenData(result))
      })
    })
}
