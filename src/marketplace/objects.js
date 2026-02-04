import { nativeFileAPI } from "src/utils/native-file"
import { backend, cachedBackend } from "./backend"
import { decompressEncryptedMessage, decryptMessage, decompressEncryptedImage, decryptImage } from "./chat/encryption"
import { formatOrderStatus, lineItemPropertiesToText, parseOrderStatusColor } from './utils'

export class Location {
  static parse(data) {
    return new Location(data)
  }

  /**
   * @param {Location} data
   */
  static formatLocationData(data) {
    const addressStr = [data.address2, data.address1].filter(Boolean).join(' ')
    return [addressStr, data.street, data.city, data.state, data.country].filter(Boolean).join(', ')  
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data 
   * @param {Number} data.id
   * @param {String} data.name
   * @param {String} data.address1
   * @param {String} data.address2
   * @param {String} data.street
   * @param {String} data.city
   * @param {String} data.state
   * @param {String} data.country
   * @param {String} data.longitude
   * @param {String} data.latitude
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.name = data?.name
    this.address1 = data?.address1
    this.address2 = data?.address2
    this.street = data?.street
    this.city = data?.city
    this.state = data?.state
    this.country = data?.country
    this.longitude = data?.longitude
    this.latitude = data?.latitude
  }

  get formatted() {
    const addressStr = [this.address2, this.address1].filter(Boolean).join(' ')
    return [addressStr, this.street, this.city, this.state, this.country].filter(Boolean).join(', ') 
  }

  get formattedCityAddress() {
    return [this.city, this.state || this.country].filter(Boolean).join(', ') 
  }

  get validCoordinates() {
    return isFinite(parseFloat(this.longitude)) && isFinite(parseFloat(this.latitude))
  }

