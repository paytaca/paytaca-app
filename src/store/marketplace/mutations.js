export function setActiveStorefrontId(state, storefrontId) {
  state.activeStorefrontId = storefrontId
}
export function setActiveCartId(state, cartId) {
  state.activeCartId = cartId
}

/**
 * @param {Object} state 
 * @param {Object} data
 * @param {Number} data.id
 * @param {Number} data.shop_id
 * @param {String} data.image_url
 * @param {String} data.name
 * @param {{ code:String, currency:String }} data.currency
 * @param {Object} data.location
 * @param {Number} data.location.id
 * @param {String} data.location.address1
 * @param {String} data.location.address2
 * @param {String} data.location.street
 * @param {String} data.location.city
 * @param {String} data.location.state
 * @param {String} data.location.zip_code
 * @param {String} data.location.country
 * @param {String} data.location.longitude
 * @param {String} data.location.latitude
 */
export function cacheStorefront(state, data) {
  if (!data?.id) return
  if (!Array.isArray(state.storefronts)) state.storefronts = []

  const index = state.storefronts.findIndex(_storefront => _storefront?.id == data?.id)
  if (index >= 0) state.storefronts[index] = data
  else state.storefronts.push(data)
}


/**
 * @typedef {Object} VariantAPI
 * @property {Number} id
 * @property {String} name
 * @property {String} code
 * @property {Number} price
 * @property {String} image_url
 * @property {{id:String, name:String, image_url:String }} product
 * @property {Number} total_stocks
 * @property {Number} expired_stocks
 * 
 * @param {Object} state 
 * @param {Object} data 
 * @param {Number} data.id
 * @param {Number} data.storefront_id
 * @param {String} data.ref
 * @param {Number} data.subtotal
 * @param {{ variant:VariantAPI, quantity:Number }[]} items
 */
export function cacheCart(state, data) {
  if (!data?.id) return
  if (!Array.isArray(state.carts)) state.carts = []

  const index = state.carts.findIndex(_cart => _cart?.id == data?.id)
  if (index >= 0) state.carts[index] = data
  else state.carts.push(data)
}

/**
 * @param {Object} state 
 * @param {Number} cartId 
 */
export function removeCart(state, cartId) {
  if (!Array.isArray(state.carts)) return
  state.carts = state.carts.filter(cart => cart?.id != cartId)
}

/**
 * @param {Object} state 
 * @param {Number} storefrontId
 */
export function removeStorefrontCarts(state, storefrontId) {
  if (!Array.isArray(state.carts)) return
  state.carts = state.carts.filter(cart => cart?.storefront_id != storefrontId)
}
