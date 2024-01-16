import { Customer, Cart, Storefront, Location } from 'src/marketplace/objects'
import { DEVICE_LOCATION_ID_CONST } from './state'
import { aerialDistance } from 'src/marketplace/utils'

export function shopListOpts(state) {
  return state.shopListOpts
}

export function sessionLocation(state, getters) {
  if (state.selectedSessionLocationId === DEVICE_LOCATION_ID_CONST) {
    return getters.deviceLocation
  }
  return getters.customerLocations?.find?.(location => {
    return location?.id == state.selectedSessionLocationId
  })
}

export function deviceLocation(state) {
  const data = {
    isDeviceLocation: true,
    valid: false,
    age: NaN,
    expired: true,
    ...state?.location,
    formatted: Location.formatLocationData(state?.location),
  }
  data.valid = !isNaN(data?.coordinates?.latitude) && !isNaN(data?.coordinates?.longitude)
  data.age = (Date.now() - state?.location?.timestamp)
  data.expired = isNaN(data.age) || data.age > 86400
  return data
}

export function customerCoordinates(state, getters) {
  const deviceLocation = {
    id: getters.sessionLocation?.id,
    coordinates: {
      latitude: parseFloat(getters.sessionLocation?.latitude),
      longitude: parseFloat(getters.sessionLocation?.longitude)
    },
    valid: true,
    age: NaN,
    expired: false,
  }

  deviceLocation.valid = !isNaN(deviceLocation?.coordinates?.latitude) && !isNaN(deviceLocation?.coordinates?.longitude)
  if (deviceLocation.id === DEVICE_LOCATION_ID_CONST) {
    deviceLocation.age = (Date.now() - state?.location?.timestamp)
    deviceLocation.expired = isNaN(deviceLocation.age) || deviceLocation.age > 86400
  }
  return deviceLocation.coordinates
}

export function customer(state) {
  return Customer.parse(state?.customerData)
}

export function customerLocations(state) {
  if (!Array.isArray(state?.customerLocations)) return []
  return state.customerLocations.map(Location.parse)
}

export function getClosestCustomerLocation(state, getters) {
  return (coordinates={ latitude:null, longitude:null }, maxDistance=100) => {
    let minDistanceObj = null
    let minDistance = Infinity
    getters.customerLocations.forEach(location => {
      const distance = aerialDistance({ pos1: coordinates, pos2: location })
      if (distance <= maxDistance && distance < minDistance) {
        minDistance = distance
        minDistanceObj = location
      }
    })

    return minDistanceObj
  }
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