  get gmapsDirectionUrl() {
    if (!this.validCoordinates) return ''
    const destination = `${this.latitude},${this.longitude}`
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${destination}`
  }
}

export class FungibleCashToken {
  static parse(data) {
    return new FungibleCashToken(data)
  }
  
  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data 
   * @param {String} data.category
   * @param {String} data.name
   * @param {String} data.description
   * @param {String} data.symbol
   * @param {Number} data.decimals
   * @param {String} data.image_url
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.category = data?.category
    this.name = data?.name
    this.description = data?.description
    this.symbol = data?.symbol
    this.decimals = data?.decimals
    this.imageUrl = data?.image_url
  }
}


export class User {
  static parse(data) {
    return new User(data)
  }

  static parseShopRole(shopRole) {
    return {
      shopId: shopRole?.shop_id,
      roles: Array.isArray(shopRole?.roles) ? shopRole?.roles : [],
    }
  }

  constructor(data) {
    this.raw = data
    this.$state = {
      updating: false,
    }
  }

  get raw() {
    return this.$raw
  }
  
  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} [data.profile_picture_url]
   * @param {String} [data.email]
   * @param {String} [data.username]
   * @param {String} data.first_name
   * @param {String} data.last_name
   * @param {String} [data.phone_number]
   * @param {{ user_id:Number, shop_id:Number, roles:String[] }[]} [data.shop_roles]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.profilePictureUrl = data?.profile_picture_url
    this.email = data?.email
    this.username = data?.username
    this.firstName = data?.first_name
    this.lastName = data?.last_name
    this.phoneNumber = data?.phone_number
    if (Array.isArray(data?.shop_roles)) {
      this.shopRoles = data.shop_roles.map(User.parseShopRole)
    } else {
      this.shopRoles = [].map(User.parseShopRole)
    }
  }

  get fullName() {
    return [this.firstName, this.lastName].filter(Boolean).join(' ')
  }

  getRolesFromShop(shopId) {
    const shopRole = this.shopRoles?.find?.(shopRole => shopRole?.shopId == shopId)
    if (Array.isArray(shopRole?.roles)) return shopRole.roles
    return []
  }
}


export class Storefront {
  static parse(data) {
    return new Storefront(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @typedef {'local_delivery' | 'store_pickup' | 'shipping'} DeliveryType
   * 
   * @param {Object} data 
   * @param {Number} data.id
   * @param {Boolean} data.active
   * @param {Number} data.shop_id
   * @param {String} data.name
   * @param {String} data.image_url
   * @param {String} [data.phone_number]
   * @param {{ code:String, symbol:String }} data.currency
   * @param {DeliveryType[]} data.delivery_types
   * @param {String} data.open_status
   * @param {[String, String]} [data.next_open_hours]
   * @param {{ average_rating: String | Number, count: Number }} [data.orders_review_summary]
   * @param {Boolean} data.in_prelaunch
   * @param {String} data.launch_date
   * @param {Object} data.location
   * @param {Number} [data.distance]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.active = data?.active
    this.shopId = data?.shop_id
    this.name = data?.name
    this.imageUrl = data?.image_url
    this.phoneNumber = data?.phone_number
    this.currency = {
      code: data?.currency?.code,
      symbol: data?.currency?.symbol,
    }
    this.deliveryTypes = data?.delivery_types
    this.openStatus = data?.open_status
    if (data?.next_open_hours?.[0] && data?.next_open_hours?.[1]) {
      this.nextOpenHours = [
        new Date(data?.next_open_hours?.[0]),
        new Date(data?.next_open_hours?.[1]),
      ]
    } else {
      this.nextOpenHours = undefined
    }

    if (data?.orders_review_summary) {
      this.ordersReviewSummary = {
        averageRating: parseFloat(data?.orders_review_summary?.average_rating),
        count: data?.orders_review_summary?.count,
      }
    } else if (this.ordersReviewSummary) delete this.ordersReviewSummary

    this.inPrelaunch = data?.in_prelaunch
    if (data?.launch_date) this.launchDate = new Date(data?.launch_date)
    else if (this.launchDate) delete this.launchDate

    if (data?.location) this.location = Location.parse(data?.location)
    else if (this.location) this.location = undefined

    this.distance = data?.distance
  }

  get isStorepickupOnly() {
    if (!Array.isArray(this.deliveryTypes)) return

    return this.deliveryTypes.length === 1 && this.deliveryTypes[0] === Checkout.DeliveryTypes.STORE_PICKUP
  }

  get isOpen() {
    if (this.openStatus == 'open') return true
    if (this.openStatus == 'closed') return false
    if (this.nextOpenHours?.[0] && this.nextOpenHours?.[1]) {
      const openTimestamp = this.nextOpenHours?.[0] * 1
      const closeTimestamp = this.nextOpenHours?.[1] * 1
      const currentTimestamp = Date.now()
      return openTimestamp <= currentTimestamp &&
             closeTimestamp > currentTimestamp
    }
    return false
  }
  
  get nextOpenTimestamp() {
    return this.nextOpenHours?.[0]
  }

  get openingTimeText() {
    const date = this.nextOpenTimestamp;
    if (!date) return ''

    const currentDate = new Date();
    if (currentDate >= date) return ''

    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);
  
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = daysOfWeek[date.getDay()];
  
    const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  
    if (date.toDateString() === currentDate.toDateString()) {
      return `Opens at ${date.toLocaleTimeString('en-US', options)}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Open tomorrow at ${date.toLocaleTimeString('en-US', options)}`;
    } else {
      return `Opens on ${dayOfWeek} at ${date.toLocaleTimeString('en-US', options)}`;
    }
  }
}


export class StorefrontProduct {
  static parse(data) {
    return new StorefrontProduct(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.storefront_id
   * @param {Number} data.product_id
   * @param {Boolean} data.available
   * @param {Boolean} data.require_stocks
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.storefrontId = data?.storefront_id
    this.productId = data?.product_id
    this.available = data?.available
    this.requireStocks = data?.require_stocks
  }
}


export class Collection {
  static parse(data) {
    return new Collection(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data 
   * @param {Number} data.id
   * @param {Number} data.storefront_id
   * @param {String} data.image_url
   * @param {String} data.name
   * @param {Number} data.products_count
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.storefrontId = data?.storefront_id
    this.imageUrl = data?.image_url
    this.name = data?.name
    this.productsCount = data?.products_count
  }
}

export class Variant {
  static parse(data) {
    return new Variant(data)
  }

  /**
   * @param {any} data 
   * @param {Product} [product] 
   */
  constructor(data, product) {
    this.raw = data
    if (product) this.product = product
    this.$state = {
      updating: false,
    }
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data 
   * @param {Number} data.id
   * @param {Number} data.position
   * @param {String} data.code
   * @param {String} data.image_url
   * @param {String} data.name
   * @param {Number} data.price
   * @param {Number} data.markup_price
   * @param {Number} data.total_stocks
   * @param {Number} data.expired_stocks
   * @param {{ id:Number, name:String, image_url:String }} [data.product]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.position = data?.position
    this.code = data?.code
    this.imageUrl = data?.image_url
    this.name = data?.name
    this.price = data?.price
    this.markupPrice = data?.markup_price
    this.totalStocks = data?.total_stocks
    this.expiredStocks = data?.expired_stocks

    if (data?.product?.id) this.product = Product.parse(data?.product)
  }

  get itemImage() {
    return this.imageUrl || this.product?.imageUrl
  }

  get itemName() {
    return [this?.product?.name, this.name].filter(Boolean).join(' - ')
  }

  get availableStocks() {
    if (this.expiredStocks === null || this.expiredStocks === undefined) {
      return this.totalStocks
    }
    return this.totalStocks - this.expiredStocks
  }
}

export class Product {
  static parse(data) {
    return new Product(data)
  }

  constructor(data) {
    this.raw = data
    this.$state = {
      updating: false,
      updatingCartOptions: false,
    }
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data 
   * @param {Number} data.id
   * @param {String} [data.code]
   * @param {String[]} data.categories
   * @param {String[]} [data.cart_options]
   * @param {Object[]} [data.addons]
   * @param {Number} [data.addons_count]
   * @param {Boolean} data.has_cart_options
   * @param {String} data.image_url
   * @param {String} [data.variant_image_url]
   * @param {String} data.name
   * @param {String} [data.description]
   * @param {Number} data.total_stocks
   * @param {Number} data.expired_stocks
   * @param {Number} data.variants_count
   * @param {Number} [data.min_price]
   * @param {Number} [data.max_price]
   * @param {Number} [data.min_markup_price]
   * @param {Number} [data.max_markup_price]
   * @param {Number} [data.storefront_id]
   * @param {String} [data.created_at]
   * @param {Object[]} [data.variants]
   * @param {Object[]} [data.storefront_products]
   * @param {{ average_rating: String | Number, count: Number }} [data.review_summary]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.code = data?.code
    if (Array.isArray(data?.categories)) this.categories = [...data.categories]
    if (Array.isArray(data?.cart_options)) this.cartOptions = [...data.cart_options]
    if (Array.isArray(data?.addons)) this.addons = data.addons.map(Addon.parse)
    this.addonsCount = data?.addons?.length ?? data?.addons_count
    this.hasCartOptions = data?.has_cart_options
    this.imageUrl = data?.image_url
    this.variantImageUrl = data?.variant_image_url
    this.name = data?.name
    this.description = data?.description
    this.totalStocks = data?.total_stocks
    this.expiredStocks = data?.expired_stocks
    this.variantsCount = data?.variants_count
    this.minPrice = data?.min_price
    this.maxPrice = data?.max_price
    this.minMarkupPrice = data?.min_markup_price
    this.maxMarkupPrice = data?.max_markup_price
    this.storefrontId = data?.storefront_id
    if(data?.created_at) this.createdAt = new Date(data?.created_at)

    this.updateVariants(data?.variants)

    this.storefrontProducts = data?.storefront_products?.map?.(StorefrontProduct.parse)
    if (data?.review_summary) {
      this.reviewSummary = {
        averageRating: parseFloat(data?.review_summary?.average_rating),
        count: data?.review_summary?.count,
      }
    } else if (this.reviewSummary) delete this.reviewSummary
  }

  get hasVariants() {
    return (this.variantsCount || this.variants?.length) > 1
  }

  get displayImageUrl() {
    if (this.imageUrl) return this.imageUrl
    if (this.variantImageUrl) return this.variantImageUrl

    if (Array.isArray(this.variants)) {
      return this.variants.map(variant => variant.imageUrl).find(Boolean)
    }
    return ''
  }

  updateVariants(variantsData=[]) {
    const oldVariants = this.variants
    this.variants = [].map(Variant.parse)
    if (Array.isArray(variantsData)) {
      this.variants = variantsData.map(variantData => {
        const existingVariant = oldVariants?.find?.(variant => variant?.id === variantData?.id)

        if (!existingVariant) return new Variant(variantData, this)
        existingVariant.raw = variantData
        existingVariant.product = this
        return existingVariant
      })
    }
  }
  
  updateVariantStocks() {
    if (!this.variants?.length) return
    const params = { product_id: this.id, limit: 100 }
    return backend.get(`variants/stocks_info/`, { params })
      .then(response => {
        const results = response?.data?.results
        if (!Array.isArray(results)) return
        this.variants.forEach(variant => {
          const data = results.find(data => data?.id === variant?.id)
          if (!data) return
          variant.raw = {
            ...variant.raw,
            ...data,
          }
        })
      })
  }

  availableAtStorefront(storefrontId) {
    if (!Array.isArray(this.storefrontProducts)) return
    const data = this.storefrontProducts.find(storefrontProduct => storefrontProduct?.storefrontId == storefrontId)
    return data?.available
  }

  availableAtStorefrontText(storefrontId) {
    const available = this.availableAtStorefront(storefrontId)
    if (typeof available !== 'boolean') return 
    return available ? 'Available' : 'Unavailable'
  }

  requireStocksAtStorefront(storefrontId) {
    if (!Array.isArray(this.storefrontProducts)) return
    const data = this.storefrontProducts.find(storefrontProduct => storefrontProduct?.storefrontId == storefrontId)
    return data?.requireStocks
  }

  addStorefrontProductData(data) {
    const storefrontProduct = StorefrontProduct.parse(data)
    if (!storefrontProduct?.storefrontId) return
    if (!Array.isArray(this.storefrontProducts)) this.storefrontProducts = []
    const index = this.storefrontProducts?.findIndex(_sp => _sp?.storefrontId == storefrontProduct?.storefrontId)
    if (index >= 0) this.storefrontProducts[index] = storefrontProduct
    else this.storefrontProducts.push(storefrontProduct)
  }

  async fetchStorefrontProduct(storefrontId=0) {
    if (!storefrontId) return Promise.resolve()
    const handle = `${storefrontId}-${this.id}`
    return backend.get(`connecta/storefront-products/${handle}/`)
      .then(response => {
        this.addStorefrontProductData(response?.data)
        return response
      })
  }

  async fetchCartOptions() {
    if (!this.id) return Promise.resolve()

    this.$state.updatingCartOptions = true
    const params = { ids: this.id }
    return backend.get(`products/cart_options/`, { params })
      .then(response => {
        const obj = response?.data?.results?.find(product => product?.id == this?.id)
        console.log('obj', obj)
        if (obj) {
          this.cartOptions = obj?.cart_options
          try {
            if (this.$raw) this.$raw.cart_options = obj?.cart_options
          } catch {}
        }
        return response
      })
      .finally(() => {
        this.$state.updatingCartOptions = false
      })
  }

  async fetchAddons() {
    if (!this.id) return Promise.resolve()

    this.$state.updatingAddons = true
    const params = { ids: this.id }
    return backend.get(`products/addons/`, { params })
      .then(response => {
        const obj = response?.data?.results?.find(product => product?.id == this?.id)
        console.log('obj', obj)
        if (obj) {
          this.addons = obj?.addons.map?.(Addon.parse)
          try {
            if (this.$raw) this.$raw.addons = obj?.addons
          } catch {}
        }
        return response
      })
      .finally(() => {
        this.$state.updatingAddons = false
      })
  }
}


export class Addon {
  static parse(data) {
    return new Addon(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.label
   * @param {Number} data.min_opts
   * @param {Number} data.max_opts
   * @param {{ id: Number, label: String, price: Number, markup_price: Number, require_input: Boolean }[]} data.options
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.label = data?.label
    this.minOpts = data?.min_opts
    this.maxOpts = data?.max_opts
    this.options = (Array.isArray(data?.options) ? data.options : []).map(option => {
      return {
        id: option?.id,
        label: option?.label,
        price: option?.price,
        markupPrice: option?.markup_price,
        requireInput: option?.require_input,
      }
    })
  }

  get hasOptions() {
    return this.options?.length > 1
  }

  get option() {
    if (!this.hasOptions) return
    return this.option[0]
  }

  get isRequired() {
    return this.minOpts >= 1
  }

  get singleOptionLabel() {
    if (this.hasOptions) return ''
    return [this.label, this.options?.[0]?.label].filter(Boolean).join('- ')
  }
}


export class LineItemAddon {
  static parse(data) {
    return new LineItemAddon(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  } 

  /**
   * @param {Object} data
   * @param {Number} data.addon_option_id
   * @param {String} data.label
   * @param {Number} data.price
   * @param {Number} data.markup_price
   * @param {String} data.input_value
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.addonOptionId = data?.addon_option_id
    this.label = data?.label
    this.price = data?.price
    this.markupPrice = data?.markup_price
    this.inputValue = data?.input_value
  }
}

export class CartItem {
  static parse(data) {
    return new CartItem(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  } 

  /**
   * @param {Object} data
   * @param {Object} data.variant
   * @param {Number} data.quantity
   * @param {Boolean} data.require_stocks
   * @param {{ schema:Object, data:Object }} [data.properties]
   * @param {Object[]} [data.addons]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    
    this.variant = Variant.parse(data?.variant)
    this.quantity = data?.quantity
    this.properties = data?.properties
    this.requireStocks = data?.require_stocks
    this.addons = (Array.isArray(data?.addons) ? data.addons: []).map(LineItemAddon.parse)
  }

  get propertiesText() {
    return lineItemPropertiesToText(this.properties?.data)
  }

  get lackingQuantity() {
    if (!this.variant) return
    if (!Number.isSafeInteger(this.variant.availableStocks)) return
    if (!this.requireStocks) return

    return this.quantity - this.variant.availableStocks
  }
}

export class Cart {
  static parse(data) {
    return new Cart(data)
  }

  constructor(data) {
    this.raw = data
    this.$state = {
      updating: false,
    }
  }

  get raw() {
    return this.$raw
  } 

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.order_id
   * @param {Number} data.storefront_id
   * @param {Boolean} data.require_cutlery
   * @param {Number} data.cutlery_subtotal
   * @param {Number} data.subtotal
   * @param {Number} data.markup_subtotal
   * @param {Object} data.customer
   * @param {Object[]} data.items
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.orderId = data?.order_id
    this.storefrontId = data?.storefront_id
    this.cutlerySubtotal = data?.cutlery_subtotal
    this.requireCutlery = data?.require_cutlery
    this.subtotal = data?.subtotal
    this.markupSubtotal = data?.markup_subtotal
    this.customer = Customer.parse(data?.customer)
    this.items = data?.items?.map?.(CartItem.parse)
  }

  get hasLackingQuantity() {
    return this.items.some(item => {
      return Number.isSafeInteger(item.lackingQuantity) && item.lackingQuantity > 0
    })
  }

  save() {
    const data = {
      storefront_id: this.storefrontId,
      require_cutlery: this.id ? this.requireCutlery : undefined,
      customer: null,
      items: this.items.map(item => {
        let properties
        if (item?.properties?.data && Object.getOwnPropertyNames(item?.properties?.data)?.length) {
          properties = item.properties
        }
        let addons
        if (Array.isArray(item.addons)) {
          addons = item.addons.map(lineItemAddon => {
            return {
              addon_option_id: lineItemAddon.addonOptionId,
              input_value: lineItemAddon.inputValue,
            }
          })
        }

        return {
          variant_id: item?.variant?.id,
          quantity: item?.quantity,
          properties: properties,
          addons: addons,
        }
      }).filter(item => !isNaN(item?.quantity) && item.quantity >= 0 && item?.quantity !== '')
    }

    if (this?.customer?.ref) {
      data.customer = {
        ref: this.customer?.ref || undefined,
        first_name: this.customer?.firstName,
        last_name: this.customer?.lastName,
      }
    }

    const request = this.id
      ? backend.patch(`connecta/carts/${this.id}/`, data)
      : backend.post(`connecta/carts/`, data)

    this.$state.updating = true
    return request
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.raw = response?.data
        return response
      })
      .finally(() => {
        this.$state.updating = false
      })
  }

  async refetch() {
    if (!this.id) return Promise.reject()

    this.$state.updating = true
    return backend.get(`connecta/carts/${this.id}/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.raw = response?.data
        return response 
      })
      .finally(() => {
        this.$state.updating = false
      })
  }

  get totalItemsCount() {
    let total = 0
    for(var i = 0; i < this.items.length; i++) {
      const quantity = this.items?.[i]?.quantity
      if (isNaN(quantity)) continue
      total += quantity
    }
    return total
  }
}


