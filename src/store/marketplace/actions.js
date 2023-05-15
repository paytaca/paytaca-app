import { backend } from 'src/marketplace/backend'
import { Cart } from 'src/marketplace/objects'

export function getCartRef(context) {
  const walletHash = context.rootGetters['global/getWallet']('bch')?.walletHash
  if (walletHash) return `wallet:${walletHash}`
  return ''
}

export async function refreshActiveStorefrontCarts(context) {
  const storefront = context.getters['activeStorefront']
  if (!storefront?.id) return Promise.reject('No active storefront')
  return context.dispatch('refreshStorefrontCarts', { storefrontId: storefront?.id })
}

export async function refreshStorefrontCarts(context, opts={ storefrontId: 0 }) {
  const params = {
    storefront_id: opts?.storefrontId || '',
    is_open: true,
    ref: await context.dispatch('getCartRef'),
    limit: 5,
  }

  return backend.get(`connecta/carts`, { params })
    .then(response => {
      if (!Array.isArray(response?.data?.results)) return Promise.reject({ response })
      context.commit('removeStorefrontCarts', opts?.storefrontId)
      response?.data?.results.map(cartData => context.commit('cacheCart', cartData))
      return response
    })
}

/**
 * @param {Object} context 
 * @param {Cart} cart 
 */
export function saveCart(context, cart) {
  return cart.save().then(() => {
    context.commit('cacheCart', cart.raw)
  })
}

/**
 * 
 * @param {Object} context 
 * @param {Object} opts 
 * @param {Number} opts.cartId id of the cart to fetch
 * @param {Boolean} opts.existsInCache if true, the cart must be list of cached carts already
 * 
 */
export function refreshCart(context, opts={ cartId: 0, existsInCache: false }) {
  if (!opts?.cartId) return Promise.reject('No cart id')
  const cart = context.getters.carts.find(cart => cart?.id == opts?.cartId)

  if (cart) {
    return cart.refetch().then(response => {
      context.commit('cacheCart', cart.raw)
      return response
    })
  } else if (!opts?.existsInCache) {
    return backend.get(`connecta/carts/${cartId}/`).then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      context.commit('cacheCart', response?.data)
      return response
    })
  }

  return Promise.reject('Skipped')
}

export async function removeCart(context, opts={ cartId: 0, excludeApi: false }) {
  if (!opts?.excludeApi) {
    await backend.delete(`connecta/carts/${opts?.cartId}/`)
      .catch(error => {
        if (error?.response?.status === 404) return error?.response
        return Promise.reject(error)
      })
  }

  context.commit('removeCart', opts?.cartId)
}