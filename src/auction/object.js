import { data } from 'autoprefixer'
import { date } from 'quasar'

const lotColors = {
  'Sold': 'red',
  'Unsold': 'red',
  'Active': 'green',
  'Inactive': 'gray'
}

const auctionColors = {
  'Closed': 'red',
  'Upcoming': 'orange',
  'Open': 'green'
}

const deliveryColors = {
  'Preparing': 'yellow',
  'Shipped': 'orange',
  'In Transit': 'green',
  'Out for Delivery': 'blue',
  'Delivered': 'gray'
}

// object class for Auctions
export class AuctionList {
  static parse(data) {
    return new AuctionList(data)
  }
  
  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(
      this, 
      '$raw', 
      { 
        enumerable: false, 
        configurable: true, 
        value: data 
      }
    )

    // Auction core information
    this.id = data.id != null ? Number(data.id) : null
    this.title = data.title ?? 'Standard Auction Event'
    this.description = data.description ?? ''
    this.type = data.type ?? 'N/A'

    this.auctioneer = data.auctioneer ?? ''
    this.username = data.auctioneer_username ?? ''

    this.start_date = data.start_date ?? null
    this.end_date = data.end_date ?? null
    this.creation_date = data.creation_date ?? null

    this.is_open = data.is_open ?? 'Upcoming'
    this.is_fiat = data.is_fiat ?? 'N/A'

    this.image = data.image ?? null
    this.status = data.status ?? null

    this.status_label = data.status ?? 'Upcoming'
    this.status_color = auctionColors[this.status_label]

    this.lots = Array.isArray(data.lots)
      ? data.lots.map(lotObj => LotsList.parse(lotObj, this))
      : []
  }

  refreshStatus() {   
    this.status_color = auctionColors[this.status_label]
  }
  
  getEllipsisInMiddleAddress() {
    const targetString = this.user
    
    if (!targetString || targetString.length <= 22) return targetString
    
    const start = targetString.substring(0, 17)
    const end = targetString.substring(targetString.length - 5)
    
    return `${start}........${end}`
  }
}

// object class for Lots
export class LotsList {
  static parse(data, auction) {
    return new LotsList(data, auction)
  }

  constructor(data, auction = null) {
    this.raw = data
    this.auction = auction
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(
      this, 
      '$raw', 
      { 
        enumerable: false, 
        configurable: true, 
        value: data 
      }
    )
    
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
    this.is_sold = data.is_sold ?? null
    this.date_sold = data.date_sold ?? null

    this.status_label = data.status ?? 'Inactive'
    this.status_color = lotColors[this.status_label]
    
    // Images
    this.images = Array.isArray(data.images) 
      ? data.images.map(img => typeof img === 'object' ? img.image : img) 
      : []
    this.image = this.images[0] ?? null

    // Bid history
    this.bids = Array.isArray(data.lots)
      ? data.bids.map(bidObj => BidsList.parse(bidObj, this))
      : []
  }

  // Returns the drop interval in minutes, parsed from the HH:MM:SS time_interval string
  getIntervalMinutes() {
    if (!this.time_interval) return 10

    const parts = this.time_interval.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return 10

    const [hours, minutes] = parts
    return (hours * 60) + minutes
  }

  // Returns the drop interval in seconds, parsed from the HH:MM:SS time_interval string
  getIntervalSeconds() {
    if (!this.time_interval) return 10

    const parts = this.time_interval.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return 10

    const [hours, minutes, seconds] = parts
    return (hours * 60 * 60) + (minutes * 60) + seconds
  }

  refreshStatus() {
    this.status_color = lotColors[this.status_label]
  }

  hasBids() {
    return this.bids?.length > 0
  }

}

// object class for Bids
export class BidsList {
  static parse(data, lot) {
    return new BidsList(data, lot)
  }
  
  constructor(data, lot) {
    this.raw = data
    this.lot = lot
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(
      this, 
      '$raw', 
      { 
        enumerable: false, 
        configurable: true, 
        value: data 
      }
    )
    
    this.id = data.id != null ? Number(data.id) : null
    this.bidder = data.bidder ?? null
    this.bidder_username = data.bidder_username ?? null
    this.status = data.status ?? null
    this.bid_price_bch = Number(data.bid_price_bch ?? 0)
    this.bid_price_fiat = Number(data.bid_price_fiat ?? 0)
    this.bidding_date = data.bidding_date ?? null
  }
}