export class Customer {
  static parse(data) {
    return new Customer(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  } 

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.ref
   * @param {String} data.first_name
   * @param {String} data.last_name
   * @param {String} data.phone_number
   * @param {Object} data.default_location
   * @param {{wallet_hash:String, verifying_pubkey:String, verifying_pubkey_index:Number}} data.paytaca_wallet
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.ref = data?.ref
    this.firstName = data?.first_name
    this.lastName = data?.last_name
    this.phoneNumber = data?.phone_number
    if (data?.default_location) this.defaultLocation = Location.parse(data?.default_location)
    if (data?.paytaca_wallet) this.paytacaWallet = {
      walletHash: data?.paytaca_wallet?.wallet_hash,
      verifyingPubkey: data?.paytaca_wallet?.verifying_pubkey,
      verifyingPubkeyIndex: data?.paytaca_wallet?.verifying_pubkey_index,
    }
  }

  get fullName() {
    return [this.firstName, this.lastName].filter(Boolean).join(' ')
  }
}

export class BchPrice {
  static parse(data) {
    return new BchPrice(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {{ code:String, symbol: String }} data.currency
   * @param {Number} data.price
   * @param {String | Number} data.timestamp
   * @param {Number} [data.decimals]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.price = data?.price
    if (data?.timestamp) this.timestamp = new Date(data?.timestamp)
    else if (this.timestamp) delete this.timestamp
    this.decimals = data?.decimals
  }
}

export class DeliveryAddress {
  static parse(data) {
    return new DeliveryAddress(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.first_name
   * @param {String} data.last_name
   * @param {String} data.phone_number
   * @param {Object} data.location
   * @param {Number} [data.distance]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.firstName = data?.first_name
    this.lastName = data?.last_name
    this.phoneNumber = data?.phone_number
    this.location = Location.parse(data?.location)
    this.distance = data?.distance
  }

  get fullName() {
    return [this.firstName, this.lastName].filter(Boolean).join(' ')
  }
}

export class Checkout {
  static DeliveryTypes = Object.freeze({
    LOCAL_DELIVERY: 'local_delivery',
    STORE_PICKUP: 'store_pickup',
    SHIPPING: 'shipping',
  })

