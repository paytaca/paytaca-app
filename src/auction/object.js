// Colors for lot statuses
const lotColors = {
  'Sold': 'red',
  'Unsold': 'red',
  'Active': 'green',
  'Inactive': 'gray'
}

// Colors for auction statuses
const auctionColors = {
  'Closed': 'red',
  'Upcoming': 'orange',
  'Open': 'green'
}

// Colors for delivery statuses
const deliveryColors = {
  'Preparing': 'yellow',
  'Sent': 'blue',
  'Shipped': 'orange',
  'In Transit': 'green',
  'Out for Delivery': 'blue',
  'Delivered': 'gray'
}

// ==============
// OBJECT CLASSES 
// ==============

// AUCTION OBJECTS
export class Auction {
  static parse(data) {
    return new Auction(data)
  }
  
  constructor(data) {
    this.raw = data
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }
  
  // setter for raw data
  set raw(data) {
    setRawData(this, data)

    // Auction Core Information
    this.id = Number(data.id) || null
    this.title = data.title ?? 'Standard Auction Event'
    this.description = data.description ?? 'No description.'
    this.type = data.type ?? 'N/A'

    // User Information
    this.auctioneer = {
      id: data.auctioneer?.id ?? data.auctioneer ?? null,
      username: data.auctioneer_username ?? data.auctioneer?.username ?? null
    }

    // Dates
    this.start_date = data.start_date ?? null
    this.end_date = data.end_date ?? null
    this.fiat_name = data.fiat_name ?? null
    this.date_created = data.date_created ?? null
    this.date_updated = data.date_updated ?? null

    // Boolean
    this.is_fiat = data.is_fiat ?? true

    // Image
    this.image = data.image ?? null

    // Status
    this.status = data.status ?? 'Upcoming'
    this.status_color = auctionColors[this.status]

    // Lots
    this.lots = Array.isArray(data.lots)
      ? data.lots.map(lotObj => Lot.parse(lotObj, this))
      : []
  } 

  // Updates the auction status color
  refreshStatus() {   
    this.status_color = auctionColors[this.status]
  }
  
}

// LOT OBJECTS
export class Lot {
  static parse(data) {
    return new Lot(data)
  }

  constructor(data) {
    this.raw = data
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)
    
    // Lot core information
    this.id = Number(data.id) || null
    this.auction_id = Number(data.auction_id ?? data.auction?.id ?? data.auction) || null

    this.title = data.title ?? 'Unnamed Lot'
    this.description = data.description ?? 'No description.'
    this.category = data.category ?? 'N/A'

    // Status
    this.status = data.status ?? 'Inactive'
    this.status_color = lotColors[this.status]

    // Est amt/original price
    this.est_price_bch = Number(data.est_price_bch) || 0
    this.est_price_fiat = Number(data.est_price_fiat) || 0

    // Upper limit (English) or lowest limit (Dutch)
    this.thresh_price_bch = Number(data.thresh_price_bch) || 0
    this.thresh_price_fiat = Number(data.thresh_price_fiat) || 0

    // Starting price of bidding
    this.start_price_bch = Number(data.start_price_bch) || 0
    this.start_price_fiat = Number(data.start_price_fiat) || 0

    // (Dutch only)
    this.price_drop_bch = Number(data.price_drop_bch) || 0
    this.price_drop_fiat = Number(data.price_drop_fiat) || 0

    this.time_interval = data.time_interval ?? null

    // Dates
    this.date_sold = data.date_sold ?? null
    this.date_updated = data.date_updated ?? null
    this.date_created = data.date_created ?? null
    
    // Images
    this.images = Array.isArray(data.images) 
      ? data.images.map(img => typeof img === 'object' ? img.image : img) 
      : []
    this.image = this.images[0] ?? null

    // Bid history
    this.bids = Array.isArray(data.bids)
      ? data.bids.map(bidObj => Bid.parse(bidObj, this))
      : []
  }

  // Updates the lot status colors
  refreshStatus() {
    this.status_color = lotColors[this.status]
  }

  // Checks if the lot has any bids
  hasBids() {
    return this.bids?.length > 0
  }
}

// BID OBJECTS
export class Bid {
  static parse(data, lot) {
    return new Bid(data, lot)
  }
  
  constructor(data, lot = data.lot ?? null) {
    this.raw = data
    this.lot = lot
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)
    
    // IDs
    this.id = data.id != null ? Number(data.id) : null
    this.lot_id = Number(data.lot_id ?? data.lot?.id ?? data.lot) || null

