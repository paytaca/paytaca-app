import { date } from 'quasar'

export class LotsList {
  static parse(data) {
    return new LotsList(data)
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
   * @param {String} data.title
   * @param {String} data.description
   * @param {Number|String} data.estimated_amount_bch
   * @param {Number|String} data.estimated_amount_fiat
   * @param {Number|String} data.threshold_bid_bch
   * @param {Number|String} data.threshold_bid_fiat
   * @param {Number|String} data.starting_price_bch
   * @param {Number|String} data.starting_price_fiat
   * @param {Number|String} data.price_drop_bch
   * @param {Number|String} data.price_drop_fiat
   * @param {String} data.time_interval
   * @param {Boolean} data.is_fiat
   * @param {Boolean} data.is_sold
   * @param {String|null} data.date_sold
   * @param {Number} data.category
   * @param {String} data.auction_type
   * @param {Number} data.auction
   * @param {Array<Object|String>} data.images
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    this.id = data.id ? Number(data.id) : null;
    this.title = data.title || "Unnamed Lot";
    this.description = data.description || "";

    this.estimated_amount_bch = data.estimated_amount_bch !== undefined ? Number(data.estimated_amount_bch) : 0.00000000;
    this.estimated_amount_fiat = data.estimated_amount_fiat !== undefined ? Number(data.estimated_amount_fiat) : 0.00;
    this.threshold_bid_bch = data.threshold_bid_bch !== undefined ? Number(data.threshold_bid_bch) : 0.00000000;
    this.threshold_bid_fiat = data.threshold_bid_fiat !== undefined ? Number(data.threshold_bid_fiat) : 0.00;
    this.starting_price_bch = data.starting_price_bch !== undefined ? Number(data.starting_price_bch) : 0.00000000;
    this.starting_price_fiat = data.starting_price_fiat !== undefined ? Number(data.starting_price_fiat) : 0.00;
    this.price_drop_bch = data.price_drop_bch !== undefined ? Number(data.price_drop_bch) : 0.00000000;
    this.price_drop_fiat = data.price_drop_fiat !== undefined ? Number(data.price_drop_fiat) : 0.00;
    this.time_interval = data.time_interval || null;
    this.is_fiat = !!data.is_fiat;

    this.is_sold = !!data.is_sold;
    this.date_sold = data.date_sold || null;
    this.category = data.category || (data.category ? data.category.id : null);
    this.category_name = data.category === 1 ? 'Physical' : 'Digital';
    this.auction_type = data.auction_type || null
    this.auction = data.auction || (data.auction ? data.auction.id : null);
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    
    this.images = Array.isArray(data.images) 
      ? data.images.map(img => typeof img === 'object' ? img.image : img) 
      : [];
  }

  // Returns the drop interval in minutes, parsed from the HH:MM:SS time_interval string
  getIntervalMinutes() {
    if (!this.time_interval) return 10
    const parts = this.time_interval.split(':').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return 10
    const [hours, minutes] = parts
    return (hours * 60) + minutes
  }
  
  getFormattedBCH(bch) {
    const numStr = bch.toFixed(8);
    const match = numStr.match(/^(.*?)0*$/);
    const main = match ? match[1] : numStr;
    const zeros = numStr.substring(main.length);
    return { main, zeros, full: numStr };
  }

  getStatus() {
    if (this.is_sold) return { label: 'Sold', color: 'red' };
    
    if (!this.start_date || !this.end_date) return { label: 'Active', color: 'blue' };

    const now = new Date().getTime();
    const start = new Date(this.start_date.replace(' ', 'T')).getTime();
    const end = new Date(this.end_date.replace(' ', 'T')).getTime();

    if (now < start) return { label: 'Upcoming', color: 'orange' };
    if (now >= start && now <= end) return { label: 'Open', color: 'green' };
    
    return { label: 'Closed', color: 'red' };
  }

