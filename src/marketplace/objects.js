import { backend } from "./backend"
import { formatOrderStatus, parseOrderStatusColor } from './utils'

export class Location {
  static parse(data) {
    return new Location(data)
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

  get validCoordinates() {
    return isFinite(parseFloat(this.longitude)) && isFinite(parseFloat(this.latitude))
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
   * @param {Object} data 
   * @param {Number} data.id
   * @param {Number} data.shop_id
   * @param {String} data.name
   * @param {String} data.image_url
   * @param {{ code:String, symbol:String }} data.currency
   * @param {Object} data.location
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.shopId = data?.shop_id
    this.name = data?.name
    this.imageUrl = data?.image_url
    this.currency = {
      code: data?.currency?.code,
      symbol: data?.currency?.symbol,
    }
    if (data?.location) this.location = Location.parse(data?.location)
    else if (this.location) this.location = undefined
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
}

export class Product {
  static parse(data) {
    return new Product(data)
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
   * @param {String} [data.code]
   * @param {String[]} data.categories
   * @param {String} data.image_url
   * @param {String} [data.variant_image_url]
   * @param {String} data.name
   * @param {String} [data.description]
   * @param {Number} data.total_stocks
   * @param {Number} data.expired_stocks
   * @param {Number} data.variants_count
   * @param {Number} [data.min_price]
   * @param {Number} [data.max_price]
   * @param {Number} [data.storefront_id]
   * @param {String} [data.created_at]
   * @param {Object[]} [data.variants]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.code = data?.code
    if (Array.isArray(data?.categories)) this.categories = [...data.categories]
    this.imageUrl = data?.image_url
    this.variantImageUrl = data?.variant_image_url
    this.name = data?.name
    this.description = data?.description
    this.totalStocks = data?.total_stocks
    this.expiredStocks = data?.expired_stocks
    this.variantsCount = data?.variants_count
    this.minPrice = data?.min_price
    this.maxPrice = data?.max_price
    this.storefrontId = data?.storefront_id
    if(data?.created_at) this.createdAt = new Date(data?.created_at)

    this.updateVariants(data?.variants)
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
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    
    this.variant = Variant.parse(data?.variant)
    this.quantity = data?.quantity
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
   * @param {Number} data.subtotal
   * @param {Object} data.customer
   * @param {Object[]} data.items
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.orderId = data?.order_id
    this.storefrontId = data?.storefront_id
    this.subtotal = data?.subtotal
    this.customer = Customer.parse(data?.customer)
    this.items = data?.items?.map?.(CartItem.parse)
  }

  save() {
    const data = {
      storefront_id: this.storefrontId,
      customer: null,
      items: this.items.map(item => {
        return { variant_id: item?.variant?.id, quantity: item?.quantity }
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
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.price = data?.price
    if (data?.timestamp) this.timestamp = new Date(data?.timestamp)
    else if (this.timestamp) delete this.timestamp
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
}

export class Checkout {
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
   * @param {Object} data.delivery_address
   * @param {Object} data.payment
   * @param {{ currency: CurrencyInfo, price: Number, timestamp: String | Number}} data.payment.bch_price
   * @param {Number} data.payment.delivery_fee
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.id = data?.id
    this.orderId = data?.order_id
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.cart = Cart.parse(data?.cart)
    this.deliveryAddress = DeliveryAddress.parse(data?.delivery_address)
    this.payment = {
      bchPrice: BchPrice.parse(data?.payment?.bch_price),
      deliveryFee: data?.payment?.delivery_fee,
      escrowRefundAddress: data?.payment?.escrow_refund_address,
    }
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
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.variant = Variant.parse(data?.variant)
    this.itemName = data?.item_name
    this.quantity = data?.quantity
    this.price = data?.price
  }
}


export class Order {
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
   * @param {Object} data.delivery_address
   * @param {Object[]} data.items
   * @param {Number} data.subtotal
   * @param {Number} data.total_paid
   * @param {Number} data.total_pending_payment
   * @param {Number} data.total_payments
   * @param {{ delivery_fee:Number, escrow_refund_address:String }} data.payment
   * @param {String | Number} data.created_at
   * @param {String | Number} data.updated_at
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
    this.deliveryAddress = DeliveryAddress.parse(data?.delivery_address)
    this.items = data?.items?.map?.(OrderItem.parse)
    this.subtotal = data?.subtotal
    this.totalPaid = data?.total_paid
    this.totalPendingPayment = data?.total_pending_payment
    this.totalPayments = data?.total_payments
    this.payment = {
      deliveryFee: data?.payment?.delivery_fee,
      escrowRefundAddress: data?.payment?.escrow_refund_address,
    }

    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt

    if (data?.updated_at) this.updatedAt = new Date(data?.updated_at)
    else if (this.updatedAt) delete this.updatedAt
  }

  get formattedStatus() {
    return formatOrderStatus(this.status)
  }

  get statusColor() {
    return parseOrderStatusColor(this.status)
  }

  get total() {
    return Number(this?.payment?.deliveryFee) + Number(this.subtotal)
  }

  get totalPayable() {
    const totalPayments = parseFloat(this.totalPayments) || 0
    return this.total - totalPayments
  }

  get paymentStatus() {
    if (this.totalPaid >= this.total) return 'paid'
    if (this.totalPaid > 0) return 'partially_paid'
    return 'payment_pending'
  }

  get formattedPaymentStatus() {
    return formatOrderStatus(this.paymentStatus)
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
   * @param {String | Number} [data.picked_up_at]
   * @param {String | Number} [data.delivered_at]
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
    if (data?.picked_up_at) this.pickedUpAt = new Date(data?.picked_up_at)
    else if (this.pickedUpAt) delete this.pickedUpAt
    if (data?.delivered_at) this.deliveredAt = new Date(data?.delivered_at)
    else if (this.deliveredAt) delete this.deliveredAt
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
   * @param {Number} data.order_id
   * @param {{ code:String, symbol:String }} data.currency
   * @param {String} data.status
   * @param {Object} data.bch_price
   * @param {Number} data.amount
   * @param {String} data.transaction_timestamp
   * @param {String} data.created_at
   * @param {String} data.escrow_contract_address
  */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data?.id
    this.orderId = data?.order_id
    this.currency = { code: data?.currency?.code, symbol: data?.currency?.symbol }
    this.status = data?.status
    this.bchPrice = BchPrice.parse(data?.bch_price)
    this.amount = data?.amount
    if (data?.transaction_timestamp) this.transactionTimestamp = new Date(data?.transaction_timestamp)
    else if (this.transactionTimestamp) delete this.transactionTimestamp
    if (data?.created_at) this.createdAt = new Date(data?.created_at)
    else if (this.createdAt) delete this.createdAt
    this.escrowContractAddress = data?.escrow_contract_address
  }

  get bchAmount() {
    const satsPerBch = 10 ** 8
    const bch = this.amount / this.bchPrice.price
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

  async fetchEscrowContract() {
    if (!this.escrowContractAddress) return Promise.reject()

    return backend.get(`connecta/escrow/${this.escrowContractAddress}/`)
      .then(response => {
        this.escrowContract = EscrowContract.parse(response?.data)
        return response
      })
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
   * @param {String} data.address
   * @param {String} data.buyer_address
   * @param {String} data.seller_address
   * @param {String} data.arbiter_address
   * @param {String} data.servicer_address
   * @param {String} data.delivery_service_address
   * @param {Number} data.amount_sats
   * @param {Number} data.service_fee_sats
   * @param {Number} data.arbitration_fee_sats
   * @param {Number} data.delivery_fee_sats
   * @param {String} data.timestamp
   * 
   * @param {String} [data.funding_txid]
   * @param {Number} [data.funding_vout]
   * @param {Number} [data.funding_sats]
   * 
   * @param {String} [data.settlement_txid]
   * @param {String} [data.settlement_type]
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

    this.address = data?.address
    this.buyerAddress = data?.buyer_address
    this.sellerAddress = data?.seller_address
    this.arbiterAddress = data?.arbiter_address
    this.servicerAddress = data?.servicer_address
    this.deliveryServiceAddress = data?.delivery_service_address

    this.amountSats = data?.amount_sats
    this.serviceFeeSats = data?.service_fee_sats
    this.arbitrationFeeSats = data?.arbitration_fee_sats
    this.deliveryFeeSats = data?.delivery_fee_sats

    if (data?.timestamp) this.timestamp = new Date(data?.timestamp) * 1
    else if (this.timestamp) delete this.timestamp

    this.fundingTxid = data?.funding_txid
    this.fundingVout = data?.funding_vout
    this.fundingSats = data?.funding_sats
    this.settlementTxid = data?.settlement_txid
    this.settlementType = data?.settlement_type
  }

  get bchAmounts() {
    const SATS_PER_BCH = 10 ** 8
    const toBch = val => Math.floor(val) / SATS_PER_BCH
    const data = {
      amount: toBch(this.amountSats),
      serviceFee: toBch(this.serviceFeeSats),
      arbitrationFee: toBch(this.arbitrationFeeSats),
      deliveryFee: toBch(this.deliveryFeeSats),
      total: 0,
    }

    // data.total = (data.amount + data.serviceFee + data.arbitrationFee + data.deliveryFee)
    data.total = toBch(this.amountSats + this.serviceFeeSats + this.arbitrationFeeSats + this.deliveryFeeSats)
    return data
  }
}
