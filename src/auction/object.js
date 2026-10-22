function setRawData (instance, data) {
  Object.defineProperty(instance, '$raw', {
    enumerable: false,
    configurable: true,
    value: data
  })
}

function saveAsNumberOrNull(data) {
  return data ? Number(data) : null
}

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

    // Auction core information
    this.id = data.id != null ? Number(data.id) : null
    this.title = data.title ?? 'Standard Auction Event'
    this.description = data.description ?? ''
    this.type = data.type ?? 'N/A'

    this.auctioneer = {
      id: data.auctioneer_id ?? data.auctioneer?.id ?? data.auctioneer ?? null,
      username: data.auctioneer_username ?? data.auctioneer?.username ?? ''
    }

    this.start_date = data.start_date ?? null
    this.end_date = data.end_date ?? null
    this.creation_date = data.creation_date ?? null

    this.is_open = data.is_open ?? data.status === 'Open'
    this.is_fiat = data.is_fiat ?? true

    this.image = data.image ?? null
    this.status = data.status ?? null

    this.status = data.status ?? 'Upcoming'
    this.status_color = auctionColors[this.status]

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
  static parse(data, auction) {
    return new Lot(data, auction)
  }

  constructor(data, auction = data.auction ?? null) {
    this.raw = data
    this.auction = auction
  }

  // getter for raw data
  get raw() {
    return this.$raw
  }

  // setter for raw data
  set raw(data) {
    setRawData(this, data)
    
    // Lot core information
    this.id = data.id != null ? Number(data.id) : null
    this.title = data.title ?? 'Unnamed Lot'
    this.description = data.description ?? ''
    this.category = data.category ?? 'N/A'

    // Est amt/original price
    this.estimated_amount_bch = Number(data.estimated_amount_bch ?? 0)
    this.estimated_amount_fiat = Number(data.estimated_amount_fiat ?? 0)

    // Upper limit (English) or lowest limit (Dutch)
    this.threshold_bid_bch = Number(data.threshold_bid_bch ?? 0)
    this.threshold_bid_fiat = Number(data.threshold_bid_fiat ?? 0)

    // Starting price of bidding
    this.starting_price_bch = Number(data.starting_price_bch ?? 0)
    this.starting_price_fiat = Number(data.starting_price_fiat ?? 0)

    // (Dutch only)
    this.price_drop_bch = Number(data.price_drop_bch ?? 0)
    this.price_drop_fiat = Number(data.price_drop_fiat ?? 0)
    this.time_interval = data.time_interval ?? null

    // Dynamic values
    this.date_sold = data.date_sold ?? data.sell_date ?? null
    this.status = data.status ?? 'Inactive'
    this.status_color = lotColors[this.status]
    
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
    
    this.id = data.id != null ? Number(data.id) : null
    this.bidder = {
      id: data.bidder_id ?? data.bidder?.id ?? data.bidder ?? null,
      username: data.bidder_username ?? data.bidder?.username ?? null
    }
    this.status = data.status ?? null
    this.bid_price_bch = Number(data.bid_price_bch ?? 0)
    this.bid_price_fiat = Number(data.bid_price_fiat ?? 0)
    this.bidding_date = data.bidding_date ?? null
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

  get raw() {
    return this.$raw
  }

  set raw(data) {
    setRawData(this, data)

    // IDs
    this.id = saveAsNumberOrNull(data.id)  
    this.lot_id = saveAsNumberOrNull(data.lot_id)
    this.auction_id = saveAsNumberOrNull(data.auction_id)

    // User Wallet Hashes and Usernames
    this.auctioneer_id = data.auctioneer_id ?? data.auctioneer ?? null
    this.auctioneer_username = data.auctioneer_username ?? null
    
    this.bidder_id = data.bidder_id ?? data.bidder ?? null
    this.bidder_username = data.bidder_username ?? null

    this.contract_address = data.contract_address || null
    
    // Dispute Type (Not Received or Return)
    this.type = data.type ?? null

    // Statuses
    this.status = data.status ?? null
    this.refund_status = data.refund_status ?? null

    // Dates
    this.refund_date = data.refund_date ?? null
    this.resolution_date = data.resolution_date ?? null
    this.creation_date = data.creation_date ?? null

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
    this.lot_id = data.lotId != null || data.lot != null ? Number(data.lotId ?? data.lot) : null
    
    this.sender_id = data.sender_id ?? data.sender ?? null
    this.sender_location = data.sender_location ?? null
    
    this.receiver_id = data.receiver_id ?? data.receiver ?? null
    this.receiver_location = data.receiver_location ?? null
    
    this.courier = data.courier ?? null
    this.creation_date = data.creation_date || null

    this.delivery_events = data.delivery_events || []
    this.status = data.status || 'Preparing'
    this.status_color = deliveryColors[this.status]

    this.refreshStatus()
  }

  updateDeliveryEvent(data) {
    this.status = data.status || null
    this.status_color = deliveryColors[this.status]
    this.description = data.description || null
    this.location = data.location || null
    this.event_date = data.event_date || null
  }

  refreshStatus() {
    this.status_color = deliveryColors[this.status]
  }
}