    // User Information
    this.bidder = {
      id: data.bidder?.id ?? data.bidder ?? null,
      username: data.bidder_username ?? data.bidder?.username ?? null
    }

    // Statuses
    this.status = data.status ?? null

    // Bid Prices
    this.bid_price_bch = Number(data.bid_price_bch) || 0
    this.bid_price_fiat = Number(data.bid_price_fiat) || 0

    // Dates
    this.date_bid = data.date_bid ?? null
  }
}

// DISPUTE OBJECTS
export class Dispute {
  static parse(data) {
    return new Dispute(data)
  }

  constructor(data) {
    this.raw = data
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)

    // IDs
    this.id = Number(data.id) || null
    this.lot_id = Number(data.lot_id ?? data.lot?.id ?? data.lot) || null
    this.auction_id = Number(data.auction_id ?? data.auction?.id ?? data.auction) || null

    // User Information
    this.auctioneer = {
      id: data.auctioneer?.id ?? data.auctioneer ?? null,
      username: data.auctioneer_username ?? data.auctioneer?.username ?? null
    }
    this.bidder = {
      id: data.bidder?.id ?? data.bidder ?? null,
      username: data.bidder_username ?? data.bidder?.username ?? null
    }
    this.arbiter = {
      id: data.arbiter?.id ?? data.arbiter ?? null,
      username: data.arbiter_username ?? data.arbiter?.username ?? null
    }

    this.contract_address = data.contract_address ?? null
    
    // Dispute Type (Not Received or Return)
    this.type = data.type ?? null

    // Statuses
    this.status = data.status ?? null
    this.refund_status = data.refund_status ?? null
    this.arbiter_comment = data.arbiter_comment ?? ''

    // Dates
    this.date_refunded = data.date_refunded ?? null
    this.date_resolved = data.date_resolved ?? null
    this.date_created = data.date_created ?? null

    this.reasons = Array.isArray(data.reason)
      ? data.reason
      : (data.reason
          ? data.reason.split(';').map(s => s.trim()).filter(Boolean)
          : [])
  }
}

// DELIVERY INFORMATION (FOR POST BIDS)
export class DeliveryDetails {
  static parse(data) {
    return new DeliveryDetails(data)
  }

  constructor(data) {
    this.raw = data
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)

    // IDs
    this.tracking_id = data.tracking_id ?? null
    this.lot_id = Number(data.lot_id ?? data.lot?.id ?? data.lot) || null
    
    // User Information
    this.sender = {
      id: data.sender?.id ?? data.sender ?? null,
      address: data.sender_address ?? data.sender?.address ?? null
    }
    this.receiver = {
      id: data.receiver?.id ?? data.receiver ?? null,
      address: data.receiver_address ?? data.receiver?.address ?? null
    }
    
    // Courier
    this.courier = data.courier ?? null

    // Status
    this.status = data.status ?? 'Preparing'
    this.status_color = deliveryColors[this.status]

    // Delivery History
    this.delivery_events = Array.isArray(data.delivery_events)
      ? data.delivery_events.map(
        event => event instanceof DeliveryEvent 
          ? event 
          : DeliveryEvent.parse(event, this)
      )
      : []

    // Dates
    this.date_created = data.date_created ?? data.creation_date ?? null
  }

  addDeliveryEvent(deliveryEvent) {
    const event = deliveryEvent instanceof DeliveryEvent
      ? deliveryEvent
      : DeliveryEvent.parse(deliveryEvent, this)
    this.delivery_events.push(event)
  }

  refreshStatus() {
    this.status_color = deliveryColors[this.status]
  }
}

// DELIVERY INFORMATION (FOR POST BIDS)
export class DeliveryEvent {
  static parse(data, delivery_details) {
    return new DeliveryEvent(data, delivery_details)
  }

  constructor(data, delivery_details) {
    this.raw = data
    this.delivery_details = delivery_details
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)

    // Delivery Event Core information
    this.id = Number(data.id) || null
    this.tracking_id = Number(data.tracking_id ?? data.delivery?.tracking_id ?? data.delivery) || null
    this.status = data.status ?? null
    this.description = data.description ?? 'No description provided.'
    this.location = data.location ?? 'No location provided.'

    // Dates
    this.date_of_event = data.date_of_event ?? null
    this.date_recorded = data.date_recorded ?? null
  }

  refreshStatus() {
    this.status_color = deliveryColors[this.status]
  }
}

// Helper Functions
function setRawData (instance, data) {
  Object.defineProperty(instance, '$raw', {
    enumerable: false,
    configurable: true,
    value: data
  })
}

