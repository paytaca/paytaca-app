import { backend } from 'src/marketplace/backend'
import { Cart } from 'src/marketplace/objects'

export function getCartRef(context) {
  const walletHash = context.rootGetters['global/getWallet']('bch')?.walletHash
  if (walletHash) return `wallet:${walletHash}`
  return ''
}

export async function refreshStorefrontCarts(context, opts={ storefrontId: 0 }) {
  const params = {
    storefront_id: opts?.storefrontId || '',
    ref: await context.dispatch('getCartRef'),
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