  static parse(data) {
    return new Checkout(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @typedef {Object} CurrencyInfo
   * @property {String} code
   * @property {String} symbol
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.order_id
   * @param {CurrencyInfo} data.currency
   * @param {Object} data.cart
   * @param {'local_delivery' | 'store_pickup' | 'shipping'} data.delivery_type
   * @param {Object} data.delivery_address
   * @param {Object} data.payment
   * @param {Number} [data.total_paid]
   * @param {Number} [data.total_pending_payment]
   * @param {Number} [data.total_payments]
   * @param {Number} [data.total_refunded]
   * @param {{ currency: CurrencyInfo, price: Number, timestamp: String | Number}} data.payment.bch_price
   * @param {Number} data.payment.delivery_fee
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.orderId = data?.order_id
    this.checkoutId = data?.checkout_id
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.cart = Cart.parse(data?.cart)
    this.deliveryType = data?.delivery_type
    this.deliveryAddress = DeliveryAddress.parse(data?.delivery_address)
    this.payment = {
      bchPrice: BchPrice.parse(data?.payment?.bch_price),
      deliveryFee: data?.payment?.delivery_fee,
      escrowRefundAddress: data?.payment?.escrow_refund_address,
      amountToken: data?.payment?.amount_token ? FungibleCashToken.parse(data?.payment?.amount_token) : null,
      deliveryFeeToken: data?.payment?.delivery_fee_token ? FungibleCashToken.parse(data?.payment?.delivery_fee_token) : null,
    }
    this.totalPaid = data?.total_paid
    this.totalPendingPayment = data?.total_pending_payment
    this.totalPayments = data?.total_payments
    this.totalRefunded = data?.total_refunded
  }

  get totalPaymentsSent() {
    return (parseFloat(this.totalPaid) || 0) + (parseFloat(this.totalPendingPayment) || 0)
  }

  get netPaymentsSent() {
    const totalRefunded = parseFloat(this.totalRefunded) || 0
    return this.totalPaymentsSent - totalRefunded
  }

  get total() {
    const total = (parseFloat(this.cart?.markupSubtotal) || 0) + (parseFloat(this.payment?.deliveryFee) || 0)
    return Math.round(total * 10 ** 3) / 10 ** 3
  }

  get change() {
    const change = Math.max(this.netPaymentsSent - this.total, 0)
    return Math.round(change * 10 ** 3) / 10 ** 3
  }

  get balanceToPay() {
    const balanceToPay = this.total - this.netPaymentsSent
    const roundedBalanceToPay = Math.round(balanceToPay * 10 ** 3) / 10 ** 3
    return Math.max(roundedBalanceToPay, 0)
  }

  updateBchPrice(opts={age: 60 * 1000, abortIfCompleted: true }) {
    if (opts?.abortIfCompleted && this?.orderId) return Promise.resolve('checkout is completed')
    if (opts?.age && this.payment?.bchPrice?.timestamp > Date.now() - opts?.age) {
      return Promise.resolve('price is still new')
    }

    return backend.post(`connecta/checkouts/${this.id}/update_bch_price/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.raw = response?.data
        return Promise.resolve(response)
      })
  }

  refetch() {
    if (!this.id) return Promise.reject()
    return backend.get(`connecta/checkouts/${this.id}/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.raw = response?.data
        return response 
      })
  }
}

export class OrderCallSession {
  static parse(data) {
    return new OrderCallSession(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.order_id
   * @param {{ id:Number, type:String, first_name:String, last_name:String }} data.caller
   * @param {String} [data.ended_at]
   * @param {String} data.created_at
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.caller = {
      id: data?.caller?.id,
      type: data?.caller?.type,
      firstName: data?.caller?.first_name,
      lastName: data?.caller?.last_name,
    }
    if (data?.ended_at) this.endedAt = new Date(data?.ended_at)
    else if (this.endedAt) delete this.endedAt

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
  }

  get hasEnded() {
    return Boolean(!this.id || this.endedAt)
  }
}


export class OrderItem {
  static parse(data) {
    return new OrderItem(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Object} data.variant
   * @param {Number} data.item_name
   * @param {Number} data.quantity
   * @param {Number} data.price
   * @param {Number} data.markup_price
   * @param {{ schema:Object, data:Object }} [data.properties]
   * @param {Object[]} [data.addons]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.variant = Variant.parse(data?.variant)
    this.itemName = data?.item_name
    this.quantity = data?.quantity
    this.price = data?.price
    this.markupPrice = data?.markup_price
    this.properties = data?.properties
    this.addons = (Array.isArray(data?.addons) ? data.addons: []).map(LineItemAddon.parse)
  }

  get displayPrice() {
    return this.markupPrice || this.price
  }