export class AppealList {
  static parse(data) {
    return new AppealList(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(
      this, 
      '$raw', 
      { 
        enumerable: false, 
        configurable: true, 
        value: data 
      }
    )

    this.id = data.id ? Number(data.id) : null

    this.bid_id = data.bid ? Number(data.bid) : null
    this.lot_id = data.lotId ? Number(data.lotId) : null
    this.auction_id = data.auctionId ? Number(data.auctionId) : null

    this.creation_date = data.creation_date ?? null
    this.timeSinceFiled = (() => {
      if (!this.creation_date) return '0s'
      
      const now = new Date()
      
      let dateStr = String(this.creation_date).trim().replace(' ', 'T')
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        dateStr += 'Z'
      }
      const past = new Date(dateStr)
      
      const seconds = Math.max(0, date.getDateDiff(now, past, 'seconds'))
      if (seconds < 60) return `${seconds}s`
      
      const minutes = date.getDateDiff(now, past, 'minutes')
      if (minutes < 60) return `${minutes}m`
      
      const hours = date.getDateDiff(now, past, 'hours')
      if (hours < 24) return `${hours}h`
      
      const days = date.getDateDiff(now, past, 'days')
      if (days < 7) return `${days}d`
      
      const weeks = Math.floor(days / 7)
      if (weeks < 4) return `${weeks}w`
      
      const months = date.getDateDiff(now, past, 'months')
      if (months < 12) return `${months}m`
      
      const years = date.getDateDiff(now, past, 'years')
      return `${years}y`
    })()
    
    this.status = data.is_resolved ? 'Resolved' : 'Pending'

    this.resolution_date = data.resolution_date || null
    this.timeSinceResolved = (() => {
      if (!this.resolution_date) return '0s'
      
      const now = new Date()
      
      let dateStr = String(this.resolution_date).trim().replace(' ', 'T')
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        dateStr += 'Z'
      }
      const past = new Date(dateStr)
      
      const seconds = Math.max(0, date.getDateDiff(now, past, 'seconds'))
      if (seconds < 60) return `${seconds}s`
      
      const minutes = date.getDateDiff(now, past, 'minutes')
      if (minutes < 60) return `${minutes}m`
      
      const hours = date.getDateDiff(now, past, 'hours')
      if (hours < 24) return `${hours}h`
      
      const days = date.getDateDiff(now, past, 'days')
      if (days < 7) return `${days}d`
      
      const weeks = Math.floor(days / 7)
      if (weeks < 4) return `${weeks}w`
      
      const months = date.getDateDiff(now, past, 'months')
      if (months < 12) return `${months}m`
      
      const years = date.getDateDiff(now, past, 'years')
      return `${years}y`
    })()

    this.reasons = Array.isArray(data.dispute_reason)
      ? data.dispute_reason.flatMap(r => r.split('').map(s => s.trim()).filter(Boolean))
      : (data.dispute_reason
          ? data.dispute_reason.split('').map(s => s.trim()).filter(Boolean)
          : [])
  }
}

