import { DEVICE_LOCATION_ID_CONST } from "./state"

export function setShopListOpts(state, data) {
  Object.assign(state.shopListOpts, data)
}

export function setSelectedSessionLocationId(state, id=DEVICE_LOCATION_ID_CONST) {
  state.selectedSessionLocationId = id
}

/**
 * @param {Object} state
 * @param {Object} data
 * @param {String} data.address1
 * @param {String} data.address2
 * @param {String} data.street
 * @param {String} data.city
 * @param {String} data.state
 * @param {String} data.zip_code
 * @param {String} data.country
 * @param {Number} data.latitude
 * @param {Number} data.longitude
 * @param {Number} data.timestamp
 */
export function updateLocationData(state, data) {
  state.location = Object.assign({}, data, {
    id: DEVICE_LOCATION_ID_CONST,
    address1: data?.address1,
    address2: data?.address2,
    street: data?.street,
    city: data?.city,
    state: data?.state,
    country: data?.country,
    zip_code: data?.zip_code,
    latitude: data?.latitude,
    longitude: data?.longitude,
    timestamp: data?.timestamp,
  })
}

/**
 * @param {Object} state 
 * @param {Object} data 
 * @param {Number} data.id
 * @param {String} data.ref
 * @param {Number} data.first_name
 * @param {Number} data.last_name
 * @param {Number} data.phone_number
 * @param {Object} data.default_location
 * @param {Number} data.default_location.id
 * @param {String} data.default_location.address1
 * @param {String} data.default_location.address2
 * @param {String} data.default_location.street
 * @param {String} data.default_location.city
 * @param {String} data.default_location.state
 * @param {String} data.default_location.zip_code
 * @param {String} data.default_location.country
 * @param {String} data.default_location.longitude
 * @param {String} data.default_location.latitude
 * @param {Object} data.paytaca_wallet
 * @param {String} data.paytaca_wallet.wallet_hash
 * @param {String} data.paytaca_wallet.verifying_pubkey
 * @param {Number} data.paytaca_wallet.verifying_pubkey_index
 */
export function setCustomerData(state, data) {
  state.customerData = data
}

/**
 * 
 * @param {Object} state 
 * @param {Object} data
 * @param {Number} data.id
 * @param {String} data.address1
 * @param {String} data.address2
 * @param {String} data.street
 * @param {String} data.city
 * @param {String} data.state
 * @param {String} data.zip_code
 * @param {String} data.country
 * @param {String} data.longitude
 * @param {String} data.latitude
 */
export function addCustomerLocation(state, data) {
  if (!Array.isArray(state?.customerLocations)) state.customerLocations = []

  const index = state.customerLocations.findIndex(location => location?.id == data?.id)
  if (index >= 0) state.customerLocations[index] = data
  else state.customerLocations.push(data)
}

export function removeCustomerLocation(state, locationId) {
  if (!Array.isArray(state?.customerLocations)) return
  state.customerLocations = state.customerLocations.filter(location => location?.id != locationId)
}

export function clearCustomerLocations(state) {
  state.customerLocations = []
}

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
 * @param {String} data.orders_review_summary.average_rating
 * @param {String} data.orders_review_summary.count
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
 * @param {Boolean} data.require_cutlery
 * @param {String} data.ref
 * @param {Number} data.cutlery_subtotal
 * @param {Number} data.subtotal
 * @param {Number} data.markup_subtotal
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
