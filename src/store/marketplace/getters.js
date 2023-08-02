import { Customer, Cart, Storefront } from 'src/marketplace/objects'

export function shopListOpts(state) {
  return state.shopListOpts
}

export function customerCoordinates(state, getters) {
  const deviceLocation = {
    coordinates: { lat: parseFloat(state.location?.lat), lon: parseFloat(state.location?.lon) },
    valid: false,
    age: NaN,
    expired: true,
  }

  deviceLocation.valid = !isNaN(deviceLocation?.coordinates?.lat) && !isNaN(deviceLocation?.coordinates?.lon)
  deviceLocation.age = (Date.now() - state?.location?.timestamp)
  deviceLocation.expired = isNaN(deviceLocation.age) || deviceLocation.age > 86400
  if (deviceLocation.valid && !deviceLocation.expired) {
    return deviceLocation.coordinates
  } else if (getters.customer?.defaultLocation?.validCoordinates) {
    return {
      lat: parseFloat(getters.customer?.defaultLocation?.latitude),
      lon: parseFloat(getters.customer?.defaultLocation?.longitude),
    }
  } else if (deviceLocation.valid) {
    return deviceLocation.coordinates
  }
}

export function customer(state) {
  return Customer.parse(state?.customerData)
}

export function storefronts(state) {
  if (!Array.isArray(state?.storefronts)) return []
  return state.storefronts.map(Storefront.parse)
}

export function carts(state) {
  if (!Array.isArray(state?.carts)) return []
  return state.carts.map(Cart.parse)
}

export function getStorefront(state, getters) {
  return (storefrontId) => {
    return getters.storefronts.find(storefront => storefront?.id == storefrontId)
  }
}

export function getStorefrontCurrency(state, getters) {
  return (storefrontId) => {
    return getters.getStorefront(storefrontId)?.currency?.code
  }
}

export function getCartsForStorefront(state, getters) {
  return (storefrontId) => {
    return getters.carts.filter(cart => {
      return (cart?.storefrontId || cart?.storefront_id) == storefrontId
    })
  }
}

export function activeStorefront(state, getters) {
  return getters.getStorefront(state.activeStorefrontId)
}

export function activeStorefrontCarts(state, getters) {
  return getters.getCartsForStorefront(state.activeStorefrontId).filter(cart => !cart?.orderId)
}

export function activeStorefrontCart(state, getters) {
  const carts = getters.activeStorefrontCarts
  return carts.find(cart => cart?.id === state.activeCartId) || carts[0]
}