export class AppealDetails {
  static parse(data) {
    return new AppealDetails(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(
      this, 
      '$raw', 
      { 
        enumerable: false, 
        configurable: true, 
        value: data 
      }
    )

    this.id = data.id ? Number(data.id) : null

    this.bid_id = data.bid ? Number(data.bid) : null
    this.lot_id = data.lotId ? Number(data.lotId) : null
    this.auction_id = data.auctionId ? Number(data.auctionId) : null

    this.creation_date = data.creation_date || null
    this.timeSinceFiled = (() => {
      if (!this.creation_date) return '0s'
      
      const now = new Date()
      
      let dateStr = String(this.creation_date).trim().replace(' ', 'T')
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        dateStr += 'Z'
      }
      const past = new Date(dateStr)
      
      const seconds = Math.max(0, date.getDateDiff(now, past, 'seconds'))
      if (seconds < 60) return `${seconds}s`
      
      const minutes = date.getDateDiff(now, past, 'minutes')
      if (minutes < 60) return `${minutes}m`
      
      const hours = date.getDateDiff(now, past, 'hours')
      if (hours < 24) return `${hours}h`
      
      const days = date.getDateDiff(now, past, 'days')
      if (days < 7) return `${days}d`
      
      const weeks = Math.floor(days / 7)
      if (weeks < 4) return `${weeks}w`
      
      const months = date.getDateDiff(now, past, 'months')
      if (months < 12) return `${months}m`
      
      const years = date.getDateDiff(now, past, 'years')
      return `${years}y`
    })()
    
    this.status = data.is_resolved ? 'Resolved' : 'Pending'

    this.resolution_date = data.resolution_date || null
    this.timeSinceResolved = (() => {
      if (!this.resolution_date) return '0s'
      
      const now = new Date()
      
      let dateStr = String(this.resolution_date).trim().replace(' ', 'T')
      if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
        dateStr += 'Z'
      }
      const past = new Date(dateStr)
      
      const seconds = Math.max(0, date.getDateDiff(now, past, 'seconds'))
      if (seconds < 60) return `${seconds}s`
      
      const minutes = date.getDateDiff(now, past, 'minutes')
      if (minutes < 60) return `${minutes}m`
      
      const hours = date.getDateDiff(now, past, 'hours')
      if (hours < 24) return `${hours}h`
      
      const days = date.getDateDiff(now, past, 'days')
      if (days < 7) return `${days}d`
      
      const weeks = Math.floor(days / 7)
      if (weeks < 4) return `${weeks}w`
      
      const months = date.getDateDiff(now, past, 'months')
      if (months < 12) return `${months}m`
      
      const years = date.getDateDiff(now, past, 'years')
      return `${years}y`
    })()

    this.reasons = Array.isArray(data.dispute_reason)
      ? data.dispute_reason.flatMap(r => r.split('').map(s => s.trim()).filter(Boolean))
      : (data.dispute_reason
          ? data.dispute_reason.split('').map(s => s.trim()).filter(Boolean)
          : [])
    
    this.auctioneer = data.auctioneer
      ? {
          user: data.auctioneer.user || null,
          username: data.auctioneer.username || null,
          address: data.auctioneer.address || null
        }
      : { user: null, username: null, address: null }

    this.bidder = data.bidder
      ? {
          user: data.bidder.user || null,
          username: data.bidder.username || null,
          address: data.bidder.address || null
        }
      : { user: null, username: null, address: null }

    this.contract_address = data.contract_address || null
    this.balance = data.bid_price_bch !== undefined ? Number(data.bid_price_bch) : 0.00000000
  }
}

export class DeliveryDetails {
  static parse(data) {
    return new DeliveryDetails(data)
  }

  constructor(data) {
    this.raw = data
  }

  get raw() {
    return this.$raw
  }

  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.tracking_id = data.tracking_id ? Number(data.tracking_id) : null
    this.lot_id = data.lotId ? Number(data.lotId) : null

    this.sender_id = data.sender !== undefined ? Number(data.sender) : null
    this.sender_location = data.sender_location !== undefined ? data.sender_location : null
    
    this.receiver_id = data.receiver !== undefined ? Number(data.receiver) : null
    this.receiver_location = data.receiver_location !== undefined ? data.receiver_location : null
    
    this.courier = data.courier !== undefined ? data.courier : null
    this.creation_date = data.creation_date || null

    this.delivery_events = data.delivery_events || []
    this.status_label = data.status || 'Preparing'
    this.status_color = deliveryColors[this.status_label]

    this.refreshStatus()
  }

  updateDeliveryEvent() {
    this.status_label = data.status || null
    this.status_color = deliveryColors[this.status_label]
    this.description = data.description || null
    this.location = data.location || null
    this.event_date = data.event_date || null
    
  }

  // Returns the drop interval in minutes, parsed from the HH:MM:SS time_interval string
  getIntervalMinutes() {
    if (!this.time_interval) return 10
    const parts = this.time_interval.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return 10
    const [hours, minutes] = parts
    return (hours * 60) + minutes
  }

  // Returns the drop interval in seconds, parsed from the HH:MM:SS time_interval string
  getIntervalSeconds() {
    if (!this.time_interval) return 10
    const parts = this.time_interval.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return 10
    const [hours, minutes, seconds] = parts
    return (hours * 60 * 60) + (minutes * 60) + seconds
  }

  refreshStatus() {
    this.status_color = deliveryColors[this.status_label]
  }
}