  get propertiesText() {
    return lineItemPropertiesToText(this.properties?.data)
  }
}


export class Order {
  static Status = Object.freeze({
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY_FOR_PICKUP: 'ready_for_pickup',
    PICKED_UP: 'picked_up',
    ON_DELIVERY: 'on_delivery',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  })
  static parse(data) {
    return new Order(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.checkout_id
   * @param {Number} data.storefront_id
   * @param {String} data.status
   * @param {{ code:String, symbol:String }} data.currency
   * @param {Object} data.bch_price
   * @param {Object} [data.customer]
   * @param {'local_delivery' | 'store_pickup' | 'shipping'} data.delivery_type
   * @param {Object} data.delivery_address
   * @param {Object[]} data.items
   * @param {Number} data.cutlery_subtotal
   * @param {Number} data.subtotal
   * @param {Number} data.markup_subtotal
   * @param {Number} data.total_paid
   * @param {Number} data.total_pending_payment
   * @param {Number} data.total_payments
   * @param {Number} data.total_refunded
   * @param {{ delivery_fee:Number, escrow_refund_address:String }} data.payment
   * @param {String} [data.cancel_reason]
   * @param {String | Number} data.created_at
   * @param {String | Number} data.updated_at
   * @param {String | Number} [data.auto_complete_at]
   * @param {String | Number} [data.preparation_deadline]
   * @param {String | Number} [data.delivery_deadline]
   * @param {Boolean} data.has_ongoing_dispute
   * @param {Object} [data.assigned_staff]
   * @param {Object} [data.dispute]
  */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.checkoutId = data?.checkout_id
    this.storefrontId = data?.storefront_id
    this.status = data?.status
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.bchPrice = BchPrice.parse(data?.bch_price)
    if (data?.customer) this.customer = Customer.parse(data?.customer)
    this.deliveryType = data?.delivery_type
    this.deliveryAddress = DeliveryAddress.parse(data?.delivery_address)
    this.items = data?.items?.map?.(OrderItem.parse)
    this.cutlerySubtotal = data?.cutlery_subtotal
    this.subtotal = data?.subtotal
    this.markupSubtotal = data?.markup_subtotal
    this.totalPaid = data?.total_paid
    this.totalPendingPayment = data?.total_pending_payment
    this.totalPayments = data?.total_payments
    this.totalRefunded = data?.total_refunded
    this.payment = {
      deliveryFee: data?.payment?.delivery_fee,
      escrowRefundAddress: data?.payment?.escrow_refund_address,
    }
    this.cancelReason = data?.cancel_reason

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    if (data?.updated_at) this.updatedAt = new Date(data?.updated_at)
    else if (this.updatedAt) delete this.updatedAt

    if (data?.auto_complete_at) this.autoCompleteAt = new Date(data?.auto_complete_at)
    else if (this.autoCompleteAt) delete this.autoCompleteAt

    if (data?.preparation_deadline) this.preparationDeadline = new Date(data?.preparation_deadline)
    else delete this.preparationDeadline

    if (data?.delivery_deadline) this.deliveryDeadline = new Date(data?.delivery_deadline)
    else delete this.deliveryDeadline

    if (data?.assigned_staff) this.assignedStaff = User.parse(data?.assigned_staff)
    else if (this.assignedStaff) delete this.assignedStaff

    this.hasOngoingDispute = data?.has_ongoing_dispute
    if (data?.dispute) this.dispute = OrderDispute.parse(data?.dispute)
  }

  get isCancelled() {
    return this.status === 'cancelled'
  }
  
  get inProgress() {
    return [
      // 'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'on_delivery',
    ].includes(this.status)
  }

  get formattedStatus() {
    if (!this.isStorePickup && this.isReadyForPickup) {
      return formatOrderStatus('order_prepared')
    }
    return formatOrderStatus(this.status)
  }

  get statusColor() {
    return parseOrderStatusColor(this.status)
  }

  get markupAmount() {
    const markupAmount = parseFloat(this.markupSubtotal - this.subtotal)
    return Math.round(markupAmount * 10 ** 3) / 10 ** 3
  }

  get total() {
    const total = Number(this?.payment?.deliveryFee) + Number(this.markupSubtotal)
    return Math.round(total * 10 ** 3) / 10 ** 3
  }

  get totalPayable() {
    const totalPayments = parseFloat(this.totalPayments) || 0
    return this.total - totalPayments
  }

  get totalPaymentsSent() {
    return (parseFloat(this.totalPaid) || 0) + (parseFloat(this.totalPendingPayment) || 0)
  }

  get netPaymentsSent() {
    const totalRefunded = parseFloat(this.totalRefunded) || 0
    return this.totalPaymentsSent - totalRefunded
  }

  get balanceToPay() {
    const balanceToPay = this.total - this.netPaymentsSent
    const roundedBalanceToPay = Math.round(balanceToPay * 10 ** 3) / 10 ** 3
    return Math.max(roundedBalanceToPay, 0)
  }

  get change() {
    const totalPaid = (parseFloat(this.totalPaid) || 0)
    const totalRefunded = parseFloat(this.totalRefunded || 0)
    const change = Math.max(totalPaid - totalRefunded - this.total, 0)
    return Math.round(change * 10 ** 3) / 10 ** 3
  }

  get totalUnpaid() {
    const totalPaid = parseFloat(this.totalPaid || 0)
    return Math.max(this.total - totalPaid, 0)
  }

  get netPaid() {
    const netPaid = this.totalPaid - (parseFloat(this.totalRefunded) || 0)
    return Math.round(netPaid * 10 ** 3) / 10 ** 3
  }

  get paymentStatus() {
    if (this.totalPaid >= this.total) return 'paid'
    if (this.totalPendingPayment >= this.totalUnpaid) return 'payment_in_escrow'
    if (this.totalPaid > 0) return 'partially_paid'
    if (this.totalPendingPayment > 0) return 'partial_payment_in_escrow'
    return 'payment_pending'
  }

  get formattedPaymentStatus() {
    return formatOrderStatus(this.paymentStatus)
  }

  get autoCompleteAtTimestamp() {
    if (!this.autoCompleteAt) return
    return this.autoCompleteAt * 1
  }

  get isStorePickup() {
    return this.deliveryType == Checkout.DeliveryTypes.STORE_PICKUP
  }

  get isPending() {
    return this.status === Order.Status.PENDING
  }

  get isReadyForPickup() {
    return this.status === Order.Status.READY_FOR_PICKUP
  }

  get isPickedUp() {
    return this.status === Order.Status.PICKED_UP
  }

  get isDelivered() {
    return this.status == Order.Status.DELIVERED
  }

  get isCompleted() {
    return this.status === Order.Status.COMPLETED
  }

  async fetchStorefront() {
    if (!this.storefrontId) return Promise.reject('No storefront id')

    return backend.get(`connecta/storefronts/${this.storefrontId}/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.storefront = Storefront.parse(response?.data)
        return response
      })
  }

  async fetchDispute() {
    if (!this.id) return Promise.reject()
    return backend.get(`connecta/orders/${this.id}/dispute/`)
    .then(response => {
      if (!response?.data?.id) return Promise.reject({ response })
      this.dispute = OrderDispute.parse(response?.data)
      return response 
    })      
  }

  refetch() {
    if (!this.id) return Promise.reject()
    return backend.get(`connecta/orders/${this.id}/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.raw = response?.data
        return response 
      })
  }
}

export class OrderDispute {
  static parse(data) {
    return new OrderDispute(data) 
  }

  static get resolveActions() {
    return {
      doNothing: 'do_nothing',
      completeOrder: 'complete_order',
      cancelOrder: 'cancel_order',
    }
  }
  static get resolveActionsList() {
    return Object.getOwnPropertyNames(this.resolveActions).map(name => this.resolveActions[name])
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.order_id
   * @param {String[]} data.reasons
   * @param {String | null} data.resolve_action
   * @param {String | null} data.resolved_at
   * @param {Object} [data.resolved_by]
   * @param {String} data.created_at
   * @param {Object} data.created_by
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.orderId = data?.order_id
    this.reasons = Array.isArray(data?.reasons) ? data?.reasons : []
    this.resolveAction = data?.resolve_action
    if (data?.resolved_at) this.resolvedAt = new Date(data?.resolved_at)
    else if (this.resolvedAt) delete this.resolvedAt

    if (data?.resolved_by) this.resolvedBy = User.parse(data?.resolved_by)
    else if (this.resolvedBy) delete this.resolvedBy

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    if (data?.created_by) this.createdBy = User.parse(data?.created_by)
    else if (this.createdBy) delete this.createdBy
  }
}


export class Rider {
  static parse(data) {
    return new Rider(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} [data.profile_picture_url]
   * @param {String} data.first_name
   * @param {String} data.last_name
   * @param {String} data.phone_number
   * @param {String} data.receiving_address
   * @param {Object} data.location
   * @param {Number} data.user_id
   * @param {Number} [data.active_delivery_id]
   * @param {Number} [data.distance]
   * @param {[Number, Number]} [data.current_location]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.profilePictureUrl = data?.profile_picture_url
    this.firstName = data?.first_name
    this.lastName = data?.last_name
    this.phoneNumber = data?.phone_number
    this.receivingAddress = data?.receiving_address
    this.location = Location.parse(data?.location)
    this.userId = data?.user_id

    this.activeDeliveryId = data?.active_delivery_id
    this.distance = data?.distance
    this.currentLocation = data?.current_location
  }