  getLotStatus(startDate, endDate) {
    if (this.is_sold) return { label: 'Sold', color: 'red' };
    
    if (!startDate || !endDate) return { label: 'Active', color: 'blue' };

    const now = new Date().getTime();
    const start = new Date(startDate.replace(' ', 'T')).getTime();
    const end = new Date(endDate.replace(' ', 'T')).getTime();

    if (now < start) return { label: 'Upcoming', color: 'orange' };
    if (now >= start && now <= end) return { label: 'Open', color: 'green' };
    
    return { label: 'Closed', color: 'red' };
  }
}

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

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.title
   * @param {String} data.description
   * @param {String} data.start_date
   * @param {String} data.end_date
   * @param {Boolean} data.is_open
   * @param {Boolean} data.is_fiat
   * @param {String|null} data.image
   * @param {String} data.creation_date
   * @param {Number} data.type
   * @param {Object|Number|String} data.user
   * @param {Array<Object>} data.lots
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })
    
    this.id = data.id ? Number(data.id) : null;
    this.title = data.title || "Standard Auction Event";
    this.description = data.description || "";
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.is_open = data.is_open !== undefined ? !!data.is_open : true;
    this.is_fiat = data.is_fiat !== undefined ? !!data.is_fiat : true;
    this.image = data.image || null;
    this.creation_date = data.creation_date || null;
    
    this.type = data.type || (data.type ? data.type.id : null);
    this.user = data.user && typeof data.user === 'object'
      ? {
          id: data.user.id || data.user.user || null,
          username: data.user.username || null,
          address: data.user.address || null
        }
      : { id: data.user || null, username: null, address: null };

    if(data.type == 1) this.type = "English"
    else this.type = "Dutch"
    
    this.lots = Array.isArray(data.lots)
      ? data.lots.map(lotObj => LotsList.parse(lotObj))
      : [];
  }
  
  setUserDetails(data) {
    if (!data) return
    this.user = {
      ...this.user,
      username: data.username || this.user.username,
      address: data.address || this.user.address
    }
  }

  getStatus() {
    if (!this.start_date || !this.end_date) {
      return { label: 'Closed', color: 'red' };
    }

    const formatIso = (str) => typeof str === 'string' ? str.replace(' ', 'T') : str

    const nowTime = new Date().getTime();
    const startTime = new Date(formatIso(this.start_date)).getTime()
    const endTime = new Date(formatIso(this.end_date)).getTime()
    
    if (nowTime < startTime) {
      return { label: 'Upcoming', color: 'orange' }
    }
    if (nowTime >= startTime && nowTime <= endTime) {
      return { label: 'Open', color: 'green' }
    }
    
    return { label: 'Closed', color: 'red' }
  }
  
  getEllipsisInMiddleUserId() {
    const targetString = this.user.address || String(this.user.id || '');
    
    if (!targetString || targetString.length <= 22) return targetString;
    
    const start = targetString.substring(0, 17)
    const end = targetString.substring(targetString.length - 5)
    
    return `${start}........${end}`
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

  /**
   * @param {Object} data
   * @param {Number} data.id
   * @param {String} data.status
   * @param {String} data.creation_date
   * @param {Array<String>} data.reasons
   * @param {Object} data.bid
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

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

    this.reasons = Array.isArray(data.dispute_reason)
      ? data.dispute_reason.flatMap(r => r.split(';').map(s => s.trim()).filter(Boolean))
      : (data.dispute_reason
          ? data.dispute_reason.split(';').map(s => s.trim()).filter(Boolean)
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

  /**
   * @param {Object} data
   * @param {Object} data.dispute
   * @param {Number} data.lotId
   * @param {Number} data.auctionId
   * @param {Object|null} data.auctioneer
   * @param {Object|null} data.bidder
   */
  set raw(data) {
    Object.defineProperty(this, '$raw', { enumerable: false, configurable: true, value: data })

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

    this.reasons = Array.isArray(data.dispute_reason)
      ? data.dispute_reason.flatMap(r => r.split(';').map(s => s.trim()).filter(Boolean))
      : (data.dispute_reason
          ? data.dispute_reason.split(';').map(s => s.trim()).filter(Boolean)
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
  }
}