  get fullName() {
    return [this.firstName, this.lastName].filter(Boolean).join(' ')
  }
}


export class Delivery {
  static parse(data) {
    return new Delivery(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.order_id
   * @param {{ id: Number, status: String }} data.order
   * @param {Object} data.rider
   * @param {Object} data.active_rider_id
   * @param {Object} data.pickup_location
   * @param {Object} data.delivery_location
   * @param {String | Number} [data.accepted_at]
   * @param {String | Number} [data.picked_up_at]
   * @param {String | Number} [data.delivered_at]
   * @param {String | Number} [data.completed_at]
   * @param {{ code:String, symbol:String }} data.currency
   * @param {Number} data.subtotal
   * @param {Number} data.fee
   * @param {String | Number} data.created_at
   * @param {String | Number} data.updated_at
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.orderId = data?.order_id
    this.order = Order.parse(data?.order)
    this.rider = Rider.parse(data?.rider)
    this.activeRiderId = data?.active_rider_id
    this.pickupLocation = Location.parse(data?.pickup_location)
    this.deliveryLocation = Location.parse(data?.delivery_location)
    if (data?.accepted_at) this.acceptedAt = new Date(data?.accepted_at)
    else if (this.acceptedAt) delete this.acceptedAt
    if (data?.picked_up_at) this.pickedUpAt = new Date(data?.picked_up_at)
    else if (this.pickedUpAt) delete this.pickedUpAt
    if (data?.delivered_at) this.deliveredAt = new Date(data?.delivered_at)
    else if (this.deliveredAt) delete this.deliveredAt
    if (data?.completed_at) this.completedAt = new Date(data?.completed_at)
    else if (this.completedAt) delete this.completedAt
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.subtotal = data?.subtotal
    this.fee = data?.fee
    this.createdAt = new Date(data?.created_at)
    this.updatedAt = new Date(data?.updated_at)
  }
}


export class Payment {
  static parse(data) {
    return new Payment(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.checkout_id
   * @param {Number} data.order_id
   * @param {Object} [data.order]
   * @param {{ code:String, symbol:String }} data.currency
   * @param {String} data.status
   * @param {Object} data.bch_price
   * @param {Object[]} data.token_prices
   * @param {Number} data.amount
   * @param {Number} data.delivery_fee
   * @param {Number} data.markup_amount
   * @param {Number} data.total_amount
   * @param {String} data.transaction_timestamp
   * @param {String} data.created_at
   * @param {String} data.escrow_contract_address
   * @param {String[]} [data.pending_appeal_types]
  */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.checkoutId = data?.checkout_id
    this.orderId = data?.order_id
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.status = data?.status
    this.bchPrice = BchPrice.parse(data?.bch_price)
    if (Array.isArray(data?.token_prices)) this.tokenPrices = data?.token_prices.map(BchPrice.parse)
    this.amount = data?.amount
    this.deliveryFee = data?.delivery_fee
    this.markupAmount = data?.markup_amount
    this.totalAmount = data?.total_amount
    if (data?.transaction_timestamp) this.transactionTimestamp = new Date(data?.transaction_timestamp)
    else if (this.transactionTimestamp) delete this.transactionTimestamp
    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
    this.escrowContractAddress = data?.escrow_contract_address
    this.pendingAppealTypes = data?.pending_appeal_types

    if (data?.order?.id) this.order = Order.parse(data?.order)
    else if (data?.order?.id != this?.order?.id) delete this.order
  }

  get bchTotalAmount() {
    const satsPerBch = 10 ** 8
    const bch = this.totalAmount / this.bchPrice.price
    return Math.round(bch * satsPerBch) / satsPerBch
  }

  get isEscrow() {
    return Boolean(this.escrowContractAddress)
  }

  get canRefund() {
    return ['sent', 'received'].indexOf(this?.status) >= 0
  }

  get canReceive() {
    return ['pending', 'sent'].indexOf(this?.status) >= 0
  }

  getTokenPrice(category) {
    return this.tokenPrices.find(tokenPrice => tokenPrice?.currency?.code === `ct/${category}`)
  }

  async fetchEscrowContract() {
    if (!this.escrowContractAddress) return Promise.reject()

    return backend.get(`connecta/escrow/${this.escrowContractAddress}/`)
      .then(response => {
        this.escrowContract = EscrowContract.parse(response?.data)
        return response
      })
  }

  async fetchOrder() {
    if (this.orderId) return Promise.reject()
    return backend.get(`connecta/orders/${this.orderId}`)
      .then(response => {
        this.order = Order.parse(response?.data)
        return response
      })
  }
}

export class EscrowSettlementAppeal {
  static parse(data) {
    return new EscrowSettlementAppeal(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.escrow_contract
   * @param {String} data.type
   * @param {String} data.reason
   * @param {String} data.completed_at
   * @param {String} data.cancelled_at
   * @param {String} data.created_at
   * @param {Object} [data.created_by_user]
   * @param {Object} [data.created_by_customer]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.escrowContract = EscrowContract.parse(data?.escrow_contract)
    this.type = data?.type
    this.reason = data?.reason

    if (data?.completed_at) this.completedAt = new Date(data?.completed_at)
    else if (this.completedAt) delete this.completedAt

    if (data?.cancelled_at) this.cancelledAt = new Date(data?.cancelled_at)
    else if (this.cancelledAt) delete this.cancelledAt

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    if(data?.created_by_user) this.createdByUser = User.parse(data?.created_by_user)
    else if(this.createdByUser) delete this.createdByUser

    if (data?.created_by_customer) this.createdByCustomer = User.parse(data?.created_by_customer)
    else if(this.createdByCustomer) delete this.createdByCustomer
  }
}

export class EscrowContract {
  static parse(data) {
    return new EscrowContract(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {String} data.contract_version
   * @param {String} data.address_type
   * @param {String} data.address
   * @param {String} data.buyer_address
   * @param {String} data.seller_address
   * @param {String} data.arbiter_address
   * @param {String} data.servicer_address
   * @param {String} data.delivery_service_address
   * @param {Number} data.amount_sats
   * @param {Number} data.service_fee_sats
   * @param {Number} data.arbitration_fee_sats
   * @param {String} [data.amount_category]
   * @param {String} [data.service_fee_category]
   * @param {String} [data.arbitration_fee_category]
   * @param {Object} [data.delivery_fee_key_nft]
   * @param {Number} data.delivery_fee_key_nft.amount
   * @param {Number} data.delivery_fee_key_nft.nft_id
   * @param {String} data.delivery_fee_key_nft.category
   * @param {String} data.delivery_fee_key_nft.current_address
   * @param {String} data.delivery_fee_key_nft.current_txid
   * @param {Number} data.delivery_fee_key_nft.current_index
   * @param {Object} data.delivery_fee_key_nft.fee_pool_contract
   * @param {String} data.delivery_fee_key_nft.fee_pool_contract.address
   * @param {String} data.delivery_fee_key_nft.fee_pool_contract.key_nft_category
   * @param {String} data.delivery_fee_key_nft.fee_pool_contract.owner_address
   * @param {String} data.timestamp
   * @param {Number} data.pending_appeals_count
   * @param {String[]} data.pending_appeal_types
   * 
   * @param {String} [data.funding_txid]
   * @param {Number} [data.funding_vout]
   * @param {Number} [data.funding_sats]
   * 
   * @param {String} [data.settlement_txid]
   * @param {String} [data.settlement_type]
   * @param {Object[]} [data.payments]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.contractVersion = data?.contract_version
    this.addressType = data?.address_type
    this.address = data?.address
    this.buyerAddress = data?.buyer_address
    this.sellerAddress = data?.seller_address
    this.arbiterAddress = data?.arbiter_address
    this.servicerAddress = data?.servicer_address
    this.deliveryServiceAddress = data?.delivery_service_address

    this.amountSats = data?.amount_sats
    this.serviceFeeSats = data?.service_fee_sats
    this.arbitrationFeeSats = data?.arbitration_fee_sats

    this.amountCategory = data?.amount_category
    this.serviceFeeCategory = data?.service_fee_category
    this.arbitrationFeeCategory = data?.arbitration_fee_category
    this.deliveryFeeKeyNft = {
      amount: data?.delivery_fee_key_nft?.amount,
      nftId: data?.delivery_fee_key_nft?.nft_id,
      category: data?.delivery_fee_key_nft?.category,
      currentAddress: data?.delivery_fee_key_nft?.current_address,
      currentTxid: data?.delivery_fee_key_nft?.current_txid,
      currentIndex: data?.delivery_fee_key_nft?.current_index,
      feePoolContract: {
        address: data?.delivery_fee_key_nft?.fee_pool_contract?.address,
        keyNftCategory: data?.delivery_fee_key_nft?.fee_pool_contract?.key_nft_category,
        ownerAddress: data?.delivery_fee_key_nft?.fee_pool_contract?.owner_address,
      },
    }

    if (data?.timestamp) this.timestamp = new Date(data?.timestamp) * 1
    else if (this.timestamp) delete this.timestamp

    this.pendingAppealsCount = data?.pending_appeals_count
    this.pendingAppealTypes = data?.pending_appeal_types

    this.fundingTxid = data?.funding_txid
    this.fundingVout = data?.funding_vout
    this.fundingSats = data?.funding_sats
    this.settlementTxid = data?.settlement_txid
    this.settlementType = data?.settlement_type
    if (Array.isArray(data?.payments)) this.payments = data.payments.map(Payment.parse)
  }

  get computedAddressType() {
    if (typeof this.address !== 'string') return
    if (this.address.startsWith('bitcoincash:')) {
      if (this.address.length === 54) return 'p2sh20'
      if (this.address.length > 54) return 'p2sh32'
    }
    if (this.address.startsWith('bchtest:')) {
      if (this.address.length === 50) return 'p2sh20'
      if (this.address.length > 50) return 'p2sh32'
    }
  }

  get sats() {
    const CASHTOKEN_DUST_SATS = 1000;
    const deliveryFeeAmount = this.deliveryFeeKeyNft?.amount || 0;
    const deliveryFeeCategory = this.deliveryFeeKeyNft?.category;
    return {
      amount: this.amountCategory ? CASHTOKEN_DUST_SATS : this.amountSats,
      serviceFee: this.serviceFeeCategory ? CASHTOKEN_DUST_SATS : this.serviceFeeSats,
      arbitrationFee: this.arbitrationFeeCategory ? CASHTOKEN_DUST_SATS : this.arbitrationFeeSats,
      deliveryFee: (deliveryFeeAmount && deliveryFeeCategory)
        ? CASHTOKEN_DUST_SATS * 2
        : deliveryFeeAmount,
      networkFee: this.requiresTokens ? NaN : 1000,
    }
  }

  get bchAmounts() {
    const SATS_PER_BCH = 10 ** 8
    const toBch = val => Math.round(val) / SATS_PER_BCH
    const data = {
      amount: toBch(this.sats.amount),
      serviceFee: toBch(this.sats.serviceFee),
      arbitrationFee: toBch(this.sats.arbitrationFee),
      deliveryFee: toBch(this.sats.deliveryFee),
      networkFee: toBch(this.sats.networkFee),
      total: toBch(
        this.sats.amount +
        this.sats.serviceFee +
        this.sats.arbitrationFee +
        this.sats.deliveryFee +
        this.sats.networkFee,
      ),
    }

    return data
  }

  get isFunded() {
    return Boolean(this.fundingTxid && this.fundingVout >= 0)
  }
  
  get isSettled() {
    return Boolean(this.settlementTxid)
  }

  get requiresTokens() {
    return Boolean(this.amountCategory || this.serviceFeeCategory || this.arbitrationFeeCategory || this.deliveryFeeKeyNft?.category)
  }

  get fundingTxLink() {
    const txid = this?.fundingTxid
    const index = this?.fundingVout
    const isTestnet = this?.address?.startsWith?.('bchtest:')

    if (!txid) return ''
    if (isNaN(index) || index < 0) return ''

    if (isTestnet) return `${process.env.TESTNET_EXPLORER_URL}/tx/${txid}#output-${index}`
    return `https://explorer.paytaca.com/tx/${txid}?o=${index}`
  }

  get settlementTxLink() {
    const txid = this?.settlementTxid
    const isTestnet = this?.address?.startsWith?.('bchtest:')

    if (!txid) return ''

    if (isTestnet) return `${process.env.TESTNET_EXPLORER_URL}/tx/${txid}`
    return `https://explorer.paytaca.com/tx/${txid}`
  }

  getPendingSettlementAppeals() {
    if (!this.address) return Promise.resolve()

    const params = {
      escrow_addresses: this.address,
      pending: true,
    }
    const cache = {
      ttl: 10 * 1000, // 10 seconds
    }

    return cachedBackend.get(`connecta/escrow-settlement-appeals/`, { params, cache })
      .then(response => {
        const results = response?.data?.results
        if (Array.isArray(results)) {
          this.pendingSettlementAppeals = results?.map?.(EscrowSettlementAppeal.parse)
        }
        return response
      })
  }
}

export class EscrowArbiter {
  static parse(data) {
    return new EscrowArbiter(data)
  }

  constructor(data) { 
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.pubkey
   * @param {String} data.cash_address
   * @param {Number} data.user_id
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.pubkey = data?.pubkey
    this.cashAddress = data?.cash_address
    this.userId = data?.user_id
  }

  async getUser() {
    if (!this.userId) return Promise.resolve()

    return backend.get(`/users/${this.userId}/`)
      .then(response => {
        if (!response?.data?.id) return Promise.reject({ response })
        this.user = User.parse(response?.data)
        return response
      })
  }
}


export class ChatSession {
  static parse(data) {
    return new ChatSession(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {String} data.ref
   * @param {String} data.title
   * @param {Number} [data.order_id]
   * @param {String} data.first_message_at
   * @param {String} data.last_message_at
   * @param {String} data.created_at
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.ref = data?.ref
    this.title = data?.title
    this.orderId = data?.order_id
    if (data?.first_message_at) this.firstMessageAt = new Date(data?.first_message_at)
    else if (this.firstMessageAt) delete this.firstMessageAt

    if (data?.last_message_at) this.lastMessageAt = new Date(data?.last_message_at)
    else if (this.lastMessageAt) delete this.lastMessageAt

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
  }
}


export class ChatMessage {
  static parse(data) {
    return new ChatMessage(data) 
  }

  constructor(data) {
    this.raw = data
    this.$state = {
      fetchingAttachment: false,
      decryptingAttachment: false,
    }
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.chat_session_ref
   * @param {Boolean} data.encrypted
   * @param {String} data.message
   * @param {String} data.attachment_url
   * @param {String} data.encrypted_attachment_url
   * @param {String} data.created_at
   * @param {Object} [data.chat_identity]
   * @param {String} [data.member_nickname]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.chatSessionRef = data?.chat_session_ref
    this.encrypted = data?.encrypted
    this.message = data?.message
    this.attachmentUrl = data?.attachment_url
    this.encryptedAttachmentUrl = data?.encrypted_attachment_url
    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
    this.chatIdentity = ChatIdentity.parse(data?.chat_identity)
    this.memberNickname = data?.member_nickname
  }

  get user() {
    return this.chatIdentity?.user
  }

  get customer() {
    return this.chatIdentity?.customer
  }

  get name() {
    if (this?.user?.id) {
      return [this.user.firstName, this.user.lastName].filter(Boolean).join(' ')
    }
    if (this?.customer?.fullName) return this?.customer?.fullName
    return this.chatIdentity?.name
  }

  get decryptedMessage() {
    if (!this.encrypted) return this.message
    return this._decryptedMessage
  }

  get hasAttachment() {
    return Boolean(this.attachmentUrl || this.encryptedAttachmentUrl)
  }

  get decryptedAttachmentFile() {
    return this._decryptedAttachmentFile
  }

  set decryptedAttachmentFile(value) {
    try { URL.revokeObjectURL(this._decryptedAttachmentFile) } catch {}
    this._decryptedAttachmentFile = value
    if (this._decryptedAttachmentFile) {
      this._decryptedAttachmentFile.url = URL.createObjectURL(this._decryptedAttachmentFile)
    }
  }
  /**
   * @param {String} value
   */
  set decryptedMessage(value) {
    this._decryptedMessage = value
  }

  async decryptMessage(privkey, tryAllKeys=false) {
    if (!this.encrypted) return
    const parsedEncryptedMessage = decompressEncryptedMessage(this.message)
    const opts = { privkey, tryAllKeys, ...parsedEncryptedMessage}
    this.decryptedMessage = decryptMessage(opts)
  }

  async fetchEncryptedAttachment() {
    if (this.fetchEncryptedAttachmentPromise) return this.fetchEncryptedAttachmentPromise
    this.fetchEncryptedAttachmentPromise = this._fetchEncryptedAttachment()
    return this.fetchEncryptedAttachmentPromise
      .finally(() => {
        delete this.fetchEncryptedAttachmentPromise
      })
  }

  async _fetchEncryptedAttachment() {
    this.$state.fetchingAttachment = true
    try {
      if (!this.encryptedAttachmentUrl) return
      if (this.encryptedAttachmentFile) return
      const response = await fetch(this.encryptedAttachmentUrl, { headers: { 'Accept': 'image/* application/*' } })
      const blob = await response.blob()
      this.encryptedAttachmentFile = new nativeFileAPI.File([blob], this.encryptedAttachmentUrl)
      return this.encryptedAttachmentFile
    } finally {
      this.$state.fetchingAttachment = false
    }
  }

  async decryptAttachment(privkey, tryAllKeys=false) {
    if (this.decryptAttachmentPromise) return this.decryptAttachmentPromise
    this.decryptAttachmentPromise = this._decryptAttachment(privkey, tryAllKeys)
    return this.decryptAttachmentPromise
      .finally(() => {
        delete this.decryptAttachmentPromise
      })
  }

  async _decryptAttachment(privkey, tryAllKeys=false) {
    try {
      if (this?.decryptedAttachmentFile?.url) return this.decryptedAttachmentFile
      if (!this.encryptedAttachmentFile) await this.fetchEncryptedAttachment()
      if (!this.encryptedAttachmentFile) return
      this.$state.decryptingAttachment = true
      const decryptOpts = await decompressEncryptedImage(this.encryptedAttachmentFile)
      const opts = { privkey, tryAllKeys, ...decryptOpts }
      this.decryptedAttachmentFile = await decryptImage(opts)
      return this.decryptedAttachmentFile
    } finally {
      this.$state.decryptingAttachment = false
    }
  }
}


export class ChatMember {  
  static parse(data) {
    return new ChatMember(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.nickname
   * @param {String} data.chat_session_ref
   * @param {Number} data.unread_count
   * @param {String} data.last_read_timestamp
   * @param {String} data.created_at
   * @param {Object} data.chat_identity
   * @param {Object} [data.chat_session]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.nickanme = data?.nickname
    this.chatSessionRef = data?.chat_session_ref
    this.unreadCount = data?.unread_count
    if (data?.last_read_timestamp) this.lastReadTimestamp = new Date(data?.last_read_timestamp)
    else if (this.lastReadTimestamp) delete this.lastReadTimestamp

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    this.chatIdentity = ChatIdentity.parse(data?.chat_identity)
    if (data?.chat_session) {
      this.chatSession = ChatSession.parse(data?.chat_session)
      if (!this.chatSessionRef) this.chatSessionRef = this.chatSession?.ref
    }
  }

  get name() {
    if (this?.chatIdentity?.user?.id) {
      return [this.chatIdentity.user.firstName, this.chatIdentity.user.lastName].filter(Boolean).join(' ')
    }
    return this?.chatIdentity?.customer?.fullName
  }
}


export class ChatIdentity {
  static parse(data) {
    return new ChatIdentity(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.name
   * @param {String} data.ref
   * @param {{ pubkey:String, device_id:String }[]} data.pubkeys
   * @param {{ id:Number, first_name: String, last_name:String }} [data.user]
   * @param {{ id:Number, first_name: String, last_name:String }} [data.customer]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.name = data?.name
    this.ref = data?.ref
    this.pubkeys = (Array.isArray(data?.pubkeys) ? data?.pubkeys : [])
      .map(pubkeyData => {
        return { pubkey: pubkeyData?.pubkey, deviceId: pubkeyData?.device_id }
      })
 
    this.user = User.parse(data?.user)
    this.customer = Customer.parse(data?.customer)   
  }
}


export class Review {
  static parse(data) {
    return new Review(data) 
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {Number} data.product_id
   * @param {Number} data.order_id
   * @param {Number | String} data.rating
   * @param {String} data.text
   * @param {String[]} data.images_urls
   * @param {String} data.created_at
   * @param {Object} [data.created_by_user]
   * @param {Object} [data.created_by_customer]
  */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.rating = parseFloat(data?.rating)
    this.text = data?.text
    this.imagesUrls = data?.images_urls
    this.createdAt = new Date(data?.created_at)

    if(data?.created_by_user) this.createdByUser = User.parse(data?.created_by_user)
    else if(this.createdByUser) delete this.createdByUser

    if (data?.created_by_customer) this.createdByCustomer = User.parse(data?.created_by_customer)
    else if(this.createdByCustomer) delete this.createdByCustomer
  }

  get authorName() {
    return this.createdByCustomer?.fullName || this.createdByUser?.fullName
  }
}
